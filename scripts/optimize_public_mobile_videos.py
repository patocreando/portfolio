#!/usr/bin/env python3
"""Create mobile-safe copies of the portfolio's visible videos.

Original media is never modified. GitHub Pages publishes the generated files
from optimized_mobile/assets/videos during the deployment workflow.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "optimized_mobile" / "assets" / "videos"
FFMPEG = ""

TARGETS = {
    "hero-showreel-mobile-compatible.mp4": (720, 1280, 2500),
    "silo-campana-producto-recortado.mp4": (720, 1280, 2500),
    "mariana-omelette-ugc.mp4": (720, 1280, 2500),
    "ugc-beauty.mp4": (720, 1280, 2500),
    "producto_WEB.mp4": (720, 1280, 2500),
    "silo-ugc-sin-subtitulos.mp4": (720, 1280, 2500),
    "hyperreal-portrait.mp4": (720, 1280, 2500),
}


def resolve_ffmpeg() -> str:
    configured = os.environ.get("FFMPEG_BIN")
    if configured and Path(configured).is_file():
        return configured
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    try:
        import imageio_ffmpeg  # type: ignore
        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if Path(bundled).is_file():
            return bundled
    except Exception:
        pass
    raise RuntimeError("No se encontró FFmpeg ni el binario portable de imageio-ffmpeg.")


def execute(arguments: list[str], capture: bool = False) -> str:
    command = [FFMPEG, *arguments]
    result = subprocess.run(
        command,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    return result.stdout if capture else ""


def parse_duration(text: str) -> float:
    match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)", text)
    if not match:
        return 0.0
    hours, minutes, seconds = match.groups()
    return (int(hours) * 3600) + (int(minutes) * 60) + float(seconds)


def probe(path: Path) -> dict:
    # imageio-ffmpeg ships a portable FFmpeg binary but not a separate ffprobe.
    # FFmpeg's input summary exposes the codec, profile, range, dimensions and fps.
    result = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(path)],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    details = result.stderr or ""
    video_line = next((line for line in details.splitlines() if "Video:" in line), None)
    if not video_line:
        raise RuntimeError(f"No se pudo leer la pista de video de {path.name}: {details[-800:]}")

    video_part = video_line.split("Video:", 1)[1].strip()
    codec_match = re.match(r"([A-Za-z0-9_]+)", video_part)
    profile_match = re.search(r"^[A-Za-z0-9_]+\s+\(([^)]+)\)", video_part)
    pixel_match = re.search(r",\s*([A-Za-z0-9]+)\((tv|pc)(?:,|\))", video_part)
    if not pixel_match:
        pixel_match = re.search(r",\s*([A-Za-z0-9]+)(?:,|\s)", video_part)
    dimensions_match = re.search(r"\b(\d{2,5})x(\d{2,5})\b", video_part)
    fps_match = re.search(r"\b(\d+(?:\.\d+)?)\s*fps\b", video_part)
    audio_line = next((line for line in details.splitlines() if "Audio:" in line), None)
    audio_codec = None
    if audio_line:
        audio_part = audio_line.split("Audio:", 1)[1].strip()
        audio_match = re.match(r"([A-Za-z0-9_]+)", audio_part)
        audio_codec = audio_match.group(1).lower() if audio_match else None

    if not codec_match or not dimensions_match:
        raise RuntimeError(f"Resumen FFmpeg incompleto para {path.name}: {video_line}")

    pixel_format = pixel_match.group(1) if pixel_match else "unknown"
    color_range = pixel_match.group(2) if pixel_match and pixel_match.lastindex >= 2 else "unknown"
    return {
        "video": {
            "codec_name": codec_match.group(1).lower(),
            "profile": profile_match.group(1) if profile_match else "unknown",
            "pix_fmt": pixel_format,
            "color_range": color_range,
            "width": int(dimensions_match.group(1)),
            "height": int(dimensions_match.group(2)),
            "level": 31 if profile_match and "baseline" in profile_match.group(1).lower() else None,
        },
        "audio": {"codec_name": audio_codec} if audio_codec else None,
        "fps": max(1.0, min(float(fps_match.group(1)) if fps_match else 30.0, 30.0)),
        "duration": parse_duration(details),
    }


def verify_faststart(path: Path) -> None:
    # With +faststart, the moov atom must appear before the media-data atom.
    head = path.read_bytes()[:2 * 1024 * 1024]
    moov = head.find(b"moov")
    mdat = head.find(b"mdat")
    if moov < 0 or mdat < 0 or moov > mdat:
        raise RuntimeError(f"MP4 sin faststart verificable: {path.name}")


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
    # the original source. H.264 Baseline + limited-range yuv420p + AAC targets
    # older Android decoders as well as current iOS/Android browsers.
    video_filter = (
        f"scale={width}:{height}:force_original_aspect_ratio=decrease:flags=lanczos,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,"
        f"setsar=1,fps={fps:.6f},format=yuv420p,setrange=limited"
    )
    execute([
        "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
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
                "-hide_banner", "-loglevel", "error", "-y",
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
    profile = v.get("profile", "").lower()
    if (
        v.get("codec_name") != "h264"
        or "baseline" not in profile
        or v.get("pix_fmt") != "yuv420p"
        or v.get("color_range") != "tv"
        or (v.get("width"), v.get("height")) != (width, height)
    ):
        raise RuntimeError(
            f"Codificación móvil inesperada en {name}: "
            f"{v.get('codec_name')} / {v.get('profile')} / "
            f"{v.get('pix_fmt')}({v.get('color_range')}) / "
            f"{v.get('width')}x{v.get('height')}"
        )
    if encoded["audio"] and encoded["audio"].get("codec_name") != "aac":
        raise RuntimeError(f"Audio no AAC en {name}: {encoded['audio'].get('codec_name')}")

    verify_faststart(output)
    # Decode the complete output once so a corrupt transcode never gets deployed.
    execute(["-hide_banner", "-v", "error", "-i", str(output), "-f", "null", "-"])
    source_mb = source.stat().st_size / (1024 * 1024)
    output_mb = output.stat().st_size / (1024 * 1024)
    print(
        f"OK {name}: {source_mb:.2f} MB -> {output_mb:.2f} MB | "
        f"{v.get('width')}x{v.get('height')} | "
        f"H.264 {v.get('profile')} L3.1 / "
        f"{encoded['audio'].get('codec_name') if encoded['audio'] else 'sin audio'} | "
        f"{v.get('pix_fmt')}({v.get('color_range')}) | faststart | "
        f"poster {poster.stat().st_size / 1024:.0f} KB"
    )


def main() -> None:
    global FFMPEG
    FFMPEG = resolve_ffmpeg()
    print(f"FFmpeg portable: {FFMPEG}")
    execute(["-version"])
    for filename, dimensions in TARGETS.items():
        encode(filename, dimensions)
    print(f"Listo: {len(TARGETS)} videos móviles + {len(TARGETS)} posters")


if __name__ == "__main__":
    main()
