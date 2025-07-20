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
  private gridResolution: number = 10; // Higher = more accurate but slower
  private fovRadians: number = (75 * Math.PI) / 180; // 75 degrees camera FOV
  private minDwellTime: number = 200; // Minimum time between captures (ms)
  private lastCaptureTime: number = 0;
  
  // White dome bounds (matching your SkyDome component)
  private readonly WHITE_DOME_PHI_START = (2 * Math.PI) / 3; // Start of white section
  private readonly WHITE_DOME_PHI_END = Math.PI; // End of white section
  
  // Precomputed constants for optimization
  private readonly WHITE_DOME_PHI_RANGE = this.WHITE_DOME_PHI_END - this.WHITE_DOME_PHI_START;
  private readonly WHITE_DOME_PHI_START_WITH_TOLERANCE = this.WHITE_DOME_PHI_START - 0.05;
  private readonly WHITE_DOME_PHI_END_WITH_TOLERANCE = this.WHITE_DOME_PHI_END + 0.05;
  private readonly TWO_PI = 2 * Math.PI;
  private readonly HALF_FOV = this.fovRadians / 2;
  
  // Pre-allocated 2D grid for coverage calculation
  private coverageGrid: boolean[][];
  
  // FOV sampling pattern (precomputed)
  private readonly fovSamplePattern: { u: number; v: number }[];
  
  private onCoverageChange?: (coverage: ScanCoverage) => void;

  constructor(onCoverageChange?: (coverage: ScanCoverage) => void) {
    this.onCoverageChange = onCoverageChange;
    
    // Pre-allocate coverage grid
    this.coverageGrid = Array(this.gridResolution).fill(null).map(() => 
      Array(this.gridResolution).fill(false)
    );
    
    // Precompute FOV sampling pattern
    this.fovSamplePattern = this.generateFOVPattern();
  }

  // Precompute FOV sampling pattern once
  private generateFOVPattern(): { u: number; v: number }[] {
    const pattern = [];
    const samples = 10;
    
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < samples; j++) {
        const u = (i / (samples - 1)) * 2 - 1;
        const v = (j / (samples - 1)) * 2 - 1;
        
        // Only include points within the circular FOV
        if (u * u + v * v <= 1) {
          pattern.push({ u, v });
        }
      }
    }
    
    return pattern;
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

    // Convert to spherical coordinates with clamping to avoid NaN
    const phi = Math.acos(Math.max(-1, Math.min(1, lookDirection.y))); // Polar angle (0 to π)
    const theta = Math.atan2(lookDirection.z, lookDirection.x); // Azimuthal angle (-π to π)
    
    return {
      phi: phi,
      theta: theta < 0 ? theta + this.TWO_PI : theta // Normalize to 0 to 2π
    };
  }

  // Check if a point is within the white dome area (optimized with precomputed values)
  private isInWhiteDome(phi: number): boolean {
    return phi >= this.WHITE_DOME_PHI_START_WITH_TOLERANCE && phi <= this.WHITE_DOME_PHI_END_WITH_TOLERANCE;
  }

  // Calculate field of view coverage area at given orientation (optimized)
  private calculateFOVCoverage(centerPhi: number, centerTheta: number): ScanPoint[] {
    const points: ScanPoint[] = [];
    const timestamp = Date.now();
    const sinCenterPhi = Math.sin(Math.max(centerPhi, 0.001)); // Precompute once

    // Use precomputed pattern instead of nested loops
    for (const { u, v } of this.fovSamplePattern) {
      const offsetPhi = centerPhi + v * this.HALF_FOV;
      const offsetTheta = centerTheta + u * this.HALF_FOV / sinCenterPhi;
      
      // Normalize theta to 0-2π range
      const normalizedTheta = ((offsetTheta % this.TWO_PI) + this.TWO_PI) % this.TWO_PI;
      
      // Only add if within bounds and in white dome
      if (offsetPhi >= 0 && offsetPhi <= Math.PI && this.isInWhiteDome(offsetPhi)) {
        points.push({
          phi: offsetPhi,
          theta: normalizedTheta,
          timestamp
        });
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

  // Calculate total coverage percentage (optimized with 2D array)
  private calculateCoverage(): ScanCoverage {
    if (this.scannedPoints.length === 0) {
      return { totalCoverage: 0, scannedPoints: [] };
    }

    // Reset grid efficiently
    for (let i = 0; i < this.gridResolution; i++) {
      for (let j = 0; j < this.gridResolution; j++) {
        this.coverageGrid[i][j] = false;
      }
    }
    
    // Mark grid cells as covered
    for (const point of this.scannedPoints) {
      // Only consider points in white dome
      if (this.isInWhiteDome(point.phi)) {
        // Convert to grid coordinates
        const gridPhi = Math.floor(((point.phi - this.WHITE_DOME_PHI_START) / this.WHITE_DOME_PHI_RANGE) * this.gridResolution);
        const gridTheta = Math.floor((point.theta / this.TWO_PI) * this.gridResolution);
        
        // Bounds checking and mark as covered
        if (gridPhi >= 0 && gridPhi < this.gridResolution && gridTheta >= 0 && gridTheta < this.gridResolution) {
          this.coverageGrid[gridPhi][gridTheta] = true;
        }
      }
    }

    // Count covered cells
    let coveredCells = 0;
    for (let i = 0; i < this.gridResolution; i++) {
      for (let j = 0; j < this.gridResolution; j++) {
        if (this.coverageGrid[i][j]) {
          coveredCells++;
        }
      }
    }

    // Calculate total possible cells in white dome
    const totalCells = this.gridResolution * this.gridResolution;
    const coverage = (coveredCells / totalCells) * 100;
    
    // Apply tolerance threshold
    const tolerance = 4; // Allow up to 4% uncovered cells
    const adjustedCoverage = coverage >= (100 - tolerance) ? 100 : coverage;

    return {
      totalCoverage: Math.min(adjustedCoverage, 100),
      scannedPoints: this.scannedPoints,
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
