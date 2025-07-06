// src/utils/orientationHelpers.ts
export interface OrientationData {
  pitch: number;
  roll: number;
  yaw: number;
}

export interface SensorData {
  accelerometer: { x: number; y: number; z: number };
  magnetometer?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
}

export function calculateOrientation(sensorData: SensorData): OrientationData {
  const { accelerometer, magnetometer } = sensorData;
  const { x: ax, y: ay, z: az } = accelerometer;
  
  // Calculate pitch and roll from accelerometer (these are reliable)
  const pitch = Math.atan2(-ay, Math.sqrt(ax * ax + az * az));
  const roll = Math.atan2(ax, az);
  
  let yaw = 0;
  
  // Only calculate yaw if magnetometer data is available and needed
  if (magnetometer) {
    const { x: mx, y: my, z: mz } = magnetometer;
    const magX = mx * Math.cos(pitch) + mz * Math.sin(pitch);
    const magY = mx * Math.sin(roll) * Math.sin(pitch) + my * Math.cos(roll) - mz * Math.sin(roll) * Math.cos(pitch);
    yaw = Math.atan2(-magY, magX);
  }
  
  return {
    pitch,
    roll,
    yaw
  };
}

// Convert pitch and roll to a 3D direction vector
export function pitchRollToDirection(pitch: number, roll: number): [number, number, number] {
  // Convert spherical coordinates to Cartesian direction vector
  // This represents the direction the camera is pointing
  
  const x = Math.sin(roll) * Math.cos(pitch);
  const y = -Math.sin(pitch); // Negative because pitch is inverted
  const z = Math.cos(roll) * Math.cos(pitch);
  
  return [x, y, z];
}

// Convert pitch, roll, and yaw to camera rotation (for Three.js)
export function orientationToRotation(pitch: number, roll: number, yaw: number): [number, number, number] {
  // Convert compass heading (0-360) to radians for yaw
  const yawRadians = (yaw * Math.PI) / 180;
  
  return [
    pitch,      // X rotation (pitch)
    yawRadians, // Y rotation (yaw) - from compass
    roll        // Z rotation (roll)
  ];
}

// Convert pitch and roll to camera rotation (for Three.js) - legacy function
export function pitchRollToRotation(pitch: number, roll: number): [number, number, number] {
  // Return rotation angles for Three.js camera
  // Only using pitch and roll, ignoring yaw
  return [
    pitch,  // X rotation (pitch)
    0,      // Y rotation (yaw) - set to 0 to ignore chaotic magnetometer
    roll    // Z rotation (roll)
  ];
}

// Integrate gyroscope data for smooth rotation
export function integrateGyroscope(
  currentRotation: { x: number; y: number; z: number },
  gyroscopeData: { x: number; y: number; z: number },
  deltaTime: number
): { x: number; y: number; z: number } {
  // Integrate angular velocity to get rotation
  return {
    x: currentRotation.x + gyroscopeData.x * deltaTime,
    y: currentRotation.y + gyroscopeData.y * deltaTime,
    z: currentRotation.z + gyroscopeData.z * deltaTime
  };
}

// Hybrid approach: combine accelerometer absolute reference with gyroscope smoothness
export function hybridOrientation(
  accelerometerData: { x: number; y: number; z: number },
  gyroscopeData: { x: number; y: number; z: number },
  compassHeading: number,
  deltaTime: number,
  previousRotation: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  // Get absolute reference from accelerometer
  const pitch = Math.atan2(-accelerometerData.y, Math.sqrt(accelerometerData.x * accelerometerData.x + accelerometerData.z * accelerometerData.z));
  const roll = Math.atan2(accelerometerData.x, accelerometerData.z);
  
  // Use compass heading for yaw (converted to radians)
  const yaw = (compassHeading * Math.PI) / 180;
  
  // Integrate gyroscope for smooth movement
  const gyroIntegrated = integrateGyroscope(previousRotation, gyroscopeData, deltaTime);
  
  // Blend: use accelerometer for absolute reference, gyroscope for smoothness
  const blendFactor = 0.1; // How much to trust accelerometer vs gyroscope
  
  return {
    x: pitch * blendFactor + gyroIntegrated.x * (1 - blendFactor),
    y: yaw, // Use compass heading directly
    z: roll * blendFactor + gyroIntegrated.z * (1 - blendFactor)
  };
}

// Legacy function for backward compatibility
export function orientationToEuler(orientation: OrientationData): [number, number, number] {
  return pitchRollToRotation(orientation.pitch, orientation.roll);
}
