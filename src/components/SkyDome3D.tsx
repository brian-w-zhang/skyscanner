// src/components/SkyDome3D.tsx
import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { hybridOrientation } from '../utils/orientationHelpers';

interface SkyDome3DProps {
  accelerometerData: { x: number; y: number; z: number };
  magnetometerData: { x: number; y: number; z: number };
  gyroscopeData: { x: number; y: number; z: number };
  compassHeading: number;
  isPointingUp: boolean;
}

function SkyDome() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a custom material with vertex colors for 8 quadrants
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(50, 32, 32);
    
    // Create vertex colors array
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const positions = geo.attributes.position.array;
    
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const x = positions[i * 3];     // X coordinate
      const y = positions[i * 3 + 1]; // Y coordinate
      const z = positions[i * 3 + 2]; // Z coordinate
      
      if (y > 0) {
        // Top hemisphere - 4 strong shades of blue
        if (x > 0 && z > 0) {
          // Front-right quadrant - Bright cyan
          colors[i * 3] = 0.0;     // R
          colors[i * 3 + 1] = 1.0; // G
          colors[i * 3 + 2] = 1.0; // B
        } else if (x > 0 && z < 0) {
          // Back-right quadrant - Pure blue
          colors[i * 3] = 0.0;     // R
          colors[i * 3 + 1] = 0.0; // G
          colors[i * 3 + 2] = 1.0; // B
        } else if (x < 0 && z > 0) {
          // Front-left quadrant - Light blue
          colors[i * 3] = 0.5;     // R
          colors[i * 3 + 1] = 0.8; // G
          colors[i * 3 + 2] = 1.0; // B
        } else {
          // Back-left quadrant - Dark blue
          colors[i * 3] = 0.0;     // R
          colors[i * 3 + 1] = 0.3; // G
          colors[i * 3 + 2] = 0.8; // B
        }
      } else {
        // Bottom hemisphere - 4 strong shades of red
        if (x > 0 && z > 0) {
          // Front-right quadrant - Bright red
          colors[i * 3] = 1.0;     // R
          colors[i * 3 + 1] = 0.0; // G
          colors[i * 3 + 2] = 0.0; // B
        } else if (x > 0 && z < 0) {
          // Back-right quadrant - Pink
          colors[i * 3] = 1.0;     // R
          colors[i * 3 + 1] = 0.0; // G
          colors[i * 3 + 2] = 0.5; // B
        } else if (x < 0 && z > 0) {
          // Front-left quadrant - Orange
          colors[i * 3] = 1.0;     // R
          colors[i * 3 + 1] = 0.5; // G
          colors[i * 3 + 2] = 0.0; // B
        } else {
          // Back-left quadrant - Dark red
          colors[i * 3] = 0.8;     // R
          colors[i * 3 + 1] = 0.0; // G
          colors[i * 3 + 2] = 0.0; // B
        }
      }
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial 
        vertexColors={true}
        transparent={true}
        opacity={0.6}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function CameraController({ 
  accelerometerData, 
  gyroscopeData, 
  compassHeading 
}: { 
  accelerometerData: { x: number; y: number; z: number };
  gyroscopeData: { x: number; y: number; z: number };
  compassHeading: number;
}) {
  const { camera } = useThree();
  const previousRotation = useRef({ x: 0, y: 0, z: 0 });
  const lastUpdateTime = useRef(0);
  
  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;
    const deltaTime = currentTime - lastUpdateTime.current;
    lastUpdateTime.current = currentTime;
    
    // Skip if delta time is too large (first frame or after pause)
    if (deltaTime > 0.1) return;
    
    // Use hybrid approach for smooth, accurate orientation
    const rotation = hybridOrientation(
      accelerometerData,
      gyroscopeData,
      compassHeading,
      deltaTime,
      previousRotation.current
    );
    
    // Apply rotation to camera
    camera.rotation.x = rotation.x; // Pitch
    camera.rotation.y = rotation.y; // Yaw (from compass)
    camera.rotation.z = rotation.z; // Roll
    
    // Update previous rotation
    previousRotation.current = rotation;
    
    // Force camera matrix update
    camera.updateMatrixWorld();
  });
  
  return null;
}

export default function SkyDome3D({ 
  accelerometerData, 
  magnetometerData, 
  gyroscopeData, 
  compassHeading, 
  isPointingUp 
}: SkyDome3DProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas 
        camera={{ 
          position: [0, 0, 0],
          fov: 75,
          near: 0.1,
          far: 100
        }}
      >
        <CameraController 
          accelerometerData={accelerometerData} 
          gyroscopeData={gyroscopeData}
          compassHeading={compassHeading}
        />
        <SkyDome />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
