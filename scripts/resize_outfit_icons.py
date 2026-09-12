"""Resize outfit icons in place to 50px high. Requires Pillow."""

from pathlib import Path

from PIL import Image

IMG_DIR = Path(__file__).resolve().parent.parent / "src/renderer/src/assets/outfit_icons"
TARGET_HEIGHT = 50


def run():
    resized = 0
    skipped = 0

    for path in sorted(IMG_DIR.iterdir()):
        if not path.is_file() or path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue

        with Image.open(path) as img:
            width, height = img.size
            if height == TARGET_HEIGHT:
                skipped += 1
                continue

            target_width = max(1, round(width * TARGET_HEIGHT / height))
            with img.resize((target_width, TARGET_HEIGHT), Image.Resampling.LANCZOS) as output:
                # Avoid an additional lossy encoding pass for WebP icons.
                options = {"lossless": True} if img.format == "WEBP" else {}
                output.save(path, **options)
            print(f"Resized: {path.name} ({width}x{height} -> {target_width}x{TARGET_HEIGHT})")
            resized += 1

    print(f"Done. Resized: {resized}, Skipped (already correct): {skipped}")


if __name__ == "__main__":
    run()
