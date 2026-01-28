import cv2
import os
import shutil
import numpy as np

def add_bottom_mask(image_path, output_path, bar_height=1250, color=(118, 118, 118)):
    """
    Adds a colored mask bar at the bottom of an image.
    color is in BGR format for OpenCV.
    """
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image {image_path}")
        return

    h, w = img.shape[:2]
    
    # 767676 hex -> 118, 118, 118 RGB -> 118, 118, 118 BGR
    bgr_color = (color[2], color[1], color[0])

    # Draw the rectangle at the bottom
    start_point = (0, h - bar_height)
    end_point = (w, h)
    
    cv2.rectangle(img, start_point, end_point, bgr_color, -1)

    # Save the result
    cv2.imwrite(output_path, img)
    print(f"Masked: {os.path.basename(image_path)}")

def process_folders(base_folder, bar_height=1250):
    # Target folders are inside public/
    org_folder = os.path.join(base_folder, "org")
    mask_folder = os.path.join(base_folder, "masked")
    
    # Create directories if they don't exist
    for folder in [org_folder, mask_folder]:
        if not os.path.exists(folder):
            os.makedirs(folder)
            print(f"Created folder: {folder}")

    # Define image extensions
    extensions = ('.jpg', '.jpeg', '.png', '.JPG')
    
    # Look for files in the current public folder
    files = [f for f in os.listdir(base_folder) if f.endswith(extensions)]

    if not files:
        print(f"No original images found in {base_folder}")
        return

    print(f"Found {len(files)} images to process...")
    
    for filename in files:
        source_path = os.path.join(base_folder, filename)
        backup_path = os.path.join(org_folder, filename)
        output_path = os.path.join(mask_folder, filename)
        
        # 1. Copy image to org/
        shutil.copy2(source_path, backup_path)
        print(f"Copied to org/: {filename}")
        
        # 2. Process to masked/
        add_bottom_mask(source_path, output_path, bar_height)

if __name__ == "__main__":
    # Script is inside public/
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    
    MASK_HEIGHT = 1250
    MASK_COLOR = (118, 118, 118) # RGB #767676

    process_folders(CURRENT_DIR, MASK_HEIGHT)
    print("\nAll done!")
    print(f"Originals saved in: {os.path.join(CURRENT_DIR, 'org')}")
    print(f"Masked images saved in: {os.path.join(CURRENT_DIR, 'masked')}")
