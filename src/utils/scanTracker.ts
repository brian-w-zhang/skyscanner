import { Orientation } from './orientationTracker';

export interface ScanPoint {
  phi: number;    // Polar angle (0 to π)
  theta: number;  // Azimuthal angle (0 to 2π)
  timestamp: number;
}

export interface ScanCoverage {
  totalCoverage: number;  // Percentage (0-100)
  scannedPoints: ScanPoint[];
}

export class ScanTracker {
  private scannedPoints: ScanPoint[] = [];
  private gridResolution: number = 14; // Higher = more accurate but slower
  private fovRadians: number = (75 * Math.PI) / 180; // 75 degrees camera FOV
  private minDwellTime: number = 80; // Minimum time between captures (ms)
  private lastCaptureTime: number = 0;
  
  // White dome bounds (matching your SkyDome component)
  private readonly WHITE_DOME_PHI_START = (2 * Math.PI) / 3; // Start of white section
  private readonly WHITE_DOME_PHI_END = Math.PI; // End of white section
  
  private onCoverageChange?: (coverage: ScanCoverage) => void;

  constructor(onCoverageChange?: (coverage: ScanCoverage) => void) {
    this.onCoverageChange = onCoverageChange;
  }

  // Convert camera orientation to spherical coordinates
  private orientationToSpherical(orientation: Orientation): { phi: number; theta: number } {
    // Camera is looking forward (negative Z direction initially)
    // Apply rotations to get the look direction
    const adjustedPitch = orientation.pitch - Math.PI / 2;
    
    const lookDirection = {
      x: Math.sin(orientation.yaw) * Math.cos(adjustedPitch),
      y: Math.sin(adjustedPitch),
      z: -Math.cos(orientation.yaw) * Math.cos(adjustedPitch)
    };

    // Convert to spherical coordinates
    const phi = Math.acos(lookDirection.y); // Polar angle (0 to π)
    const theta = Math.atan2(lookDirection.z, lookDirection.x); // Azimuthal angle (-π to π)
    
    return {
      phi: phi,
      theta: theta < 0 ? theta + 2 * Math.PI : theta // Normalize to 0 to 2π
    };
  }

  // Check if a point is within the white dome area
  private isInWhiteDome(phi: number): boolean {
    // Add tolerance to white dome bounds
    const tolerance = 0.05; // Allow slight deviation
    return phi >= this.WHITE_DOME_PHI_START - tolerance && phi <= this.WHITE_DOME_PHI_END + tolerance;
  }

  // Calculate field of view coverage area at given orientation
  private calculateFOVCoverage(centerPhi: number, centerTheta: number): ScanPoint[] {
    const points: ScanPoint[] = [];
    const halfFOV = this.fovRadians / 2;
    const timestamp = Date.now();

    // Sample points within the FOV cone
    const samples = 10; // Number of samples in each direction
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < samples; j++) {
        // Create a grid within the FOV cone
        const u = (i / (samples - 1)) * 2 - 1; // -1 to 1
        const v = (j / (samples - 1)) * 2 - 1; // -1 to 1
        
        // Only include points within the circular FOV
        if (u * u + v * v <= 1) {
          const offsetPhi = centerPhi + v * halfFOV;
          const offsetTheta = centerTheta + u * halfFOV / Math.sin(Math.max(centerPhi, 0.001));
          
          // Normalize theta to 0-2π range
          const normalizedTheta = ((offsetTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          
          // Only add if within bounds and in white dome
          if (offsetPhi >= 0 && offsetPhi <= Math.PI && this.isInWhiteDome(offsetPhi)) {
            points.push({
              phi: offsetPhi,
              theta: normalizedTheta,
              timestamp
            });
          }
        }
      }
    }

    return points;
  }

  // Update scan coverage based on current orientation
  updateOrientation(orientation: Orientation) {
    const now = Date.now();
    
    // Throttle updates to prevent too many calculations
    if (now - this.lastCaptureTime < this.minDwellTime) {
      return;
    }
    
    this.lastCaptureTime = now;

    // Convert orientation to spherical coordinates
    const spherical = this.orientationToSpherical(orientation);
    
    // Only track if looking at white dome area
    if (!this.isInWhiteDome(spherical.phi)) {
      return;
    }

    // Calculate FOV coverage
    const fovPoints = this.calculateFOVCoverage(spherical.phi, spherical.theta);
    
    // Add new points to scanned areas
    this.scannedPoints.push(...fovPoints);
    
    // Calculate coverage and notify
    const coverage = this.calculateCoverage();
    this.onCoverageChange?.(coverage);
  }

  // Calculate total coverage percentage
  private calculateCoverage(): ScanCoverage {
    if (this.scannedPoints.length === 0) {
      return { totalCoverage: 0, scannedPoints: [] };
    }

    // Create a grid to track covered areas
    const grid = new Set<string>();
    const gridSize = this.gridResolution;
    
    // Mark grid cells as covered
    for (const point of this.scannedPoints) {
      // Only consider points in white dome
      if (this.isInWhiteDome(point.phi)) {
        // Convert to grid coordinates
        const gridPhi = Math.floor(((point.phi - this.WHITE_DOME_PHI_START) / (this.WHITE_DOME_PHI_END - this.WHITE_DOME_PHI_START)) * gridSize);
        const gridTheta = Math.floor((point.theta / (2 * Math.PI)) * gridSize);
        
        // Add to covered set
        grid.add(`${gridPhi},${gridTheta}`);
      }
    }

    // Calculate total possible cells in white dome
    const totalCells = gridSize * gridSize;
    const coveredCells = grid.size;
    
    const coverage = (coveredCells / totalCells) * 100;
    
    return {
      totalCoverage: Math.min(coverage, 100),
      scannedPoints: this.scannedPoints
    };
  }

  // Reset scan tracking
  reset() {
    this.scannedPoints = [];
    this.lastCaptureTime = 0;
    this.onCoverageChange?.({ totalCoverage: 0, scannedPoints: [] });
  }

  // Get current coverage
  getCoverage(): ScanCoverage {
    return this.calculateCoverage();
  }
}
