import os
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
IMG_DIR = os.path.join(REPO_ROOT, "src", "renderer", "src", "assets", "character_images")


def run():
    files = [
        f for f in sorted(os.listdir(IMG_DIR))
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    ]

    cropped = 0
    skipped = 0

    for fname in files:
        path = os.path.join(IMG_DIR, fname)
        with Image.open(path) as img:
            w, h = img.size
            if w == 161:
                cropped_img = img.crop((0, 0, 160, h))
                cropped_img.save(path)
                print(f"Cropped: {fname} ({w}x{h} -> 160x{h})")
                cropped += 1
            else:
                skipped += 1

    print(f"\nDone. Cropped: {cropped}, Skipped (already correct): {skipped}")


if __name__ == "__main__":
    run()
