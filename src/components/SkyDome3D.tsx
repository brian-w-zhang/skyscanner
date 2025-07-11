import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Orientation } from '../utils/orientationTracker';

interface SkyDome3DProps {
  orientation: Orientation;
}

function SkyDome() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      {/* Single sphere with white "dipped" top portion */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[50, 64, 32]} />
        <meshBasicMaterial
          color="black"
          side={THREE.BackSide}
          transparent={true}
          opacity={0.6}
        />
      </mesh>
      
      {/* White "dipped" portion - smaller hemisphere centered at current view */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[50, 64, 16, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
        <meshBasicMaterial
          color="white"
          side={THREE.BackSide}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

function CameraController({ orientation }: { orientation: Orientation }) {
  const { camera } = useThree();

  useFrame(() => {
    // Apply rotation directly from gyroscope data - no smoothing, no drift correction
    camera.rotation.x = orientation.pitch;
    camera.rotation.y = orientation.yaw;
    camera.rotation.z = orientation.roll;

    // Keep camera at origin
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();
  });

  return null;
}

export default function SkyDome3D({ orientation }: SkyDome3DProps) {
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
