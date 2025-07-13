import { Gyroscope, Accelerometer, Magnetometer } from 'expo-sensors';

export interface Orientation {
  pitch: number;  // X rotation (up/down)
  yaw: number;    // Y rotation (left/right) 
  roll: number;   // Z rotation (tilt)
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export class OrientationTracker {
  private currentOrientation: Orientation = { pitch: 0, yaw: 0, roll: 0 };
  private lastTimestamp: number = 0;
  private driftCorrectionInterval: number = 2000; // 0.5 seconds (was 2 seconds)
  private lastDriftCorrection: number = 0;
  
  // Smoothing factors
  private gyroSmoothingFactor = 0.95;
  private driftCorrectionStrength = 0.1; // Stronger correction (was 0.1)
  
  // Sensor subscriptions
  private gyroSubscription: any = null;
  private accelSubscription: any = null;
  private magnetometerSubscription: any = null;
  
  // Latest sensor data for drift correction
  private latestAccelData: Vector3 = { x: 0, y: 0, z: 0 };
  private latestMagnetometerData: Vector3 = { x: 0, y: 0, z: 0 };
  
  // Callbacks
  private onOrientationChange?: (orientation: Orientation) => void;

  constructor(onOrientationChange?: (orientation: Orientation) => void) {
    this.onOrientationChange = onOrientationChange;
  }

  start() {
    this.setupGyroscope();
    this.setupAccelerometer();
    this.setupMagnetometer();
  }

  stop() {
    this.gyroSubscription?.remove();
    this.accelSubscription?.remove();
    this.magnetometerSubscription?.remove();
  }

  private setupGyroscope() {
    this.gyroSubscription = Gyroscope.addListener((data) => {
      const currentTime = Date.now();
      
      if (this.lastTimestamp === 0) {
        this.lastTimestamp = currentTime;
        return;
      }

      const deltaTime = (currentTime - this.lastTimestamp) / 1000; // Convert to seconds
      this.lastTimestamp = currentTime;

      // Skip if delta time is too large (prevents jumps when app regains focus)
      if (deltaTime > 0.1) return;

      // Integrate gyroscope data (angular velocity to rotation)
      this.currentOrientation.pitch += data.x * deltaTime;
      this.currentOrientation.yaw += data.y * deltaTime;
      this.currentOrientation.roll += data.z * deltaTime;

      // Apply drift correction more frequently
      // if (currentTime - this.lastDriftCorrection > this.driftCorrectionInterval) {
      //   this.applyDriftCorrection();
      //   this.lastDriftCorrection = currentTime;
      // }

      // Notify listeners
      this.onOrientationChange?.(this.currentOrientation);
    });

    Gyroscope.setUpdateInterval(1); // buttery smooth 1000 Hz updates
  }

  private setupAccelerometer() {
    this.accelSubscription = Accelerometer.addListener((data) => {
      this.latestAccelData = data;
    });

    Accelerometer.setUpdateInterval(50); // 20 FPS - more frequent for better drift correction
  }

  private setupMagnetometer() {
    this.magnetometerSubscription = Magnetometer.addListener((data) => {
      this.latestMagnetometerData = data;
    });

    Magnetometer.setUpdateInterval(100); // 10 FPS - for drift correction
  }

  private applyDriftCorrection() {
    // Calculate "true" orientation from accelerometer
    const { x: ax, y: ay, z: az } = this.latestAccelData;
    
    if (ax === 0 && ay === 0 && az === 0) return; // No valid data

    // Calculate pitch and roll from gravity
    const truePitch = Math.atan2(-ay, Math.sqrt(ax * ax + az * az));
    const trueRoll = Math.atan2(ax, az);

    // Apply stronger correction to prevent drift
    this.currentOrientation.pitch = this.lerp(
      this.currentOrientation.pitch,
      truePitch,
      this.driftCorrectionStrength
    );

    this.currentOrientation.roll = this.lerp(
      this.currentOrientation.roll,
      trueRoll,
      this.driftCorrectionStrength
    );

    // Optional: Magnetometer-based yaw correction
    // (Skip for now to avoid compass interference)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  getCurrentOrientation(): Orientation {
    return { ...this.currentOrientation };
  }

  reset() {
    this.currentOrientation = { pitch: 0, yaw: 0, roll: 0 };
    this.lastTimestamp = 0;
  }
}
