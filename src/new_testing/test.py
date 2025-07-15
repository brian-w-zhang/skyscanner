import cv2
import numpy as np
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from lab1 import process_single_photo
from obstruction_mapper import ObstructionMapper

def create_directory(dir_path: str) -> str:
    """Create directory if it doesn't exist."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"📁 Created directory: {dir_path}")
    return dir_path

def create_masks_directory(base_dir="./"):
    """Create masks directory if it doesn't exist."""
    masks_dir = os.path.join(base_dir, "masks")
    return create_directory(masks_dir)

def load_rotation_data(rotation_json_path):
    """Load rotation data from JSON file."""
    try:
        with open(rotation_json_path, 'r') as f:
            rotation_data = json.load(f)
        print(f"📊 Loaded {len(rotation_data)} photos from {rotation_json_path}")
        
        # Print sample rotation data for verification
        if len(rotation_data) > 0:
            sample = rotation_data[0]
            print(f"📊 Sample rotation data:")
            print(f"   Alpha (yaw): {sample['alpha']:.4f} rad ({math.degrees(sample['alpha']):.2f}°)")
            print(f"   Beta (pitch): {sample['beta']:.4f} rad ({math.degrees(sample['beta']):.2f}°)")
            print(f"   Gamma (roll): {sample['gamma']:.4f} rad ({math.degrees(sample['gamma']):.2f}°)")
        
        return rotation_data
    except Exception as e:
        print(f"❌ Error loading rotation data: {e}")
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
    
    print(f"🚀 Starting parallel processing of {results['total']} photos with {max_workers} workers...")
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_photo = {
            executor.submit(process_single_photo, photo_data, photos_dir, masks_dir): photo_data
            for photo_data in rotation_data
        }
        
        # Process completed tasks
        processed = 0
        for future in as_completed(future_to_photo):
            photo_data = future_to_photo[future]
            try:
                success = future.result()
                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    
                processed += 1
                progress = (processed / results['total']) * 100
                if processed % 5 == 0 or processed == results['total']:
                    print(f"📈 Mask generation progress: {progress:.1f}% ({processed}/{results['total']})")
                
            except Exception as e:
                print(f"❌ Exception processing photo {photo_data.get('index', 'unknown')}: {e}")
                results["failed"] += 1
    
    return results

def process_dome_mapping(rotation_data, photos_dir="./photos", masks_dir="./masks", 
                        matrix_dir="./matrix", model_dir="./model", grid_resolution=1.0):
    """
    Process all photos to create dome sky mapping.
    
    Parameters:
    - rotation_data: List of photo data from rotation.json
    - photos_dir: Directory containing photos
    - masks_dir: Directory containing masks
    - matrix_dir: Directory to save matrix data
    - model_dir: Directory to save 3D models
    - grid_resolution: Grid resolution in degrees
    
    Returns:
    - ObstructionMapper instance with results
    """
    # Create output directories
    create_directory(matrix_dir)
    create_directory(model_dir)
    
    # Initialize dome mapper
    mapper = ObstructionMapper(grid_resolution_degrees=grid_resolution)
    
    print(f"\n🗺️  Starting dome sky mapping...")
    print(f"📊 Target area: 0° to 60° latitude (north pole dome)")
    print(f"📊 Grid resolution: {grid_resolution}° ({mapper.theta_steps} x {mapper.phi_steps} cells)")
    
    # Process each photo
    processed_photos = 0
    successful_photos = 0
    
    for photo_data in rotation_data:
        photo_index = photo_data.get('index', 'unknown')
        
        # Get photo path from photoUri
        photo_filename = os.path.basename(photo_data['photoUri'])
        photo_path = os.path.join(photos_dir, photo_filename)
        
        # Get corresponding mask path
        mask_filename = f"{photo_index}.jpg"
        mask_path = os.path.join(masks_dir, mask_filename)
        
        # Process this photo
        if mapper.process_photo(photo_data, photo_path, mask_path):
            successful_photos += 1
        
        processed_photos += 1
        
        # Print progress every 3 photos or at the end
        if processed_photos % 3 == 0 or processed_photos == len(rotation_data):
            progress = (processed_photos / len(rotation_data)) * 100
            print(f"🗺️  Mapping progress: {progress:.1f}% ({processed_photos}/{len(rotation_data)})")
            
            # Print current coverage statistics
            stats = mapper.get_coverage_statistics()
            print(f"   📊 Sampled: {stats['coverage_percent']:.1f}% | Sky: {stats['sky_percent']:.1f}% | Not-sky: {stats['not_sky_percent']:.1f}% | Unsampled: {stats['unsampled_percent']:.1f}%")
    
    print(f"\n✅ Dome sky mapping complete!")
    print(f"📸 Processed: {successful_photos}/{processed_photos} photos successfully")
    
    # Final statistics
    final_stats = mapper.get_coverage_statistics()
    print(f"\n📊 FINAL DOME STATISTICS:")
    print(f"   🎯 Total dome cells: {final_stats['total_cells']:,}")
    print(f"   ✅ Sampled cells: {final_stats['sampled_cells']:,} ({final_stats['coverage_percent']:.1f}%)")
    print(f"   🌌 Sky cells: {final_stats['sky_cells']:,} ({final_stats['sky_percent']:.1f}% of sampled)")
    print(f"   🚫 Not-sky cells: {final_stats['not_sky_cells']:,} ({final_stats['not_sky_percent']:.1f}% of sampled)")
    print(f"   ❓ Unsampled cells: {final_stats['unsampled_cells']:,} ({final_stats['unsampled_percent']:.1f}%)")
    
    # Save outputs
    print(f"\n💾 Saving outputs...")
    map_path = mapper.save_obstruction_map(matrix_dir)
    model_path = mapper.generate_3d_model(model_dir)
    texture_path = mapper.create_data_texture(matrix_dir)
    
    print(f"✅ All dome outputs saved successfully!")
    
    return mapper

def main(rotation_json_path):
    """Main function to process all photos from rotation.json"""
    
    print(f"🎯 Starting sky dome mapping (0° to 60° latitude)...")
    print(f"📄 Input file: {rotation_json_path}")
    
    # Load rotation data
    rotation_data = load_rotation_data(rotation_json_path)
    if rotation_data is None:
        return
    
    # Create output directories
    masks_dir = create_masks_directory()
    matrix_dir = create_directory("./matrix")
    model_dir = create_directory("./model")
    
    # Set up directories
    photos_dir = "./photos"
    
    # Check if photos directory exists
    if not os.path.exists(photos_dir):
        print(f"❌ Error: Photos directory not found: {photos_dir}")
        return
    
    # Step 1: Process all photos to generate masks
    print(f"\n🎭 STEP 1: Generating sky masks...")
    results = process_all_photos_parallel(rotation_data, photos_dir, masks_dir)
    
    # Print mask generation results
    print(f"\n📊 MASK GENERATION RESULTS:")
    print(f"   📸 Total photos: {results['total']}")
    print(f"   ✅ Successfully processed: {results['success']}")
    print(f"   ❌ Failed: {results['failed']}")
    print(f"   📈 Success rate: {(results['success']/results['total']*100):.1f}%")
    print(f"   💾 Masks saved in: {masks_dir}")
    
    if results['success'] == 0:
        print(f"❌ No masks were generated successfully. Cannot proceed with dome mapping.")
        return
    
    # Step 2: Create dome mapping
    print(f"\n🗺️  STEP 2: Creating dome sky mapping...")
    mapper = process_dome_mapping(
        rotation_data, 
        photos_dir, 
        masks_dir, 
        matrix_dir, 
        model_dir,
        grid_resolution=1.0  # 1 degree resolution
    )
    
    print(f"\n🎉 ALL PROCESSING COMPLETE!")
    print(f"📁 Check the following directories for outputs:")
    print(f"   🎭 Sky masks: {masks_dir}")
    print(f"   🗺️  Dome data: {matrix_dir}")
    print(f"   🎨 3D models: {model_dir}")
    print(f"\n🔵 Data texture: Blue = Sky, 🔴 Red = Not-sky/Obstruction")

if __name__ == "__main__":
    import math  # Add this import
    
    if len(sys.argv) != 2:
        print("Usage: python test.py rotation.json")
        sys.exit(1)
    
    rotation_json_path = sys.argv[1]
    
    # Check if rotation.json exists
    if not os.path.exists(rotation_json_path):
        print(f"❌ Error: Rotation JSON file not found: {rotation_json_path}")
        sys.exit(1)
    
    main(rotation_json_path)
