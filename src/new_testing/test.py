import cv2
import numpy as np
from lab1 import load_image, segment_sky

def main(image_path, output_path):
    # Load the image
    image = load_image(image_path)
    if image is None:
        return

    # Segment the sky
    segmented_sky, _ = segment_sky(image)

    # Save the segmented sky image
    cv2.imwrite(output_path, segmented_sky)
    print(f"Segmented sky image saved to {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python test.py <input_image_path> <output_image_path>")
    else:
        main(sys.argv[1], sys.argv[2])
