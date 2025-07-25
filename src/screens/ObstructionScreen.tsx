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
function DishyModel({ forceRefresh, showStars, backgroundRetry, setBackgroundRetry }: { 
  forceRefresh: number; 
  showStars: boolean; 
  backgroundRetry: number;
  setBackgroundRetry: (value: number | ((prev: number) => number)) => void;
}) {
  const [dishAssets] = useAssets([require('../../assets/3d/dishy.glb')]);
  
  // Force re-evaluation by creating a new array reference when forceRefresh changes
  const obstAssetArray = useMemo(() => {
    console.log('🔄 Creating new asset array, refresh count:', forceRefresh);
    return [require('../flask/model/dome_sky_model.glb')];
  }, [forceRefresh]);
  
  const [obstAssets] = useAssets(obstAssetArray);
  const [retryCount, setRetryCount] = useState(0);
  const [obstructionScene, setObstructionScene] = useState<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Group>(null);

  const [backgroundAssets] = useAssets([require('../../assets/3d/earth.glb')]); // Load the background sphere
  
  // Auto-rotate everything
  useFrame((state, delta) => {
    if (sceneRef.current) {
      sceneRef.current.rotation.y += delta * 0.6;
    }
  });
  
  // Retry logic for loading obstruction model
  useEffect(() => {
    if (!obstAssets || !obstAssets[0]) {
      console.log('⏳ Assets not ready yet, will retry...');
      return;
    }

    const loadObstructionModel = () => {
      try {
        const { scene: obstScene } = useGLTF(obstAssets[0].localUri || obstAssets[0].uri);
        setObstructionScene(obstScene);
        console.log('✅ Obstruction model loaded from local file (refresh:', forceRefresh, ', retry:', retryCount, ')');
      } catch (error) {
        const typedError = error as Error;
        console.log('ℹ️ No obstruction model available yet:', typedError.message, '- Retry attempt:', retryCount);
        
        // Retry up to 3 times with a delay
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 100 * (retryCount + 1)); // Progressive delay: 100ms, 200ms, 300ms
        }
      }
    };

    loadObstructionModel();
  }, [obstAssets, retryCount, forceRefresh]);

  // Reset retry count when forceRefresh changes
  useEffect(() => {
    setRetryCount(0);
    setObstructionScene(null);
  }, [forceRefresh]);
  
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
  
  if (!dishAssets || !backgroundAssets) {
    return null;
  }
  
  const { scene: dishScene } = useGLTF(dishAssets[0].localUri || dishAssets[0].uri);
  
  // Only load background scene if showStars is true
  let backgroundScene = null;
    if (showStars && backgroundAssets && backgroundAssets[0]) {
    try {
        const result = useGLTF(backgroundAssets[0].localUri || backgroundAssets[0].uri);
        backgroundScene = result.scene;
        // Reset retry if successful
        if (backgroundRetry !== 0) setBackgroundRetry(0);
        console.log('✅ Background scene loaded successfully');
    } catch (error) {
        console.log('⚠️ Background scene failed to load, will retry:', error);
        backgroundScene = null;
        // Retry after a short delay, but only if not already retrying
        if (backgroundRetry < 3) {
        setTimeout(() => setBackgroundRetry(backgroundRetry + 1), 200);
        }
    }
    }

  const scaleMultiplier = 0.9;
  
  const scale = 0.018;
  const rotation_in_degrees = [21, 0, 0];
  const radians = rotation_in_degrees.map(degree => degree * (Math.PI / 180));

  const obstrScale = 0.27;
  const obstrRotationInDegrees = [-70, 0, 0];
  const obstrRadians = obstrRotationInDegrees.map(degree => degree * (Math.PI / 180));

  const starScale = 1.2;

  return (
    <group ref={sceneRef}>
      {/* Background Sphere - Only show when showStars is true */}
      {showStars && (
        <group position={[0, 0, 0]}>
          {backgroundScene ? (
            <primitive 
              object={backgroundScene} 
              scale={[starScale, starScale, starScale]} 
              rotation={[0, 0, 0]} 
            />
          ) : (
            // Fallback background sphere
            <mesh>
              <sphereGeometry args={[50, 32, 32]} />
              <meshBasicMaterial 
                color="#001122" 
                side={THREE.BackSide} // Render from inside
              />
            </mesh>
          )}
        </group>
      )}
      
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

      <directionalLight 
        position={[12, 8, -10]}
        intensity={0.3}
        color="rgb(255, 255, 255)"
      />

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
  const [showStars, setShowStars] = useState(false);
  const [backgroundRetry, setBackgroundRetry] = useState(0);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const toggleStars = () => {
    if (showStars) {
      setBackgroundRetry(0); // Reset retry when turning off
    }
    setShowStars(!showStars);
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
        {/* Globe Toggle Button */}
        <TouchableOpacity 
          style={[styles.starButton, showStars && styles.starButtonActive]} 
          onPress={toggleStars}
        >
          <Ionicons 
            name={showStars ? "earth" : "earth-outline"} 
            size={20} 
            color={showStars ? "white" : "#666666"} 
          />
        </TouchableOpacity>
      </View>

      {/* 3D Model Viewer */}
      <View style={styles.modelContainer} {...events}>
        <Canvas
          shadows
          camera={{
            position: [-10, -72, 10],
            fov: 50,
            near: 0.01,
            far: 1000,
          }}
        >
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minPolarAngle={minPolarAngle}
            maxPolarAngle={maxPolarAngle}
            rotateSpeed={2}
            target={new Vector3(0, 0, 0)}
          />
          <DishyModel 
            forceRefresh={forceRefresh} 
            showStars={showStars} 
            backgroundRetry={backgroundRetry}
            setBackgroundRetry={setBackgroundRetry}
          />
        </Canvas>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'grey' }]} />
            <Text style={styles.legendText}>No Data</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 70, 228, 1)' }]} />
            <Text style={styles.legendText}>Clear View</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(203, 35, 35, 1)' }]} />
            <Text style={styles.legendText}>Obstructions</Text>
          </View>
        </View>

        {/* Instructions Text */}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end', // Align content to bottom of header
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50, // Add extra padding at top for safe area
    paddingBottom: 15, // Keep existing bottom padding
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent black
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    zIndex: 1, // Ensure it stays above the Canvas
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modelContainer: {
    position: 'absolute', // Make it fill the entire screen
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: -1, // Ensure it appears behind other components
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40, // Add extra padding at bottom for safe area
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent black
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    zIndex: 1, // Ensure it stays above the Canvas
  },
  instructionsText: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    gap: 40,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    color: '#fefefeff',
    fontSize: 12,
    fontWeight: '500',
  },
  starButton: {
    padding: 8,
    borderRadius: 6,
  },
  starButtonActive: {
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
