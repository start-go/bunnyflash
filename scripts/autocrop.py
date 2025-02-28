from PIL import Image
import numpy as np
import os
import sys

def autocrop(image_path, output_path=None, padding=0, tolerance=0):
    """
    Crop an image by removing all extra space around the content.
    
    Parameters:
        image_path (str): Path to the input image
        output_path (str): Path to save the result (if None, creates a new filename)
        padding (int): Optional padding around the content
        tolerance (int): Color difference tolerance for background detection (0-255)
        
    Returns:
        The cropped image object
    """
    # Open the image
    img = Image.open(image_path)
    
    # Default output path if not specified
    if output_path is None:
        filename, ext = os.path.splitext(image_path)
        output_path = f"{filename}_cropped{ext}"
    
    # Convert image to numpy array for processing
    img_array = np.array(img)
    
    # Handle images with transparency (RGBA)
    if img.mode == 'RGBA':
        # Find non-transparent pixels
        alpha = img_array[:, :, 3]
        mask = alpha > 0
    else:
        # Convert to RGB if not already
        if img.mode != 'RGB':
            img = img.convert('RGB')
            img_array = np.array(img)
            
        # Sample multiple background points for more robust detection
        # Check corners and edges for potential background color
        bg_points = [
            (0, 0),  # top left
            (0, img_array.shape[0]-1),  # bottom left
            (img_array.shape[1]-1, 0),  # top right
            (img_array.shape[1]-1, img_array.shape[0]-1)  # bottom right
        ]
        
        # Find most common corner color as likely background
        corner_colors = [img_array[y, x] for x, y in bg_points]
        bg_color = max(corner_colors, key=corner_colors.count)
        
        # Create mask of non-background pixels with tolerance
        if len(img_array.shape) == 3:  # Color image
            mask = np.sum(np.abs(img_array - bg_color), axis=2) > tolerance
        else:  # Grayscale image
            mask = np.abs(img_array - bg_color) > tolerance
    
    # Find bounds of content in the mask
    coords = np.array(np.nonzero(mask))
    if coords.size == 0:
        print("No content found in image!")
        return img
    
    # Get min/max row and column indices (with padding)
    y_min, y_max = coords[0].min(), coords[0].max()
    x_min, x_max = coords[1].min(), coords[1].max()
    
    # Add padding (ensuring we don't go out of bounds)
    y_min = max(0, y_min - padding)
    y_max = min(img_array.shape[0] - 1, y_max + padding)
    x_min = max(0, x_min - padding)
    x_max = min(img_array.shape[1] - 1, x_max + padding)
    
    # Crop the image
    cropped_img = img.crop((x_min, y_min, x_max + 1, y_max + 1))
    
    # Save the result
    cropped_img.save(output_path)
    print(f"Image cropped from {img.size} to {cropped_img.size}")
    print(f"Saved to: {output_path}")
    
    return cropped_img

if __name__ == "__main__":
    # Command-line interface
    if len(sys.argv) < 2:
        print("Usage: python autocrop.py input_image [output_image] [padding] [tolerance]")
        print("Example: python autocrop.py image.png cropped.png 5 10")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    padding = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    tolerance = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    
    autocrop(input_path, output_path, padding, tolerance)