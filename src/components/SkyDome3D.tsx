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

  // Calculate rotation to align the white dome with initial camera direction
  const domeRotation = useMemo(() => {
    // We want to rotate the entire dome so the white part aligns with where camera was looking
    // Since the white part is at the "north pole" (top), we need to rotate it to match camera direction
    return new THREE.Euler(
      -initialOrientation.pitch, // Negative because we're rotating the world, not the camera
      -initialOrientation.yaw,
      -initialOrientation.roll,
      'XYZ'
    );
  }, [initialOrientation]);

  // Create the sky dome with custom shader material for smooth gradient
  const createSkyDomeMaterial = () => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        skyColor: { value: new THREE.Color(1.0, 1.0, 1.0) }, // White for sky
        groundColor: { value: new THREE.Color(0.0, 0.0, 0.0) }, // Black for ground
        offset: { value: 0.05 }, // How much of the dome is "sky"
        exponent: { value: 0.6 }, // Gradient sharpness
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 skyColor;
        uniform vec3 groundColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition).y;
          float ramp = max(offset + h, 0.0);
          ramp = pow(ramp, exponent);
          vec3 color = mix(groundColor, skyColor, ramp);
          gl_FragColor = vec4(color, 0.7);
        }
      `,
    });
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
      {/* Main sky dome with gradient */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[50, 64, 32]} />
        <primitive object={createSkyDomeMaterial()} />
      </mesh>

      {/* Grid lines */}
      <primitive object={createGridLines()} />

      {/* Constellation points */}
      {Array.from({ length: 200 }, (_, i) => {
        const phi = Math.acos(2 * Math.random() - 1); // Random latitude
        const theta = 2 * Math.PI * Math.random(); // Random longitude
        const radius = 48;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        // Only show stars in the upper hemisphere (sky part)
        if (y > -5) {
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshBasicMaterial
                color="white"
                transparent={true}
                opacity={Math.random() * 0.8 + 0.2}
              />
            </mesh>
          );
        }
        return null;
      })}
    </group>
  );
}

function CameraController({ orientation }: { orientation: Orientation }) {
  const { camera } = useThree();

  useFrame(() => {
    // Apply rotation directly from gyroscope data
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
        <CameraController orientation={orientation} />
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
