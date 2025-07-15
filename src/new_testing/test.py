# filepath: /Users/junzhang/Projects/starlink/src/new_testing/test.py
import cv2
import numpy as np
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from lab1 import process_single_photo

def create_masks_directory(base_dir="./"):
    """Create masks directory if it doesn't exist."""
    masks_dir = os.path.join(base_dir, "masks")
    if not os.path.exists(masks_dir):
        os.makedirs(masks_dir)
        print(f"Created masks directory: {masks_dir}")
    return masks_dir

def load_rotation_data(rotation_json_path):
    """Load rotation data from JSON file."""
    try:
        with open(rotation_json_path, 'r') as f:
            rotation_data = json.load(f)
        print(f"Loaded {len(rotation_data)} photos from {rotation_json_path}")
        return rotation_data
    except Exception as e:
        print(f"Error loading rotation data: {e}")
        return None

def process_all_photos_parallel(rotation_data, photos_dir="./photos", masks_dir="./masks", max_workers=4):
    """
    Process all photos in parallel to generate masks.
    
    Parameters:
    - rotation_data: List of photo data from rotation.json
    - photos_dir: Directory containing photos
    - masks_dir: Directory to save masks
    - max_workers: Maximum number of parallel workers
    
    Returns:
    - results: Dictionary with success/failure counts
    """
    results = {"success": 0, "failed": 0, "total": len(rotation_data)}
    
    print(f"Starting parallel processing of {results['total']} photos with {max_workers} workers...")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_photo = {
            executor.submit(process_single_photo, photo_data, photos_dir, masks_dir): photo_data
            for photo_data in rotation_data
        }
        
        # Process completed tasks
        for future in as_completed(future_to_photo):
            photo_data = future_to_photo[future]
            try:
                success = future.result()
                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                print(f"Exception processing photo {photo_data.get('index', 'unknown')}: {e}")
                results["failed"] += 1
    
    return results

def main(rotation_json_path):
    """Main function to process all photos from rotation.json"""
    
    # Load rotation data
    rotation_data = load_rotation_data(rotation_json_path)
    if rotation_data is None:
        return
    
    # Create masks directory
    masks_dir = create_masks_directory()
    
    # Set up directories
    photos_dir = "./photos"
    
    # Check if photos directory exists
    if not os.path.exists(photos_dir):
        print(f"Error: Photos directory not found: {photos_dir}")
        return
    
    # Process all photos in parallel
    results = process_all_photos_parallel(rotation_data, photos_dir, masks_dir)
    
    # Print results
    print(f"\n{'='*50}")
    print(f"Processing complete!")
    print(f"Total photos: {results['total']}")
    print(f"Successfully processed: {results['success']}")
    print(f"Failed: {results['failed']}")
    print(f"Success rate: {(results['success']/results['total']*100):.1f}%")
    print(f"Masks saved in: {masks_dir}")
    print(f"{'='*50}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test.py rotation.json")
        sys.exit(1)
    
    rotation_json_path = sys.argv[1]
    
    # Check if rotation.json exists
    if not os.path.exists(rotation_json_path):
        print(f"Error: Rotation JSON file not found: {rotation_json_path}")
        sys.exit(1)
    
    main(rotation_json_path)
