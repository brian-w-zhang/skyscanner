import cv2
import numpy as np
import json
import math
import argparse
from typing import List, Dict, Tuple, Optional

class SkyDomeStitcher:
    def __init__(self, dome_size: int = 2000, fov_degrees: float = 60.0):
        """
        Initialize the sky dome stitcher.
        
        Args:
            dome_size: Size of the output dome image (diameter in pixels)
            fov_degrees: Field of view of the camera in degrees
        """
        self.dome_size = dome_size
        self.dome_radius = dome_size // 2
        self.fov_radians = math.radians(fov_degrees)
        
        # Create empty dome canvas
        self.dome_canvas = np.zeros((dome_size, dome_size, 3), dtype=np.uint8)
        self.dome_weights = np.zeros((dome_size, dome_size), dtype=np.float32)
        
        # Center of the dome
        self.center_x = dome_size // 2
        self.center_y = dome_size // 2
        
    def euler_to_rotation_matrix(self, alpha: float, beta: float, gamma: float) -> np.ndarray:
        """
        Convert Euler angles to rotation matrix.
        
        Args:
            alpha: Rotation around Z-axis (yaw) in radians
            beta: Rotation around X-axis (pitch) in radians  
            gamma: Rotation around Y-axis (roll) in radians
            
        Returns:
            3x3 rotation matrix
        """
        # Rotation matrices for each axis
        Rx = np.array([
            [1, 0, 0],
            [0, math.cos(beta), -math.sin(beta)],
            [0, math.sin(beta), math.cos(beta)]
        ])
        
        Ry = np.array([
            [math.cos(gamma), 0, math.sin(gamma)],
            [0, 1, 0],
            [-math.sin(gamma), 0, math.cos(gamma)]
        ])
        
        Rz = np.array([
            [math.cos(alpha), -math.sin(alpha), 0],
            [math.sin(alpha), math.cos(alpha), 0],
            [0, 0, 1]
        ])
        
        # Combined rotation matrix
        R = Rz @ Ry @ Rx
        return R
    
    def project_frame_to_dome(self, frame: np.ndarray, rotation_matrix: np.ndarray) -> None:
        """
        Project a camera frame onto the dome using the rotation matrix.
        
        Args:
            frame: Input camera frame
            rotation_matrix: 3x3 rotation matrix for the camera orientation
        """
        frame_height, frame_width = frame.shape[:2]
        
        # Camera intrinsic parameters (approximate)
        focal_length = frame_width / (2 * math.tan(self.fov_radians / 2))
        cx, cy = frame_width / 2, frame_height / 2
        
        # For each pixel in the dome
        for dome_y in range(self.dome_size):
            for dome_x in range(self.dome_size):
                # Convert dome coordinates to spherical coordinates
                dx = dome_x - self.center_x
                dy = dome_y - self.center_y
                distance = math.sqrt(dx*dx + dy*dy)
                
                # Skip pixels outside the dome
                if distance > self.dome_radius:
                    continue
                
                # Convert to spherical coordinates
                # Map dome radius to hemisphere (0 to pi/2)
                theta = (distance / self.dome_radius) * (math.pi / 2)
                phi = math.atan2(dy, dx)
                
                # Convert spherical to 3D unit vector
                x = math.sin(theta) * math.cos(phi)
                y = math.sin(theta) * math.sin(phi)
                z = math.cos(theta)
                
                # Apply inverse rotation to get camera space direction
                camera_dir = rotation_matrix.T @ np.array([x, y, z])
                
                # Project to camera image plane
                if camera_dir[2] <= 0:  # Behind camera
                    continue
                
                # Perspective projection
                u = focal_length * camera_dir[0] / camera_dir[2] + cx
                v = focal_length * camera_dir[1] / camera_dir[2] + cy
                
                # Check if projection is within frame bounds
                if 0 <= u < frame_width and 0 <= v < frame_height:
                    # Bilinear interpolation
                    u_int, v_int = int(u), int(v)
                    u_frac, v_frac = u - u_int, v - v_int
                    
                    if u_int + 1 < frame_width and v_int + 1 < frame_height:
                        # Get four neighboring pixels
                        pixel_00 = frame[v_int, u_int]
                        pixel_10 = frame[v_int, u_int + 1]
                        pixel_01 = frame[v_int + 1, u_int]
                        pixel_11 = frame[v_int + 1, u_int + 1]
                        
                        # Bilinear interpolation
                        interpolated = (
                            pixel_00 * (1 - u_frac) * (1 - v_frac) +
                            pixel_10 * u_frac * (1 - v_frac) +
                            pixel_01 * (1 - u_frac) * v_frac +
                            pixel_11 * u_frac * v_frac
                        )
                        
                        # Weight based on distance from center (optional)
                        weight = 1.0 / (1.0 + distance / self.dome_radius)
                        
                        # Blend with existing pixel
                        current_weight = self.dome_weights[dome_y, dome_x]
                        total_weight = current_weight + weight
                        
                        if total_weight > 0:
                            self.dome_canvas[dome_y, dome_x] = (
                                (self.dome_canvas[dome_y, dome_x] * current_weight + 
                                 interpolated * weight) / total_weight
                            ).astype(np.uint8)
                            self.dome_weights[dome_y, dome_x] = total_weight
    
    def find_closest_frame(self, target_timestamp: int, rotation_data: List[Dict]) -> Optional[Dict]:
        """
        Find the rotation data entry closest to the target timestamp.
        
        Args:
            target_timestamp: Target timestamp in milliseconds
            rotation_data: List of rotation data entries
            
        Returns:
            Closest rotation data entry or None if not found
        """
        if not rotation_data:
            return None
            
        min_diff = float('inf')
        closest_entry = None
        
        for entry in rotation_data:
            diff = abs(entry['timestamp'] - target_timestamp)
            if diff < min_diff:
                min_diff = diff
                closest_entry = entry
                
        return closest_entry
    
    def create_dome_panorama(self, video_path: str, rotation_data_path: str, 
                           output_path: str = "sky_dome.jpg", 
                           frame_skip: int = 30) -> None:
        """
        Create a dome panorama from video and rotation data.
        
        Args:
            video_path: Path to input video file
            rotation_data_path: Path to JSON file with rotation data
            output_path: Path for output dome image
            frame_skip: Process every Nth frame (to speed up processing)
        """
        # Load rotation data
        with open(rotation_data_path, 'r') as f:
            rotation_data = json.load(f)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Video: {total_frames} frames at {fps} FPS")
        print(f"Processing every {frame_skip} frames...")
        
        frame_count = 0
        processed_frames = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Skip frames for faster processing
            if frame_count % frame_skip != 0:
                frame_count += 1
                continue
            
            # Calculate timestamp (in milliseconds)
            timestamp_ms = int((frame_count / fps) * 1000)
            
            # Find closest rotation data
            rotation_entry = self.find_closest_frame(timestamp_ms, rotation_data)
            
            if rotation_entry:
                # Convert degrees to radians
                alpha = math.radians(rotation_entry['alpha'])
                beta = math.radians(rotation_entry['beta'])
                gamma = math.radians(rotation_entry['gamma'])
                
                # Get rotation matrix
                rotation_matrix = self.euler_to_rotation_matrix(alpha, beta, gamma)
                
                # Project frame to dome
                self.project_frame_to_dome(frame, rotation_matrix)
                
                processed_frames += 1
                if processed_frames % 10 == 0:
                    print(f"Processed {processed_frames} frames...")
            
            frame_count += 1
        
        cap.release()
        
        # Create circular mask for final output
        mask = np.zeros((self.dome_size, self.dome_size), dtype=np.uint8)
        cv2.circle(mask, (self.center_x, self.center_y), self.dome_radius, 255, -1)
        
        # Apply mask to create circular output
        final_dome = cv2.bitwise_and(self.dome_canvas, self.dome_canvas, mask=mask)
        
        # Save result
        cv2.imwrite(output_path, final_dome)
        print(f"Dome panorama saved to: {output_path}")
        print(f"Processed {processed_frames} frames total")

def main():
    parser = argparse.ArgumentParser(description='Create sky dome panorama from video and rotation data')
    parser.add_argument('video', help='Path to input video file')
    parser.add_argument('rotation_data', help='Path to JSON file with rotation data')
    parser.add_argument('--output', '-o', default='sky_dome.jpg', help='Output image path')
    parser.add_argument('--dome-size', type=int, default=2000, help='Size of output dome image')
    parser.add_argument('--fov', type=float, default=60.0, help='Camera field of view in degrees')
    parser.add_argument('--frame-skip', type=int, default=30, help='Process every Nth frame')
    
    args = parser.parse_args()
    
    # Create stitcher
    stitcher = SkyDomeStitcher(dome_size=args.dome_size, fov_degrees=args.fov)
    
    # Process video
    stitcher.create_dome_panorama(
        video_path=args.video,
        rotation_data_path=args.rotation_data,
        output_path=args.output,
        frame_skip=args.frame_skip
    )

if __name__ == "__main__":
    main()
