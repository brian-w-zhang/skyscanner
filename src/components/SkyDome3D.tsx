import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Orientation } from '../utils/orientationTracker';
import { Starbits } from './Starbits';

interface SkyDome3DProps {
  orientation: Orientation;
  initialOrientation: Orientation;
  onLoaded?: () => void;
}

function SkyDome({ initialOrientation, onLoaded }: { initialOrientation: Orientation; onLoaded?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Since initialOrientation is now always zero (reset when scan starts),
  // we don't need to rotate the dome at all. The white part will always be
  // at the "north pole" of the sphere (top), which corresponds to where
  // the camera is looking when scan starts.
  const domeRotation = useMemo(() => {
    return new THREE.Euler(Math.PI / 2, 0, 0, 'XYZ');
  }, []);

  // Create the top section (black - most of the sphere)
  const createTopSection = () => {
    // This will be most of the sphere (from 0 to about 2π/3)
    const geometry = new THREE.SphereGeometry(50, 64, 32, 0, Math.PI * 2, 0, (2 * Math.PI) / 3);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.7,
    });
    return new THREE.Mesh(geometry, material);
  };

  // Create the bottom section (white - just the top two rings after rotation)
  const createBottomSection = () => {
    // This will be the smaller section (from about 2π/3 to π)
    const geometry = new THREE.SphereGeometry(50, 64, 32, 0, Math.PI * 2, (2 * Math.PI) / 3, Math.PI / 3);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.05,
    });
    return new THREE.Mesh(geometry, material);
  };

  // Create grid lines for the dome
const createGridLines = () => {
  const lines = new THREE.Group();
  const radius = 49; // Slightly smaller than dome to prevent z-fighting

  // Horizontal rings (latitude lines)
  for (let i = 7; i <= 9; i++) { // Ensure rings are strictly in the white section (skip boundary at i=6)
    const angle = (i * Math.PI) / 9; // Calculate angle
    // Only include rings that are WITHIN the white section
    // White section spans from (2 * Math.PI) / 3 to Math.PI
    if (angle < (2 * Math.PI) / 3 || angle > (Math.PI)) continue;

    const y = radius * Math.cos(angle);
    const ringRadius = radius * Math.sin(angle);

    const geometry = new THREE.RingGeometry(ringRadius - 0.1, ringRadius + 0.1, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2; // Rotate to be horizontal
    lines.add(ring);
  }

  return lines;
};

  // Signal that the dome is loaded after component mounts
  useEffect(() => {
    // Use a small delay to ensure Three.js objects are fully initialized
    const timer = setTimeout(() => {
      setIsLoaded(true);
      onLoaded?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [onLoaded]);

  return (
    <group ref={groupRef} rotation={[domeRotation.x, domeRotation.y, domeRotation.z]}>
      {/* Top section (black - most of the sphere) */}
      <primitive object={createTopSection()} />

      {/* Bottom section (white - top two rings after rotation) */}
      <primitive object={createBottomSection()} />

      {/* Grid lines */}
      <primitive object={createGridLines()} />

      {/* Sparkling starbits in the white section */}
      <Starbits />
    </group>
  );
}

function CameraController({ orientation, initialOrientation }: { orientation: Orientation; initialOrientation: Orientation }) {
  const { camera } = useThree();

  // Use useCallback to memoize the frame update function
  const updateCamera = useCallback(() => {
    camera.rotation.x = orientation.pitch;
    camera.rotation.y = orientation.yaw;
    camera.rotation.z = orientation.roll;
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();
  }, [camera, orientation.pitch, orientation.yaw, orientation.roll]);

  useFrame(updateCamera);

  return null;
}

export default function SkyDome3D({ orientation, initialOrientation, onLoaded }: SkyDome3DProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas
        camera={{
          position: [0, 0, 0],
          fov: 75,
          near: 0.1,
          far: 200,
        }}
        gl={{
          powerPreference: "high-performance", // Use high-performance GPU
          antialias: false, // Disable for better performance
        }}
        performance={{
          min: 0.8, // Maintain at least 80% of target framerate
        }}
      >
        <CameraController orientation={orientation} initialOrientation={initialOrientation} />
        <SkyDome initialOrientation={initialOrientation} onLoaded={onLoaded} />
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
