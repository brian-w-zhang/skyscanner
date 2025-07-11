import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Orientation } from '../utils/orientationTracker';

interface SkyDome3DProps {
  orientation: Orientation;
  isPointingUp: boolean;
}

function SkyDome() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(50, 32, 32);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const positions = geo.attributes.position.array;

    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = positions[i * 3 + 1]; // Y coordinate

      if (y > 0) {
        // Top half - Sky Blue gradient
        const normalizedY = Math.max(0, y / 50);
        colors[i * 3] = 0.5 + normalizedY * 0.3; // R
        colors[i * 3 + 1] = 0.7 + normalizedY * 0.3; // G
        colors[i * 3 + 2] = 1.0; // B
      } else {
        // Bottom half - Ground/Earth tones
        const normalizedY = Math.abs(Math.min(0, y / 50));
        colors[i * 3] = 0.4 + normalizedY * 0.3; // R
        colors[i * 3 + 1] = 0.2 + normalizedY * 0.3; // G
        colors[i * 3 + 2] = 0.1; // B
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* Sky Dome - Fixed position at (0, 50, 0) */}
      <mesh ref={meshRef} geometry={geometry} position={[0, 50, 0]}>
        <meshBasicMaterial
          vertexColors={true}
          side={THREE.BackSide}
          transparent={true}
          opacity={0.6}
        />
      </mesh>

      {/* Optional: Ground plane for reference */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial 
          color="#2d5a27" 
          transparent={true} 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

function CameraController({ orientation }: { orientation: Orientation }) {
  const { camera } = useThree();
  const smoothedRotation = useRef({ pitch: 0, yaw: 0, roll: 0 });

  // Smoothing factor (0 = no smoothing, 1 = instant)
  const smoothingFactor = 0.1;

  useFrame(() => {
    // Apply smoothing to prevent jitter
    smoothedRotation.current.pitch = THREE.MathUtils.lerp(
      smoothedRotation.current.pitch,
      orientation.pitch,
      smoothingFactor
    );
    smoothedRotation.current.yaw = THREE.MathUtils.lerp(
      smoothedRotation.current.yaw,
      orientation.yaw,
      smoothingFactor
    );
    smoothedRotation.current.roll = THREE.MathUtils.lerp(
      smoothedRotation.current.roll,
      orientation.roll,
      smoothingFactor
    );

    // Apply rotation to camera
    camera.rotation.x = smoothedRotation.current.pitch;
    camera.rotation.y = smoothedRotation.current.yaw;
    camera.rotation.z = smoothedRotation.current.roll;

    // Keep camera at origin
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();
  });

  return null;
}

function ScanningOverlay({ isPointingUp }: { isPointingUp: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    // Animate scanning effect when pointing up
    if (isPointingUp) {
      material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    } else {
      material.opacity = 0;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial 
        color="#00ff00" 
        transparent={true}
        opacity={0}
      />
    </mesh>
  );
}

export default function SkyDome3D({ orientation, isPointingUp }: SkyDome3DProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas
        camera={{
          position: [0, 0, 0],
          fov: 75,
          near: 0.1,
          far: 200,
        }}
      >
        <CameraController orientation={orientation} />
        <SkyDome />
        <ScanningOverlay isPointingUp={isPointingUp} />
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
