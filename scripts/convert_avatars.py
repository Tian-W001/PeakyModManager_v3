import os
import subprocess
import sys
from PIL import Image

# Define paths relative to the repository root
# Assuming the script is located in /scripts/ inside the repo
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DDS_FOLDER = os.path.join(REPO_ROOT, "src", "renderer", "src", "assets", "avatars", "character_avatars")
TEXCONV = os.path.join(REPO_ROOT, "texconv.exe")

def nice_name(dds_name: str) -> str:
    base = os.path.splitext(dds_name)[0]

    if base.endswith("_r"):
        base = base[:-2]

    if len(base) > 0:
        base = base[0].upper() + base[1:]

    return base + ".png"

def convert_dds_to_png(input_path, output_path):
    # texconv outputs to the same directory as input by default or specified -o
    cmd = [
        TEXCONV,
        "-ft", "png",
        "-y", # overwrite
        "-o", os.path.dirname(output_path),
        input_path
    ]
    print(f"Running texconv for {os.path.basename(input_path)}...")
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # texconv produces [filename].png. We might need to rename it if nice_name is different
    # e.g. input: name_r.dds -> texconv -> name_r.png
    # target: Name.png
    
    original_base = os.path.splitext(os.path.basename(input_path))[0]
    produced_png = os.path.join(os.path.dirname(output_path), original_base + ".png")

    # Case-insensitive comparison for Windows file systems, but explicit rename is safer
    if produced_png != output_path:
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(produced_png, output_path)

def rotate_png(path):
    try:
        img = Image.open(path)
        # Rotate 180 degrees
        rotated = img.rotate(180)
        rotated.save(path)
        img.close()
    except Exception as e:
        print(f"Error rotating {path}: {e}")
        raise

def run():
    if not os.path.isfile(TEXCONV):
        print(f"Error: texconv.exe not found at {TEXCONV}")
        sys.exit(1)
        
    if not os.path.exists(DDS_FOLDER):
        print(f"Error: DDS folder not found at {DDS_FOLDER}")
        sys.exit(1)

    files = [f for f in os.listdir(DDS_FOLDER) if f.lower().endswith(".dds")]
    
    if not files:
        print("No .dds files found.")
        return

    for file in files:
        input_path = os.path.join(DDS_FOLDER, file)
        output_path = os.path.join(DDS_FOLDER, nice_name(file))

        print(f"Processing {file} -> {os.path.basename(output_path)}")

        try:
            convert_dds_to_png(input_path, output_path)
            rotate_png(output_path)
            
            # Remove original dds
            os.remove(input_path)
            print("Done")
        except subprocess.CalledProcessError as e:
            print(f"Failed to convert {file}. Texconv error: {e.stderr.decode('utf-8') if e.stderr else 'Unknown'}")
        except Exception as e:
            print(f"An error occurred with {file}: {e}")

if __name__ == "__main__":
    run()
