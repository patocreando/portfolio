#!/usr/bin/env python3
"""Create mobile-safe copies of the portfolio's visible videos.

Original media is never modified. GitHub Pages publishes the generated files
from optimized_mobile/assets/videos during the deployment workflow.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "optimized_mobile" / "assets" / "videos"

TARGETS = {
    "hero-showreel-mobile-compatible.mp4": (720, 1280, 2500),
    "silo-campana-producto-recortado.mp4": (720, 1280, 2500),
    "mariana-omelette-ugc.mp4": (720, 1280, 2500),
    "ugc-beauty.mp4": (720, 1280, 2500),
    "producto_WEB.mp4": (720, 1280, 2500),
    "silo-ugc-sin-subtitulos.mp4": (720, 1280, 2500),
    "hyperreal-portrait.mp4": (720, 1280, 2500),
}


def execute(command: list[str], capture: bool = False) -> str:
    result = subprocess.run(
        command,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    return result.stdout if capture else ""


def probe(path: Path) -> dict:
    output = execute(
        ["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        capture=True,
    )
    data = json.loads(output)
    streams = data.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not video:
        raise RuntimeError(f"No se encontró pista de video: {path.name}")
    audio = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    rate = video.get("avg_frame_rate") or video.get("r_frame_rate") or "30/1"
    try:
        fps = float(Fraction(rate))
    except (ValueError, ZeroDivisionError):
        fps = 30.0
    duration = float(data.get("format", {}).get("duration") or 0)
    return {
        "video": video,
        "audio": audio,
        "fps": max(1.0, min(fps or 30.0, 30.0)),
        "duration": duration,
    }


def encode(name: str, dimensions: tuple[int, int, int]) -> None:
    source = ROOT / "assets" / "videos" / name
    if not source.is_file():
        raise FileNotFoundError(f"Falta el video fuente: {source}")

    width, height, maxrate = dimensions
    info = probe(source)
    fps = info["fps"]
    output = OUTPUT / name
    poster = OUTPUT / (Path(name).stem + ".webp")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # Fit within the vertical delivery frame without stretching or changing
    # the original source. yuv420p + H.264 Main + AAC is broadly supported.
    video_filter = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"setsar=1,fps={fps:.6f},format=yuv420p,setrange=limited"
    )
    execute([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", video_filter,
        "-c:v", "libx264", "-profile:v", "baseline", "-level:v", "3.1",
        "-pix_fmt", "yuv420p", "-color_range", "tv", "-r", f"{fps:.6f}",
        "-crf", "25", "-maxrate", f"{maxrate}k", "-bufsize", f"{maxrate * 2}k",
        "-preset", "medium", "-g", "60", "-keyint_min", "30", "-sc_threshold", "0",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", "-sn", "-dn", str(output),
    ])

    # A real frame poster remains visible even when a mobile browser blocks
    # muted autoplay or needs a user tap to begin playback.
    poster_created = False
    timestamps = [0.25, 0.6, 1.0, 1.5]
    if info["duration"] > 0:
        timestamps = [min(value, max(0, info["duration"] - 0.05)) for value in timestamps]
    for timestamp in timestamps:
        try:
            execute([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-ss", f"{timestamp:.2f}", "-i", str(output),
                "-frames:v", "1", "-vf", "scale=480:-2:flags=lanczos",
                "-c:v", "libwebp", "-quality", "82", "-compression_level", "6",
                str(poster),
            ])
            if poster.is_file() and poster.stat().st_size > 0:
                poster_created = True
                break
        except subprocess.CalledProcessError:
            if poster.exists():
                poster.unlink()
    if not poster_created:
        raise RuntimeError(f"No se pudo crear el poster: {poster.name}")

    encoded = probe(output)
    v = encoded["video"]
    if v.get("codec_name") != "h264" or v.get("profile") not in {"Baseline", "Constrained Baseline"} or v.get("pix_fmt") != "yuv420p" or v.get("level") != 31 or v.get("color_range") == "pc":
        raise RuntimeError(f"Codificación móvil inesperada en {name}: {v.get('codec_name')} / {v.get('pix_fmt')}")
    if encoded["audio"] and encoded["audio"].get("codec_name") != "aac":
        raise RuntimeError(f"Audio no AAC en {name}")

    # Decode the complete output once so a corrupt transcode never gets deployed.
    execute(["ffmpeg", "-hide_banner", "-v", "error", "-i", str(output), "-f", "null", "-"])
    source_mb = source.stat().st_size / (1024 * 1024)
    output_mb = output.stat().st_size / (1024 * 1024)
    print(
        f"OK {name}: {source_mb:.2f} MB -> {output_mb:.2f} MB | "
        f"{v.get('width')}x{v.get('height')} | H.264 {v.get('profile')} L{v.get('level')} / "
        f"{encoded['audio'].get('codec_name') if encoded['audio'] else 'sin audio'} | "
        f"{v.get('pix_fmt')} | faststart | poster {poster.stat().st_size / 1024:.0f} KB"
    )


def main() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if not shutil.which(tool)]
    if missing:
        raise SystemExit("Faltan herramientas FFmpeg: " + ", ".join(missing))
    for filename, dimensions in TARGETS.items():
        encode(filename, dimensions)
    print(f"Listo: {len(TARGETS)} videos móviles + {len(TARGETS)} posters")


if __name__ == "__main__":
    main()
