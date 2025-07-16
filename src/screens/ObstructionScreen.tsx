import React, { useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import useControls from 'r3f-native-orbitcontrols';
import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { Vector3 } from 'three';
import * as THREE from 'three';

interface ObstructionScreenProps {
  navigation: any;
  route?: {
    params?: {
      glbPath?: string;
      streamUrl?: string;
    };
  };
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function CompassMarks() {
  const radius = 13;
  const tickLength = 0.4;
  const labelDistance = 0.7;

  const cardinalDirections = [
    { angle: 0, label: 'E' },
    { angle: 90, label: 'N' },
    { angle: 180, label: 'W' },
    { angle: 270, label: 'S' }
  ];

  const ticks = useMemo(() => {
    const ticksArray = [];
    for (let i = 0; i < 360; i += 4) {
      const isCardinalOrNeighbor = cardinalDirections.some(cardinal =>
        Math.abs(i - cardinal.angle) <= 5 ||
        Math.abs(i - cardinal.angle + 360) <= 5 ||
        Math.abs(i - cardinal.angle - 360) <= 5
      );
      if (isCardinalOrNeighbor) continue;

      const angle = degreesToRadians(i);
      const tickSize = tickLength;

      const startX = Math.cos(angle) * radius;
      const startZ = Math.sin(angle) * radius;
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

  const labels = useMemo(() => {
    const dotOffset = 0.5;
    return cardinalDirections.map(({ angle, label }) => {
      const radianAngle = degreesToRadians(angle);
      const x = Math.cos(radianAngle) * (radius - labelDistance + dotOffset);
      const z = Math.sin(radianAngle) * (radius - labelDistance + dotOffset);

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

// Component to load and display both GLB files with auto-rotation
function DishyModel({ forceRefresh }: { forceRefresh: number }) {
  const [dishAssets] = useAssets([require('../../assets/3d/dishy.glb')]);
  
  // Force re-evaluation by creating a new array reference when forceRefresh changes
  const obstAssetArray = useMemo(() => {
    console.log('🔄 Creating new asset array, refresh count:', forceRefresh);
    return [require('../new_testing/model/dome_sky_model.glb')];
  }, [forceRefresh]);
  
  const [obstAssets] = useAssets(obstAssetArray);

  const sceneRef = useRef<THREE.Group>(null);
  
  // Auto-rotate everything
  useFrame((state, delta) => {
    if (sceneRef.current) {
      sceneRef.current.rotation.y += delta * 0.6;
    }
  });
  
  // Create the gradient shader material
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        centerColor: { value: new THREE.Color(0x737373) },
        edgeColor: { value: new THREE.Color(0x0a2a2e) },
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
          float dist = distance(vUv, vec2(0.5, 0.5));
          dist = pow(dist * 1.814, 1.2);
          dist = clamp(dist, 0.0, 1.0);
          vec3 color = mix(centerColor, edgeColor, dist);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });
  }, []);
  
  if (!dishAssets) {
    return null;
  }
  
  const { scene: dishScene } = useGLTF(dishAssets[0].localUri || dishAssets[0].uri);

  // Load obstruction model if available
  let obstructionScene = null;
  if (obstAssets && obstAssets[0]) {
    try {
      const { scene: obstScene } = useGLTF(obstAssets[0].localUri || obstAssets[0].uri);
      obstructionScene = obstScene;
      console.log('✅ Obstruction model loaded from local file (refresh:', forceRefresh, ')');
    } catch (error) {
      const typedError = error as Error; // Explicitly cast to Error
      console.log('ℹ️ No obstruction model available yet:', typedError.message);
    }
  }

  const scale = 0.018;
  const rotation_in_degrees = [21, 0, 0];
  const radians = rotation_in_degrees.map(degree => degree * (Math.PI / 180));

  const obstrScale = 0.27;
  const obstrRotationInDegrees = [-70, 0, 0];
  const obstrRadians = obstrRotationInDegrees.map(degree => degree * (Math.PI / 180));

  return (
    <group ref={sceneRef}>
      {/* Key Light */}
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

      {/* Fill Light */}
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

      {/* Rim Light */}
      <directionalLight 
        position={[12, 8, -10]}
        intensity={0.3}
        color="rgb(255, 255, 255)"
      />

      {/* Ambient Light */}
      <ambientLight intensity={0.25} color="rgba(96, 96, 96, 1)" />
      
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[13, 64]} />
        <primitive object={gradientMaterial} receiveShadow />
      </mesh>

      {/* Compass marks and labels */}
      <group position={[0, -1.99, 0]}>
        <CompassMarks />
      </group>

      {/* Generated Obstruction Model - positioned above the dish */}
        {obstructionScene && (
        <group position={[0, 0, 0]}>
            <primitive 
            object={obstructionScene} 
            scale={[obstrScale, obstrScale, obstrScale]} 
            rotation={obstrRadians}
            onUpdate={(self: THREE.Object3D) => {
                // Make all materials double-sided and semi-transparent
                self.traverse((child: THREE.Object3D) => {
                if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                    const materialOrArray = (child as THREE.Mesh).material;

                    // Flatten nested arrays of materials
                    const materials = Array.isArray(materialOrArray)
                    ? materialOrArray.flat(Infinity) // Flatten deeply nested arrays
                    : [materialOrArray]; // Wrap single material in an array

                    materials.forEach((material) => {
                    if (material instanceof THREE.Material) {
                        material.side = THREE.DoubleSide; // Render both front and back faces
                        material.transparent = true;      // Enable transparency
                        material.opacity = 0.6;          // Set opacity (60% visible)
                        material.needsUpdate = true;     // Tell Three.js to update the material
                    }
                    });
                }
                });
            }}
            />
            
            {/* UPWARD-POINTING LIGHT FOR DOME INTERIOR */}
            <pointLight 
            position={[0, -2, 0]} 
            intensity={8} 
            color="#ffffff" 
            distance={50}
            decay={0.5}
            />
            
            {/* Alternative: Spot light pointing upward (more focused) */}
            {/* <spotLight
            position={[0, -3, 0]}
            target-position={[0, 10, 0]}
            intensity={10}
            color="#ffffff"
            angle={Math.PI / 3} // 60 degree cone
            penumbra={0.3}
            distance={50}
            decay={0.5}
            /> */}
        </group>
        )}

      {/* Dish Model */}
      <primitive 
        object={dishScene} 
        scale={[scale, scale, scale]} 
        rotation={radians} 
        castShadow 
        receiveShadow 
      />
    </group>
  );
}

export default function ObstructionScreen({ navigation, route }: ObstructionScreenProps) {
  const [OrbitControls, events] = useControls();
  const [forceRefresh, setForceRefresh] = useState(0);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const minPolarAngleInDegrees = 0;
  const minPolarAngle = degreesToRadians(minPolarAngleInDegrees);
  const maxPolarAngle = degreesToRadians(minPolarAngleInDegrees + 90);

  useEffect(() => {
    console.log('🎯 Obstruction Screen loaded - showing latest generated model from local file');
    
    // Force refresh when navigating to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Navigation focus detected - forcing asset refresh');
      setForceRefresh(prev => prev + 1);
    });
    
    return unsubscribe;
  }, [navigation]);

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
            position: [-10, -52, 10],
            fov: 50,
            near: 0.01,
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
            target={new Vector3(0, 0, 0)}
          />
          <DishyModel forceRefresh={forceRefresh} />
        </Canvas>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Drag to rotate • Showing latest obstruction scan
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
