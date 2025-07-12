import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Orientation } from '../utils/orientationTracker';

interface SkyDome3DProps {
  orientation: Orientation;
  initialOrientation: Orientation;
}

function SkyDome({ initialOrientation }: { initialOrientation: Orientation }) {
  const groupRef = useRef<THREE.Group>(null);
  const starbitRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

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
      opacity: 0.7,
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

  const createStarbits = () => {
    const radius = 49; // Slightly smaller than dome to prevent z-fighting
    const starSize = 0.6; // Size of each starbit
    
    // Use simple plane geometry for better compatibility
    const geometry = new THREE.PlaneGeometry(starSize, starSize);
    
    // Use standard material with emissive properties for sparkle
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, // Makes stars glow
    });

    // Calculate optimal star count based on area coverage
    const phiStart = (2 * Math.PI) / 3 + 0.05;
    const phiEnd = Math.PI;
    const phiRange = phiEnd - phiStart;
    const avgRadius = radius * Math.sin((phiStart + phiEnd) / 2);
    const circumference = 2 * Math.PI * avgRadius;
    
    // Aim for consistent spacing (about 4 units apart)
    const spacing = 4;
    const starsPerRing = Math.floor(circumference / spacing);
    const numRings = Math.floor((phiRange * radius) / spacing);
    const starbitCount = Math.min(starsPerRing * numRings, 600); // Cap at 600 for performance

    const instancedMesh = new THREE.InstancedMesh(geometry, material, starbitCount);

    // Store initial scales and phases for animation
    const initialScales = new Float32Array(starbitCount);
    const animationPhases = new Float32Array(starbitCount);
    
    for (let i = 0; i < starbitCount; i++) {
      initialScales[i] = 0.7 + Math.random() * 0.6; // Random base scale
      animationPhases[i] = Math.random() * Math.PI * 2; // Random animation phase
    }

    const dummy = new THREE.Object3D();
    let index = 0;

    // Distribute stars evenly across the white section
    for (let ring = 0; ring < numRings && index < starbitCount; ring++) {
      const phi = phiStart + (ring / numRings) * phiRange;
      const ringRadius = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);
      const starsInThisRing = Math.floor(ringRadius / radius * starsPerRing);
      
      for (let star = 0; star < starsInThisRing && index < starbitCount; star++) {
        const theta = (star / starsInThisRing) * Math.PI * 2;
        
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);

        dummy.position.set(x, y, z);
        dummy.lookAt(0, 0, 0); // Ensure the starbit faces inward
        dummy.scale.setScalar(initialScales[index]);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(index, dummy.matrix);
        index++;
      }
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Store animation data on the mesh for later use
    instancedMesh.userData.initialScales = initialScales;
    instancedMesh.userData.animationPhases = animationPhases;
    instancedMesh.userData.starPositions = [];
    
    // Store positions for animation
    for (let i = 0; i < index; i++) {
      const matrix = new THREE.Matrix4();
      instancedMesh.getMatrixAt(i, matrix);
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      matrix.decompose(position, rotation, scale);
      instancedMesh.userData.starPositions.push({ position, rotation });
    }
    
    return instancedMesh;
  };

  // Create starbits once and store reference
  const starbits = useMemo(() => createStarbits(), []);

  // Animation loop for sparkle effect
  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
    
    if (starbits && starbits.userData.initialScales) {
      const dummy = new THREE.Object3D();
      const { initialScales, animationPhases, starPositions } = starbits.userData;
      
      // Update each star's scale and opacity for sparkle effect
      for (let i = 0; i < starPositions.length; i++) {
        const { position, rotation } = starPositions[i];
        const phase = animationPhases[i];
        const baseScale = initialScales[i];
        
        // Calculate pulsing scale
        const pulseScale = baseScale * (0.8 + 0.4 * Math.sin(timeRef.current * 3 + phase));
        
        // Calculate sparkle opacity
        const sparkleOpacity = 0.6 + 0.4 * Math.sin(timeRef.current * 6 + phase * 2);
        
        dummy.position.copy(position);
        dummy.quaternion.copy(rotation);
        dummy.scale.setScalar(pulseScale);
        dummy.updateMatrix();
        
        starbits.setMatrixAt(i, dummy.matrix);
      }
      
      starbits.instanceMatrix.needsUpdate = true;
      
      // Update material opacity for sparkle effect
      if (starbits.material) {
        starbits.material.opacity = 0.7 + 0.3 * Math.sin(timeRef.current * 4);
      }
    }
  });

  return (
    <group ref={groupRef} rotation={[domeRotation.x, domeRotation.y, domeRotation.z]}>
      {/* Top section (black - most of the sphere) */}
      <primitive object={createTopSection()} />

      {/* Bottom section (white - top two rings after rotation) */}
      <primitive object={createBottomSection()} />

      {/* Grid lines */}
      <primitive object={createGridLines()} />

      {/* Sparkling starbits in the white section */}
      <primitive object={starbits} ref={starbitRef} />
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
