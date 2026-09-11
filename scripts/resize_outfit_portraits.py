"""Resize outfit portraits in place to 300px high using Pillow (pip install Pillow).

Run with --check to inspect images without modifying them. Smaller images are
never enlarged; filenames, image formats, and transparency are preserved.
"""

import argparse
import os
from pathlib import Path
import tempfile

from PIL import Image


IMAGE_DIR = Path(__file__).resolve().parent.parent / "src/renderer/src/assets/outfit_portraits"
TARGET_HEIGHT = 300
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def resize_portrait(image_path: Path, check: bool) -> bool:
    """Validate one image and return whether it needs resizing."""
    temporary_path = None
    try:
        with Image.open(image_path) as image:
            image.load()
            if getattr(image, "n_frames", 1) != 1:
                raise ValueError("Animated images are not supported")
            width, height = image.size
            if height <= TARGET_HEIGHT:
                return False
            new_width = max(1, round(width * TARGET_HEIGHT / height))
            print(f"{'Would resize' if check else 'Resize'}: {image_path.name} "
                  f"({width}x{height} -> {new_width}x{TARGET_HEIGHT})")
            if check:
                return True
            # RGBA also ensures palette transparency survives bicubic resampling.
            mode = "RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB"
            with image.convert(mode) as source:
                with source.resize((new_width, TARGET_HEIGHT), Image.Resampling.BICUBIC) as resized:
                    options = {"lossless": True} if image.format == "WEBP" else {}
                    if image.info.get("icc_profile"):
                        options["icc_profile"] = image.info["icc_profile"]
                    with tempfile.NamedTemporaryFile(dir=image_path.parent, suffix=".tmp", delete=False) as temp:
                        temporary_path = Path(temp.name)
                    resized.save(temporary_path, format=image.format, **options)
        # Replace only after encoding succeeds and the input file is closed.
        os.replace(temporary_path, image_path)
        return True
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def run() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Inspect images without writing changes")
    args = parser.parse_args()
    if not IMAGE_DIR.is_dir():
        print(f"Missing directory: {IMAGE_DIR}")
        return 1
    changed = skipped = errors = 0
    for image_path in sorted(IMAGE_DIR.iterdir()):
        if not image_path.is_file() or image_path.suffix.lower() not in EXTENSIONS:
            continue
        try:
            if resize_portrait(image_path, args.check):
                changed += 1
            else:
                skipped += 1
        except (OSError, ValueError, Image.DecompressionBombError) as error:
            print(f"Error: {image_path.name}: {error}")
            errors += 1
    print(f"{'Need resizing' if args.check else 'Resized'}: {changed}; "
          f"Skipped (height <= {TARGET_HEIGHT}): {skipped}; Errors: {errors}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(run())
