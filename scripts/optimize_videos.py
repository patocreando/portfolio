#!/usr/bin/env python3
"""Build mobile-friendly H.264 MP4s and first-frame WebP posters without touching originals.

Usage (Windows):
    py -3 scripts/optimize_videos.py
    py -3 scripts/optimize_videos.py --probe-only
    py -3 scripts/optimize_videos.py --output-dir optimized_mobile --fit auto

Requires ffmpeg and ffprobe on PATH. Original files are never overwritten.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path
from typing import Any

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".ogv", ".avi", ".mpeg", ".mpg"}
SKIP_DIRS = {".git", "node_modules", "optimized_mobile", "dist", "build", "__pycache__"}


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            text=True,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"No se encontró el ejecutable: {command[0]}. Instalá FFmpeg y agregalo al PATH.") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        raise RuntimeError(detail[-2500:]) from exc


def parse_rate(value: str | None) -> float:
    if not value or value in {"0/0", "N/A"}:
        return 0.0
    try:
        rate = float(Fraction(value))
        return rate if math.isfinite(rate) and rate > 0 else 0.0
    except (ValueError, ZeroDivisionError):
        return 0.0


def probe(path: Path, ffprobe: str) -> dict[str, Any]:
    completed = run(
        [
            ffprobe, "-v", "error", "-show_format", "-show_streams",
            "-of", "json", str(path),
        ],
        capture=True,
    )
    data = json.loads(completed.stdout or "{}")
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    audio = next((s for s in streams if s.get("codec_type") == "audio"), {})
    fps = parse_rate(video.get("avg_frame_rate")) or parse_rate(video.get("r_frame_rate"))
    pix_fmt = video.get("pix_fmt", "N/D")
    bit_depth = video.get("bits_per_raw_sample") or (
        "10-bit+" if any(tag in pix_fmt for tag in ("10", "12", "16")) else "8-bit/unknown"
    )
    return {
        "path": str(path),
        "size_mb": round(path.stat().st_size / (1024 * 1024), 2),
        "duration_s": round(float(data.get("format", {}).get("duration", 0) or 0), 3),
        "width": video.get("width"),
        "height": video.get("height"),
        "fps": round(fps, 3) if fps else None,
        "video_codec": video.get("codec_name", "N/D"),
        "video_profile": video.get("profile", "N/D"),
        "video_level": video.get("level"),
        "pixel_format": pix_fmt,
        "bit_depth": bit_depth,
        "audio_codec": audio.get("codec_name", "sin audio"),
        "audio_sample_rate": audio.get("sample_rate"),
        "audio_channels": audio.get("channels"),
        "container": data.get("format", {}).get("format_name", "N/D"),
    }


def discover_videos(root: Path, output_dir: Path) -> list[Path]:
    output_resolved = output_dir.resolve()
    found: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in VIDEO_EXTENSIONS:
            continue
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        if any(part in SKIP_DIRS for part in relative.parts):
            continue
        try:
            path.resolve().relative_to(output_resolved)
            continue
        except ValueError:
            pass
        found.append(path)
    return sorted(found)


def output_dimensions(source: Path, args: argparse.Namespace) -> tuple[int, int]:
    if args.hero_size and "hero" in source.stem.lower():
        return tuple(int(part) for part in args.hero_size.lower().split("x", 1))
    return tuple(int(part) for part in args.card_size.lower().split("x", 1))


def build_filter(meta: dict[str, Any], width: int, height: int, fit_mode: str, fps: float) -> str:
    source_width = int(meta.get("width") or width)
    source_height = int(meta.get("height") or height)
    source_ratio = source_width / max(source_height, 1)
    target_ratio = width / height

    selected_fit = fit_mode
    if fit_mode == "auto":
        selected_fit = "crop" if abs(source_ratio - target_ratio) <= 0.10 else "contain"

    if selected_fit == "contain":
        fit = (
            f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
        )
    else:
        fit = (
            f"scale={width}:{height}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop={width}:{height}"
        )
    return f"{fit},setsar=1,fps={fps:.6f},format=yuv420p"


def encode_video(
    source: Path,
    destination: Path,
    poster: Path,
    meta: dict[str, Any],
    args: argparse.Namespace,
    ffmpeg: str,
) -> None:
    width, height = output_dimensions(source, args)
    source_fps = float(meta.get("fps") or 30.0)
    target_fps = min(source_fps, float(args.max_fps))
    target_fps = max(target_fps, 1.0)
    vf = build_filter(meta, width, height, args.fit, target_fps)

    destination.parent.mkdir(parents=True, exist_ok=True)
    poster.parent.mkdir(parents=True, exist_ok=True)

    command = [
        ffmpeg, "-hide_banner", "-y", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?",
        "-vf", vf,
        "-c:v", "libx264", "-profile:v", "main", "-level:v", "4.0",
        "-pix_fmt", "yuv420p", "-r", f"{target_fps:.6f}",
        "-crf", str(args.crf), "-maxrate", args.maxrate, "-bufsize", args.bufsize,
        "-preset", args.preset,
        "-c:a", "aac", "-ar", "48000", "-b:a", "128k", "-ac", "2",
        "-movflags", "+faststart",
        str(destination),
    ]
    run(command)

    # Retry slightly later timestamps if the container's first frame is corrupt or undecodable.
    poster_created = False
    for timestamp in (0.0, 0.05, 0.15, 0.35, 0.75, 1.25):
        poster_command = [
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{timestamp:.2f}", "-i", str(destination),
            "-frames:v", "1", "-vf", "scale=480:-2:flags=lanczos",
            "-c:v", "libwebp", "-quality", "80", "-compression_level", "6",
            str(poster),
        ]
        try:
            run(poster_command, capture=True)
            if poster.exists() and poster.stat().st_size > 0:
                poster_created = True
                break
        except RuntimeError:
            if poster.exists():
                poster.unlink()
    if not poster_created:
        raise RuntimeError(f"No se pudo generar el poster WebP para {destination.name}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimiza videos para reproducción móvil sin sobrescribir originales.")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Raíz del repositorio.")
    parser.add_argument("--output-dir", type=Path, default=None, help="Directorio de salida (por defecto: optimized_mobile).")
    parser.add_argument("--card-size", default="720x1280", help="Resolución vertical de tarjetas (720x1280).")
    parser.add_argument("--hero-size", default="1080x1920", help="Resolución para archivos cuyo nombre contiene 'hero'.")
    parser.add_argument("--max-fps", type=float, default=30.0, help="FPS máximos.")
    parser.add_argument("--crf", type=int, default=24, help="Calidad H.264 (CRF).")
    parser.add_argument("--maxrate", default="2500k", help="Bitrate máximo.")
    parser.add_argument("--bufsize", default="5000k", help="Buffer de bitrate.")
    parser.add_argument("--preset", default="medium", choices=("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow"), help="Preset H.264.")
    parser.add_argument("--fit", default="auto", choices=("auto", "crop", "contain"), help="Encuadre: auto conserva horizontales con bandas y recorta verticales.")
    parser.add_argument("--probe-only", action="store_true", help="Genera solo el diagnóstico FFprobe, sin transcodificar.")
    parser.add_argument("--force", action="store_true", help="Reprocesa archivos de salida existentes.")
    args = parser.parse_args()

    root = args.root.resolve()
    if not root.is_dir():
        print(f"ERROR: no existe la raíz del repositorio: {root}", file=sys.stderr)
        return 2
    output_dir = (args.output_dir or (root / "optimized_mobile")).resolve()
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffprobe or (not args.probe_only and not ffmpeg):
        print("ERROR: se requieren ffprobe y ffmpeg instalados y disponibles en PATH.", file=sys.stderr)
        return 2

    videos = discover_videos(root, output_dir)
    if not videos:
        print("No se encontraron archivos de video compatibles.")
        return 0

    report: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    print(f"Videos encontrados: {len(videos)}")
    for index, source in enumerate(videos, start=1):
        try:
            meta = probe(source, ffprobe)
            report.append(meta)
            relative = source.relative_to(root)
            destination = output_dir / relative.with_suffix(".mp4")
            poster = destination.with_suffix(".webp")

            if not args.probe_only:
                if args.force or not (destination.exists() and poster.exists()):
                    encode_video(source, destination, poster, meta, args, ffmpeg or "ffmpeg")
                meta["output_video"] = str(destination.relative_to(output_dir))
                meta["output_poster"] = str(poster.relative_to(output_dir))
            print(
                f"[{index:02}/{len(videos):02}] {relative} | "
                f"{meta['size_mb']} MB | {meta.get('width')}x{meta.get('height')} | "
                f"{meta.get('fps') or 'N/D'} fps | "
                f"{meta['video_codec']} / {meta['audio_codec']} | {meta['pixel_format']}"
            )
        except Exception as exc:
            failures.append({"path": str(source.relative_to(root)), "error": str(exc)})
            print(f"ERROR {source}: {exc}", file=sys.stderr)

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "video-report.json"
    report_path.write_text(
        json.dumps({"videos": report, "failures": failures}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nInforme: {report_path}")
    if failures:
        print(f"Archivos con errores: {len(failures)}")
        return 1
    if args.probe_only:
        print("Diagnóstico FFprobe terminado; no se modificó ningún original.")
    else:
        print("Optimización terminada. Los originales permanecen intactos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
