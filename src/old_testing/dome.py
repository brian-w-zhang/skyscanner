#!/usr/bin/env python3
"""
Advanced MOV to Dome Projection with Rotation Data Integration
Stabilizes video using device rotation data and extracts sky dome view
"""

import cv2
import numpy as np
import os
import sys
import json
from pathlib import Path
from typing import Optional, List, Tuple, Dict
import math

class RotationDataProcessor:
    """Handles rotation data synchronization and processing"""
    
    def __init__(self, rotation_data_path: Optional[str] = None):
        self.rotation_data = []
        self.video_fps = 30
        self.sync_offset = 0  # milliseconds
        
        if rotation_data_path:
            self.load_rotation_data(rotation_data_path)
    
    def load_rotation_data(self, path: str):
        """Load rotation data from JSON file"""
        # Expected format: [{"timestamp": ms, "alpha": rad, "beta": rad, "gamma": rad}, ...]
        # alpha = yaw (Z-axis), beta = pitch (X-axis), gamma = roll (Y-axis)
        try:
            with open(path, 'r') as f:
                raw_data = json.load(f)
            
            # Convert from alpha/beta/gamma (radians) to roll/pitch/yaw (degrees)
            self.rotation_data = []
            for entry in raw_data:
                converted_entry = {
                    "timestamp": entry["timestamp"],
                    "roll": math.degrees(entry["gamma"]),    # gamma -> roll
                    "pitch": math.degrees(entry["beta"]),    # beta -> pitch
                    "yaw": math.degrees(entry["alpha"])      # alpha -> yaw
                }
                self.rotation_data.append(converted_entry)
            
            print(f"Loaded {len(self.rotation_data)} rotation data points")
            print(f"Time range: {self.rotation_data[0]['timestamp']} to {self.rotation_data[-1]['timestamp']} ms")
        except Exception as e:
            print(f"Error loading rotation data: {e}")
    
    def get_rotation_for_frame(self, frame_number: int) -> Dict[str, float]:
        """Get rotation data for specific frame number"""
        if not self.rotation_data:
            return {"roll": 0, "pitch": 0, "yaw": 0}
        
        # Convert frame number to timestamp
        video_timestamp_ms = (frame_number / self.video_fps) * 1000
        target_timestamp = video_timestamp_ms + self.sync_offset
        
        # Find closest rotation data point
        closest_idx = 0
        min_diff = float('inf')
        
        for i, data in enumerate(self.rotation_data):
            diff = abs(data['timestamp'] - target_timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_idx = i
        
        rotation = self.rotation_data[closest_idx]
        
        # Debug output for first few frames
        if frame_number < 5:
            print(f"Frame {frame_number}: video_time={video_timestamp_ms:.1f}ms, "
                  f"target_time={target_timestamp:.1f}ms, "
                  f"matched_time={rotation['timestamp']:.1f}ms, "
                  f"diff={min_diff:.1f}ms")
            print(f"  Roll: {rotation['roll']:.1f}°, Pitch: {rotation['pitch']:.1f}°, Yaw: {rotation['yaw']:.1f}°")
        
        return rotation
    
    def auto_sync_with_video(self, video_path: str):
        """Attempt to automatically sync rotation data with video"""
        if not self.rotation_data:
            return
        
        # Calculate the time span of rotation data
        start_time = self.rotation_data[0]["timestamp"]
        end_time = self.rotation_data[-1]["timestamp"]
        duration_ms = end_time - start_time
        
        print(f"Rotation data duration: {duration_ms/1000:.1f} seconds")
        
        # For now, assume video starts at the beginning of rotation data
        # This would need refinement based on actual video start time
        self.sync_offset = -start_time  # Normalize timestamps to start at 0
        
        print(f"Applied auto-sync offset: {self.sync_offset}ms")

class AdvancedDomeConverter:
    def __init__(self, input_path: str, output_path: str, rotation_processor: Optional[RotationDataProcessor] = None):
        self.input_path = input_path
        self.output_path = output_path
        self.rotation_processor = rotation_processor
        self.dome_size = 800
        
        # Sky extraction parameters
        self.sky_roi_top = 0.3  # Top 30% of frame assumed to be sky
        self.horizon_detection_enabled = True
        
        # Stabilization parameters
        self.stabilization_enabled = True
        self.accumulated_rotation = {"roll": 0, "pitch": 0, "yaw": 0}
        
    def detect_horizon(self, frame: np.ndarray) -> int:
        """Detect horizon line in frame"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape
        
        # Use edge detection to find horizon
        edges = cv2.Canny(gray, 50, 150)
        
        # Find horizontal lines using Hough transform
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=int(width*0.3))
        
        if lines is not None:
            # Find the most horizontal line in the middle portion of the image
            best_y = height // 2
            best_score = 0
            
            for line in lines:
                rho, theta = line[0]
                # Check if line is roughly horizontal
                if abs(theta - np.pi/2) < 0.2:  # Within ~11 degrees of horizontal
                    y = rho / np.sin(theta) if np.sin(theta) != 0 else height // 2
                    if height * 0.2 < y < height * 0.8:  # In middle 60% of frame
                        score = 1.0 / (abs(theta - np.pi/2) + 0.1)  # Prefer more horizontal lines
                        if score > best_score:
                            best_score = score
                            best_y = int(y)
            
            return best_y
        
        return height // 2  # Default to middle if no horizon found
    
    def extract_sky_region(self, frame: np.ndarray, horizon_y: int) -> np.ndarray:
        """Extract sky region from frame"""
        height, width = frame.shape[:2]
        
        # Take region above horizon with some padding
        sky_top = max(0, int(horizon_y - height * 0.1))
        sky_region = frame[0:horizon_y, :]
        
        # Resize to square for dome processing
        sky_size = min(sky_region.shape[:2])
        if sky_size > 0:
            sky_square = cv2.resize(sky_region, (sky_size, sky_size))
            return sky_square
        
        # Fallback: use top portion of frame
        top_region = frame[0:int(height * self.sky_roi_top), :]
        return cv2.resize(top_region, (width, width))
    
    def apply_rotation_correction(self, frame: np.ndarray, rotation: Dict[str, float]) -> np.ndarray:
        """Apply rotation correction to stabilize the frame"""
        height, width = frame.shape[:2]
        center = (width // 2, height // 2)
        
        # Update accumulated rotation for smooth stabilization
        alpha = 0.1  # Smoothing factor
        self.accumulated_rotation["roll"] = (1 - alpha) * self.accumulated_rotation["roll"] + alpha * rotation["roll"]
        self.accumulated_rotation["pitch"] = (1 - alpha) * self.accumulated_rotation["pitch"] + alpha * rotation["pitch"]
        self.accumulated_rotation["yaw"] = (1 - alpha) * self.accumulated_rotation["yaw"] + alpha * rotation["yaw"]
        
        # Apply roll correction (rotation around z-axis)
        roll_angle = -self.accumulated_rotation["roll"]  # Negative to counter-rotate
        rotation_matrix = cv2.getRotationMatrix2D(center, roll_angle, 1.0)
        
        # Apply pitch correction (simulate tilting)
        pitch_correction = self.accumulated_rotation["pitch"] * 2  # Scale factor
        rotation_matrix[1, 2] += pitch_correction  # Vertical shift
        
        # Apply transformation
        stabilized = cv2.warpAffine(frame, rotation_matrix, (width, height), 
                                   flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        
        return stabilized
    
    def create_dome_projection(self, sky_frame: np.ndarray) -> np.ndarray:
        """Create dome projection from sky frame"""
        height, width = sky_frame.shape[:2]
        
        # Create dome coordinates
        dome_radius = self.dome_size // 2
        y_dome, x_dome = np.mgrid[0:self.dome_size, 0:self.dome_size]
        
        # Center coordinates
        x_dome = x_dome - dome_radius
        y_dome = y_dome - dome_radius
        
        # Calculate distance from center
        r = np.sqrt(x_dome**2 + y_dome**2)
        
        # Create circular mask
        mask = r <= dome_radius
        
        # Initialize output
        dome_frame = np.zeros((self.dome_size, self.dome_size, 3), dtype=np.uint8)
        
        # Map dome coordinates to sky frame
        valid_points = mask & (r > 0)
        
        if np.any(valid_points):
            # Convert to polar coordinates
            theta = np.arctan2(y_dome, x_dome)
            
            # Map radius to source coordinates (center to edge)
            normalized_r = r / dome_radius
            
            # Map to sky frame coordinates
            src_x = (width // 2) + (normalized_r * (width // 2) * np.cos(theta))
            src_y = (height // 2) + (normalized_r * (height // 2) * np.sin(theta))
            
            # Ensure coordinates are within bounds
            src_x = np.clip(src_x, 0, width - 1)
            src_y = np.clip(src_y, 0, height - 1)
            
            # Create mapping arrays
            map_x = np.zeros((self.dome_size, self.dome_size), dtype=np.float32)
            map_y = np.zeros((self.dome_size, self.dome_size), dtype=np.float32)
            
            map_x[valid_points] = src_x[valid_points]
            map_y[valid_points] = src_y[valid_points]
            
            # Apply mapping
            dome_frame = cv2.remap(sky_frame, map_x, map_y, cv2.INTER_LINEAR)
            
            # Apply circular mask
            dome_frame[~mask] = [0, 0, 0]
        
        return dome_frame
    
    def process_frame(self, frame: np.ndarray, frame_number: int) -> np.ndarray:
        """Process a single frame with full pipeline"""
        
        # Get rotation data for this frame
        rotation = {"roll": 0, "pitch": 0, "yaw": 0}
        if self.rotation_processor:
            rotation = self.rotation_processor.get_rotation_for_frame(frame_number)
        
        # Apply rotation correction for stabilization
        if self.stabilization_enabled:
            frame = self.apply_rotation_correction(frame, rotation)
        
        # Detect horizon if enabled
        horizon_y = frame.shape[0] // 2
        if self.horizon_detection_enabled:
            horizon_y = self.detect_horizon(frame)
        
        # Extract sky region
        sky_frame = self.extract_sky_region(frame, horizon_y)
        
        # Create dome projection
        dome_frame = self.create_dome_projection(sky_frame)
        
        return dome_frame
    
    def convert_video(self):
        """Convert video to dome projection with rotation data"""
        cap = cv2.VideoCapture(self.input_path)
        
        if not cap.isOpened():
            print(f"Error: Cannot open video file {self.input_path}")
            return False
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if self.rotation_processor:
            self.rotation_processor.video_fps = fps
        
        print(f"Processing {total_frames} frames at {fps} FPS")
        
        # Setup output
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(self.output_path, fourcc, fps, (self.dome_size, self.dome_size))
        
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            dome_frame = self.process_frame(frame, frame_count)
            
            # Write frame
            out.write(dome_frame)
            
            frame_count += 1
            if frame_count % 30 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"Progress: {progress:.1f}% ({frame_count}/{total_frames})")
        
        cap.release()
        out.release()
        
        print(f"Conversion complete! Output: {self.output_path}")
        return True
    
    def extract_sample_frames(self, sample_count: int = 5):
        """Extract sample frames for testing"""
        cap = cv2.VideoCapture(self.input_path)
        
        if not cap.isOpened():
            print(f"Error: Cannot open video file {self.input_path}")
            return False
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        if self.rotation_processor:
            self.rotation_processor.video_fps = fps
        
        output_dir = Path(self.output_path).parent
        base_name = Path(self.output_path).stem
        
        # Sample frames evenly distributed
        sample_frames = [int(i * total_frames / sample_count) for i in range(sample_count)]
        
        for i, frame_num in enumerate(sample_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if ret:
                # Process frame
                dome_frame = self.process_frame(frame, frame_num)
                
                # Save original and processed
                cv2.imwrite(str(output_dir / f"{base_name}_original_{i}.jpg"), frame)
                cv2.imwrite(str(output_dir / f"{base_name}_dome_{i}.jpg"), dome_frame)
                
                print(f"Saved sample {i+1}/{sample_count} (frame {frame_num})")
        
        cap.release()
        print(f"Sample frames saved in {output_dir}")
        return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python advanced_dome.py <input_video> [output_video] [rotation_data.json] [flags]")
        print("Flags:")
        print("  --sample: Extract sample frames instead of full conversion")
        print("  --no-stabilization: Disable rotation-based stabilization")
        print("  --no-horizon: Disable horizon detection")
        print("  --sync-offset=MS: Set rotation data sync offset in milliseconds")
        print("  --auto-sync: Attempt to auto-synchronize rotation data with video")
        print("Example rotation data format:")
        print('  [{"timestamp": 1752525178181, "alpha": -2.828, "beta": -0.050, "gamma": -3.107}, ...]')
        sys.exit(1)
    
    input_path = sys.argv[1]
    
    # Parse arguments
    output_path = None
    rotation_data_path = None
    sample_mode = False
    stabilization_enabled = True
    horizon_enabled = True
    sync_offset = 0
    auto_sync = False
    
    for arg in sys.argv[2:]:
        if arg == '--sample':
            sample_mode = True
        elif arg == '--no-stabilization':
            stabilization_enabled = False
        elif arg == '--no-horizon':
            horizon_enabled = False
        elif arg == '--auto-sync':
            auto_sync = True
        elif arg.startswith('--sync-offset='):
            sync_offset = int(arg.split('=')[1])
        elif arg.endswith('.json'):
            rotation_data_path = arg
        elif not output_path and not arg.startswith('--'):
            output_path = arg
    
    # Default output path
    if not output_path:
        input_name = Path(input_path).stem
        output_path = f"{input_name}_advanced_dome.mp4"
    
    # Check input file
    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} does not exist")
        sys.exit(1)
    
    # Setup rotation processor
    rotation_processor = None
    if rotation_data_path:
        if os.path.exists(rotation_data_path):
            rotation_processor = RotationDataProcessor(rotation_data_path)
            if auto_sync:
                rotation_processor.auto_sync_with_video(input_path)
            else:
                rotation_processor.sync_offset = sync_offset
        else:
            print(f"Warning: Rotation data file {rotation_data_path} not found")
    
    # Create converter
    converter = AdvancedDomeConverter(input_path, output_path, rotation_processor)
    converter.stabilization_enabled = stabilization_enabled
    converter.horizon_detection_enabled = horizon_enabled
    
    # Run conversion
    if sample_mode:
        print("Extracting sample frames with advanced processing...")
        converter.extract_sample_frames()
    else:
        print("Converting video with advanced dome projection...")
        if rotation_data_path:
            print(f"Using rotation data: {rotation_data_path}")
            print(f"Sync offset: {sync_offset}ms")
        converter.convert_video()

if __name__ == "__main__":
    main()
