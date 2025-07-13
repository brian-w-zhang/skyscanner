import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Orientation } from '../utils/orientationTracker';
import { Starbits } from './Starbits';

interface SkyDome3DProps {
  orientation: Orientation;
  initialOrientation: Orientation;
}

function SkyDome({ initialOrientation }: { initialOrientation: Orientation }) {
  const groupRef = useRef<THREE.Group>(null);

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
      opacity: 0.1,
    });
    return new THREE.Mesh(geometry, material);
  };

  // Create grid lines for the dome
  const createGridLines = () => {
    const lines = new THREE.Group();
    const radius = 49; // Slightly smaller than dome to prevent z-fighting

    // Horizontal rings (latitude lines)
    for (let i = 1; i <= 8; i++) {
      const angle = (i * Math.PI) / 9; // 0 to PI
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

    // Vertical lines (longitude lines)
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI, false, 0);
      const points = curve.getPoints(32);
      const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, 0)));
      
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      
      const line = new THREE.Line(geometry, material);
      line.rotation.z = angle;
      line.rotation.x = Math.PI / 2; // Rotate to be vertical
      lines.add(line);
    }

    return lines;
  };

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

  useFrame(() => {
    // Since we reset the orientation tracker when scan starts,
    // we can use the orientation values directly
    camera.rotation.x = orientation.pitch;
    camera.rotation.y = orientation.yaw;
    camera.rotation.z = orientation.roll;

    // Keep camera at origin
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();
  });

  return null;
}

export default function SkyDome3D({ orientation, initialOrientation }: SkyDome3DProps) {
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
        <CameraController orientation={orientation} initialOrientation={initialOrientation} />
        <SkyDome initialOrientation={initialOrientation} />
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
