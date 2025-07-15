import cv2
import numpy as np
import json
import os
import math
from typing import Dict, List, Tuple, Optional
import trimesh
from PIL import Image

class ObstructionMapper:
    def __init__(self, grid_resolution_degrees: float = 1.0):
        """
        Initialize the obstruction mapper for spherical dome.
        
        Args:
            grid_resolution_degrees: Resolution in degrees for the grid
        """
        # Camera parameters
        self.camera_fov_degrees = 75.0
        self.camera_fov_radians = math.radians(self.camera_fov_degrees)
        self.image_width = 1864
        self.image_height = 4032
        
        # Spherical dome bounds - 0° to 60° latitude (north pole to 60° south)
        self.DOME_THETA_START = 0  # North pole (zenith)
        self.DOME_THETA_END = math.pi / 3  # 60° latitude
        
        # Full azimuthal range
        self.DOME_PHI_START = 0
        self.DOME_PHI_END = 2 * math.pi
        
        # Grid setup
        self.grid_resolution_degrees = grid_resolution_degrees
        self.grid_resolution_radians = math.radians(grid_resolution_degrees)
        
        # Calculate grid dimensions
        self.theta_range = self.DOME_THETA_END - self.DOME_THETA_START
        self.phi_range = self.DOME_PHI_END - self.DOME_PHI_START
        
        self.theta_steps = int(self.theta_range / self.grid_resolution_radians) + 1
        self.phi_steps = int(self.phi_range / self.grid_resolution_radians) + 1
        
        print(f"📊 Dome Coverage: 0° to 60° latitude (0 to π/3 radians)")
        print(f"📊 Grid dimensions: {self.theta_steps} x {self.phi_steps} = {self.theta_steps * self.phi_steps} cells")
        print(f"📊 Theta range: {math.degrees(self.DOME_THETA_START):.1f}° to {math.degrees(self.DOME_THETA_END):.1f}°")
        print(f"📊 Phi range: {math.degrees(self.DOME_PHI_START):.1f}° to {math.degrees(self.DOME_PHI_END):.1f}°")
        print(f"📊 Grid resolution: {grid_resolution_degrees}°")
        
        # Initialize grid: False = not-sky (default), True = sky
        # Start with everything as not-sky, mark sky pixels as True
        self.sky_grid = np.zeros((self.theta_steps, self.phi_steps), dtype=bool)
        self.sample_counts = np.zeros((self.theta_steps, self.phi_steps), dtype=np.int32)
        
        # Camera intrinsics (approximate for 75° FOV)
        self.focal_length = self.image_width / (2 * math.tan(self.camera_fov_radians / 2))
        self.cx = self.image_width / 2
        self.cy = self.image_height / 2
        
        print(f"📷 Camera parameters: FOV={self.camera_fov_degrees}°, focal_length={self.focal_length:.1f}")
        print(f"📷 Image center: ({self.cx}, {self.cy})")

    def euler_to_rotation_matrix(self, alpha: float, beta: float, gamma: float) -> np.ndarray:
        """
        Convert Euler angles to rotation matrix.
        alpha = yaw (Z-axis), beta = pitch (X-axis), gamma = roll (Y-axis)
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
        
        # Combined rotation matrix (order: Z-Y-X)
        R = Rz @ Ry @ Rx
        return R

    def pixel_to_spherical(self, u: float, v: float, rotation_matrix: np.ndarray) -> Optional[Tuple[float, float]]:
        """
        Convert image pixel coordinates to spherical coordinates.
        
        Args:
            u, v: Pixel coordinates
            rotation_matrix: Device rotation matrix
            
        Returns:
            (theta, phi) in radians or None if outside valid dome region
        """
        # Convert pixel to normalized camera coordinates
        x_cam = (u - self.cx) / self.focal_length
        y_cam = (v - self.cy) / self.focal_length
        z_cam = 1.0
        
        # Camera direction vector (normalized)
        camera_dir = np.array([x_cam, y_cam, z_cam])
        camera_dir = camera_dir / np.linalg.norm(camera_dir)
        
        # Apply rotation to get world coordinates
        # Rotation matrix transforms from device to world coordinates
        world_dir = rotation_matrix @ camera_dir
        
        # Convert to spherical coordinates (theta=colatitude, phi=azimuth)
        # theta: angle from north pole (0 to π)
        # phi: azimuthal angle (0 to 2π)
        
        # Ensure we don't get NaN values
        z_clamped = max(-1.0, min(1.0, world_dir[2]))
        theta = math.acos(z_clamped)  # Colatitude (0 = north pole, π = south pole)
        phi = math.atan2(world_dir[1], world_dir[0])  # Azimuthal angle (-π to π)
        
        # Normalize phi to 0 to 2π
        if phi < 0:
            phi += 2 * math.pi
            
        # Check if within dome region (0° to 60° latitude)
        if theta < self.DOME_THETA_START or theta > self.DOME_THETA_END:
            return None
            
        return (theta, phi)

    def spherical_to_grid_indices(self, theta: float, phi: float) -> Optional[Tuple[int, int]]:
        """
        Convert spherical coordinates to grid indices.
        
        Returns:
            (theta_idx, phi_idx) or None if outside bounds
        """
        # Calculate grid indices
        theta_idx = int((theta - self.DOME_THETA_START) / self.grid_resolution_radians)
        phi_idx = int((phi - self.DOME_PHI_START) / self.grid_resolution_radians)
        
        # Ensure within bounds
        if 0 <= theta_idx < self.theta_steps and 0 <= phi_idx < self.phi_steps:
            return (theta_idx, phi_idx)
        return None

    def process_photo(self, photo_data: Dict, photo_path: str, mask_path: str) -> bool:
        """
        Process a single photo and update the sky grid.
        
        Args:
            photo_data: Photo metadata with rotation data
            photo_path: Path to the photo
            mask_path: Path to the sky mask
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load mask
            if not os.path.exists(mask_path):
                print(f"⚠️  Mask not found: {mask_path}")
                return False
                
            mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
            if mask is None:
                print(f"❌ Failed to load mask: {mask_path}")
                return False
            
            # Get rotation matrix
            alpha = photo_data['alpha']  # yaw
            beta = photo_data['beta']    # pitch
            gamma = photo_data['gamma']  # roll
            rotation_matrix = self.euler_to_rotation_matrix(alpha, beta, gamma)
            
            # Sample pixels in a grid pattern for efficiency
            sample_step = 20  # Sample every 20 pixels
            pixels_processed = 0
            pixels_mapped = 0
            sky_pixels_found = 0
            
            for v in range(0, self.image_height, sample_step):
                for u in range(0, self.image_width, sample_step):
                    pixels_processed += 1
                    
                    # Convert pixel to spherical coordinates
                    spherical_coords = self.pixel_to_spherical(u, v, rotation_matrix)
                    if spherical_coords is None:
                        continue
                        
                    theta, phi = spherical_coords
                    grid_indices = self.spherical_to_grid_indices(theta, phi)
                    if grid_indices is None:
                        continue
                        
                    pixels_mapped += 1
                    theta_idx, phi_idx = grid_indices
                    
                    # Get mask value at this pixel
                    mask_value = mask[v, u]
                    
                    # Increment sample count for this cell
                    self.sample_counts[theta_idx, phi_idx] += 1
                    
                    # If this pixel is sky (white in mask), mark the cell as sky
                    if mask_value > 128:  # Sky (white in mask)
                        self.sky_grid[theta_idx, phi_idx] = True
                        sky_pixels_found += 1
            
            coverage_percent = (pixels_mapped / pixels_processed) * 100 if pixels_processed > 0 else 0
            sky_percent = (sky_pixels_found / pixels_mapped) * 100 if pixels_mapped > 0 else 0
            
            print(f"📸 Photo {photo_data['index']}: {pixels_mapped}/{pixels_processed} pixels mapped ({coverage_percent:.1f}%), {sky_pixels_found} sky pixels ({sky_percent:.1f}%)")
            
            return True
            
        except Exception as e:
            print(f"❌ Error processing photo {photo_data.get('index', 'unknown')}: {e}")
            return False

    def get_coverage_statistics(self) -> Dict:
        """Get statistics about grid coverage."""
        total_cells = self.theta_steps * self.phi_steps
        sampled_cells = np.sum(self.sample_counts > 0)
        sky_cells = np.sum(self.sky_grid)
        not_sky_cells = sampled_cells - sky_cells
        unsampled_cells = total_cells - sampled_cells
        
        return {
            'total_cells': total_cells,
            'sampled_cells': sampled_cells,
            'sky_cells': sky_cells,
            'not_sky_cells': not_sky_cells,
            'unsampled_cells': unsampled_cells,
            'coverage_percent': (sampled_cells / total_cells) * 100,
            'sky_percent': (sky_cells / sampled_cells) * 100 if sampled_cells > 0 else 0,
            'not_sky_percent': (not_sky_cells / sampled_cells) * 100 if sampled_cells > 0 else 0,
            'unsampled_percent': (unsampled_cells / total_cells) * 100
        }

    def save_obstruction_map(self, output_dir: str) -> str:
        """
        Save the obstruction map as JSON.
        
        Returns:
            Path to saved file
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert grid to list for JSON serialization
        sky_grid_data = self.sky_grid.tolist()
        sample_counts_data = self.sample_counts.tolist()
        
        # Create metadata
        metadata = {
            "coordinate_system": "spherical_dome_0_to_60_degrees",
            "description": "Spherical dome covering 0° to 60° latitude (north pole to 60° south)",
            "dome_center": "0,0,0 orientation points to north pole center",
            "theta_range_radians": [self.DOME_THETA_START, self.DOME_THETA_END],
            "phi_range_radians": [self.DOME_PHI_START, self.DOME_PHI_END],
            "theta_range_degrees": [math.degrees(self.DOME_THETA_START), math.degrees(self.DOME_THETA_END)],
            "phi_range_degrees": [math.degrees(self.DOME_PHI_START), math.degrees(self.DOME_PHI_END)],
            "grid_resolution_degrees": self.grid_resolution_degrees,
            "grid_dimensions": [self.theta_steps, self.phi_steps],
            "camera_fov_degrees": self.camera_fov_degrees,
            "image_dimensions": [self.image_width, self.image_height],
            "rotation_mapping": {
                "alpha": "yaw (Z-axis rotation)",
                "beta": "pitch (X-axis rotation)",
                "gamma": "roll (Y-axis rotation)"
            },
            "grid_values": {
                "sky": True,
                "not_sky": False
            },
            "color_scheme": {
                "sky": "blue",
                "not_sky": "red"
            }
        }
        
        # Save obstruction map
        map_data = {
            "sky_grid": sky_grid_data,
            "sample_counts": sample_counts_data,
            "metadata": metadata
        }
        
        output_path = os.path.join(output_dir, "dome_sky_map.json")
        with open(output_path, 'w') as f:
            json.dump(map_data, f, indent=2)
            
        print(f"💾 Dome sky map saved: {output_path}")
        return output_path

    def generate_3d_model(self, output_dir: str) -> str:
        """
        Generate a 3D model from the sky map.
        
        Returns:
            Path to saved model file
        """
        os.makedirs(output_dir, exist_ok=True)
        
        vertices = []
        faces = []
        colors = []
        
        # Dome radius for 3D model
        radius = 50.0
        
        # Generate vertices for the spherical dome (0° to 60° latitude)
        for i in range(self.theta_steps):
            for j in range(self.phi_steps):
                theta = self.DOME_THETA_START + i * self.grid_resolution_radians
                phi = self.DOME_PHI_START + j * self.grid_resolution_radians
                
                # Convert to Cartesian coordinates
                # theta: colatitude (0 = north pole)
                # phi: azimuth (0 to 2π)
                x = radius * math.sin(theta) * math.cos(phi)
                y = radius * math.sin(theta) * math.sin(phi)
                z = radius * math.cos(theta)
                
                vertices.append([x, y, z])
                
                # Color based on sky classification - ALL WITH 50% TRANSPARENCY
                is_sky = self.sky_grid[i, j]
                sample_count = self.sample_counts[i, j]
                
                if sample_count > 0:  # Sampled area
                    if is_sky:  # Sky
                        colors.append([0, 0, 255, 128])  # Blue, 50% transparent
                    else:  # Not sky
                        colors.append([255, 0, 0, 128])  # Red, 50% transparent
                else:  # Unsampled
                    colors.append([128, 128, 128, 128])  # Gray, 50% transparent
        
        # Generate faces (triangles)
        for i in range(self.theta_steps - 1):
            for j in range(self.phi_steps - 1):
                # Current quad vertices
                v0 = i * self.phi_steps + j
                v1 = i * self.phi_steps + ((j + 1) % self.phi_steps)
                v2 = (i + 1) * self.phi_steps + j
                v3 = (i + 1) * self.phi_steps + ((j + 1) % self.phi_steps)
                
                # Two triangles per quad
                faces.append([v0, v1, v2])
                faces.append([v1, v3, v2])
        
        # Create mesh
        mesh = trimesh.Trimesh(
            vertices=np.array(vertices),
            faces=np.array(faces),
            vertex_colors=np.array(colors)
        )
        
        # Save as PLY file
        output_path = os.path.join(output_dir, "dome_sky_model.ply")
        mesh.export(output_path)
        
        print(f"🎨 3D dome model saved: {output_path} (all colors with 50% transparency)")
        return output_path

    def create_data_texture(self, output_dir: str) -> str:
        """
        Create a data texture image for Three.js.
        Red = not sky, Blue = sky, with 50% transparency.
        
        Returns:
            Path to saved texture file
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Create RGBA image from sky grid
        texture_data = np.zeros((self.theta_steps, self.phi_steps, 4), dtype=np.uint8)
        
        for i in range(self.theta_steps):
            for j in range(self.phi_steps):
                sample_count = self.sample_counts[i, j]
                
                if sample_count > 0:  # Sampled area
                    is_sky = self.sky_grid[i, j]
                    if is_sky:  # Sky
                        texture_data[i, j] = [0, 0, 255, 128]  # Blue with 50% transparency
                    else:  # Not sky
                        texture_data[i, j] = [255, 0, 0, 128]  # Red with 50% transparency
                else:  # Unsampled
                    texture_data[i, j] = [128, 128, 128, 128]  # Gray with 50% transparency

        # Save as PNG
        output_path = os.path.join(output_dir, "dome_sky_texture.png")
        image = Image.fromarray(texture_data, 'RGBA')
        image.save(output_path)
        
        print(f"🖼️  Data texture saved: {output_path} (50% transparency)")
        
        # Also save metadata for the texture
        texture_metadata = {
            "description": "Data texture for spherical dome (0° to 60° latitude)",
            "dimensions": [self.theta_steps, self.phi_steps],
            "theta_range_degrees": [0, 60],
            "phi_range_degrees": [0, 360],
            "color_mapping": {
                "red": "not sky or obstruction",
                "blue": "sky",
                "gray": "unsampled"
            },
            "alpha_channel": {
                "128": "50% transparency (consistent across all colors)"
            },
            "usage": "Use as data texture in Three.js for dome visualization"
        }
        
        metadata_path = os.path.join(output_dir, "texture_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(texture_metadata, f, indent=2)
            
        print(f"📋 Texture metadata saved: {metadata_path}")
        return output_path
