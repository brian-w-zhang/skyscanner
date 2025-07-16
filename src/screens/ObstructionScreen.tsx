import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import useControls from 'r3f-native-orbitcontrols';
import { Ionicons } from '@expo/vector-icons';
import { GLTF } from 'three-stdlib';
import { useAssets } from 'expo-asset';
import { Vector3 } from 'three';
import * as THREE from 'three';

interface ObstructionScreenProps {
  navigation: any;
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}


function CompassMarks() {
  const radius = 13;
  const tickLength = 0.4;
  const labelDistance = 0.7; // Move dots inside the circle

  // Cardinal directions with their angles and labels
  const cardinalDirections = [
    { angle: 0, label: 'E' },
    { angle: 90, label: 'N' },
    { angle: 180, label: 'W' },
    { angle: 270, label: 'S' }
  ];

  // Create tick marks for every 5 degrees, excluding cardinal directions and their neighbors
  const ticks = useMemo(() => {
    const ticksArray = [];
    for (let i = 0; i < 360; i += 4) {
      // Remove the tick at the cardinal direction and its immediate neighbors (±5°)
      const isCardinalOrNeighbor = cardinalDirections.some(cardinal =>
        Math.abs(i - cardinal.angle) <= 5 ||
        Math.abs(i - cardinal.angle + 360) <= 5 ||
        Math.abs(i - cardinal.angle - 360) <= 5
      );
      if (isCardinalOrNeighbor) continue;

      const angle = degreesToRadians(i);
      const tickSize = tickLength;

      // Start point (outer edge)
      const startX = Math.cos(angle) * radius;
      const startZ = Math.sin(angle) * radius;

      // End point (inner)
      const endX = Math.cos(angle) * (radius - tickSize);
      const endZ = Math.sin(angle) * (radius - tickSize);

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([
        startX, 0, startZ,
        endX, 0, endZ
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      ticksArray.push(
        <line key={i}>
          <primitive object={geometry} />
          <lineBasicMaterial color="white" />
        </line>
      );
    }
    return ticksArray;
  }, [radius, tickLength]);

  // Create compass labels (dots) for cardinal directions, moved inside the circle
  const labels = useMemo(() => {
    const dotOffset = 0.5;
    return cardinalDirections.map(({ angle, label }) => {
      const radianAngle = degreesToRadians(angle);
      // Move dot inside the circle
      const x = Math.cos(radianAngle) * (radius - labelDistance + dotOffset);
      const z = Math.sin(radianAngle) * (radius - labelDistance + dotOffset);

      // North dot is red, others are white
      const color = label === 'N' ? 'red' : 'white';

      return (
        <group key={label} position={[x, 0.1, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.4, 26]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      );
    });
  }, [radius, labelDistance]);

  return (
    <group>
      {ticks}
      {labels}
    </group>
  );
}

// Component to load and display the GLB file
function DishyModel() {
  const [assets] = useAssets([require('../../assets/3d/dishy.glb')]);  
  
  // Create the gradient shader material
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        centerColor: { value: new THREE.Color(0x737373) }, // Much lighter grey center
        edgeColor: { value: new THREE.Color(0x0a2a2e) },   // Dark edge but not pure black
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 centerColor;
        uniform vec3 edgeColor;
        
        varying vec2 vUv;
        
        void main() {
          // Calculate distance from center (0.5, 0.5)
          float dist = distance(vUv, vec2(0.5, 0.5));
          
          // Apply a power curve to make the gradient more pronounced
          dist = pow(dist * 1.814, 1.2); // 1.414 normalizes diagonal distance, power makes it more dramatic
          dist = clamp(dist, 0.0, 1.0);
          
          // Mix colors based on distance
          vec3 color = mix(centerColor, edgeColor, dist);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, []);
  
  if (!assets) {
    return null;
  }
  
  const { scene } = useGLTF(assets[0].localUri || assets[0].uri) as GLTF;

  const scale = 0.018; // Adjust scale as needed
  const rotation_in_degrees = [21, 0, 0]; // Adjust rotation as needed
  const radians = rotation_in_degrees.map(degree => degree * (Math.PI / 180));

  return (
    <>
      {/* Key Light - Main shadow-casting light positioned above the dish */}
      <directionalLight 
        position={[0, 25, 5]}
        intensity={3}
        color="#f0f8ff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={100}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0001}
      />

      {/* Fill Light - Softer light to reduce harsh shadows */}
      <directionalLight 
        position={[-15, 12, 8]}
        intensity={0.7}
        color="#ffffff"
      />

      <directionalLight 
        position={[0, -12, 10]}
        intensity={0.2}
        color="rgb(255, 255, 255)"
      />

      <directionalLight 
        position={[0, -12, 10]}
        intensity={0.4}
        color="rgb(255, 255, 255)"
      />

      {/* Rim Light - Creates edge definition */}
      <directionalLight 
        position={[12, 8, -10]}
        intensity={0.3}
        color="rgb(255, 255, 255)"
      />

      {/* Ambient Light - Subtle overall illumination */}
      <ambientLight intensity={0.25} color="rgba(96, 96, 96, 1)" />
      
      {/* Ground Plane - Single mesh with gradient shader */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[13, 64]} />
        <primitive object={gradientMaterial} />
      </mesh>

      {/* Compass marks and labels */}
      <group position={[0, -1.99, 0]}>
        <CompassMarks />
      </group>

      {/* 3D Model */}
      <primitive object={scene} scale={[scale, scale, scale]} rotation={radians} castShadow receiveShadow />
    </>
  );
}

export default function ObstructionScreen({ navigation }: ObstructionScreenProps) {
  const [OrbitControls, events] = useControls();

  const handleGoBack = () => {
    navigation.goBack();
  };

  const minPolarAngleInDegrees = 0; // Set the minimum polar angle in degrees
  const minPolarAngle = degreesToRadians(minPolarAngleInDegrees); // Convert to radians
  const maxPolarAngle = degreesToRadians(minPolarAngleInDegrees + 90); // Add 90 degrees and convert to radians

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Obstructions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 3D Model Viewer */}
      <View style={styles.modelContainer} {...events}>
        <Canvas
          shadows
          camera={{
            position: [-10, -50, 10],
            fov: 50,
            near: 0.1,
            far: 1000,
          }}
        >
          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            minPolarAngle={minPolarAngle}
            maxPolarAngle={maxPolarAngle}
            rotateSpeed={2}
            target={new Vector3(0, 0, 0)}  // Focus on the center of the model
          />
          <DishyModel />
        </Canvas>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Drag to rotate • Pinch to zoom • Two fingers to pan
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  modelContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  instructionsContainer: {
    padding: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  instructionsText: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
