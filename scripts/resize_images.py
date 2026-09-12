"""Run both image processing scripts concurrently using the current Python interpreter."""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS = ("resize_character_images.py", "resize_outfit_icons.py")


def run_script(name):
    result = subprocess.run([sys.executable, str(SCRIPT_DIR / name)], check=False)
    if result.returncode:
        print(f"Failed: {name} (exit code {result.returncode})", file=sys.stderr)
    return result.returncode


def run():
    with ThreadPoolExecutor(max_workers=len(SCRIPTS)) as executor:
        results = list(executor.map(run_script, SCRIPTS))
    return 1 if any(results) else 0


if __name__ == "__main__":
    sys.exit(run())
