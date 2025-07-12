import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

interface StarbitsProps {
  // Add any props you might need in the future
}

export function Starbits({}: StarbitsProps) {
  const starbitRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  const createStarbits = () => {
    const radius = 49; // Slightly smaller than dome to prevent z-fighting
    const starSize = 0.6; // Size of each starbit
    const outerRadius = starSize; // Outer radius of the star
    const innerRadius = starSize * 0.6; // Increased inner radius for wider points

    // Create a 4-pointed star shape
    const starShape = new THREE.Shape();
    starShape.moveTo(0, outerRadius); // Top point
    starShape.lineTo(innerRadius * 0.5, innerRadius * 0.5); // Inner point
    starShape.lineTo(outerRadius, 0); // Right point
    starShape.lineTo(innerRadius * 0.5, -innerRadius * 0.5); // Inner point
    starShape.lineTo(0, -outerRadius); // Bottom point
    starShape.lineTo(-innerRadius * 0.5, -innerRadius * 0.5); // Inner point
    starShape.lineTo(-outerRadius, 0); // Left point
    starShape.lineTo(-innerRadius * 0.5, innerRadius * 0.5); // Inner point
    starShape.closePath();
    
    const geometry = new THREE.ShapeGeometry(starShape);
    
    // Use standard material with emissive properties for sparkle
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, // Makes stars glow
    });

    // Calculate star count based on area
    const phiStart = (2 * Math.PI) / 3 + 0.05;
    const phiEnd = Math.PI;
    const starbitCount = 400; // Fixed count for better performance

    const instancedMesh = new THREE.InstancedMesh(geometry, material, starbitCount);

    // Store initial scales and phases for animation
    const initialScales = new Float32Array(starbitCount);
    const animationPhases = new Float32Array(starbitCount);
    
    for (let i = 0; i < starbitCount; i++) {
      initialScales[i] = 0.7 + Math.random() * 0.6; // Random base scale
      animationPhases[i] = Math.random() * Math.PI * 2; // Random animation phase
    }

    const dummy = new THREE.Object3D();
    
    // Improved distribution using stratified sampling with jittering
    const generateBetterDistribution = () => {
      const positions = [];
      const minDistance = 3.5; // Minimum distance between stars
      const maxAttempts = 50; // Max attempts per star placement
      
      // Use Poisson disc sampling for more natural distribution
      for (let attempt = 0; attempt < starbitCount * 20 && positions.length < starbitCount; attempt++) {
        // Generate random spherical coordinates within the white section
        const phi = phiStart + Math.random() * (phiEnd - phiStart);
        const theta = Math.random() * Math.PI * 2;
        
        // Add some stratification to reduce clustering
        const stratumSize = Math.sqrt(starbitCount);
        const stratumX = Math.floor(attempt / stratumSize) % stratumSize;
        const stratumY = Math.floor(attempt / (stratumSize * stratumSize));
        
        // Jitter within stratum
        const jitterPhi = (stratumX + Math.random()) / stratumSize * (phiEnd - phiStart);
        const jitterTheta = (stratumY + Math.random()) / stratumSize * Math.PI * 2;
        
        // Blend random and stratified coordinates
        const finalPhi = phiStart + (jitterPhi * 0.7 + Math.random() * (phiEnd - phiStart) * 0.3);
        const finalTheta = jitterTheta * 0.7 + Math.random() * Math.PI * 2 * 0.3;
        
        const x = radius * Math.sin(finalPhi) * Math.cos(finalTheta);
        const z = radius * Math.sin(finalPhi) * Math.sin(finalTheta);
        const y = radius * Math.cos(finalPhi);
        
        const newPosition = new THREE.Vector3(x, y, z);
        
        // Check minimum distance to existing stars
        let tooClose = false;
        for (const existingPos of positions) {
          if (newPosition.distanceTo(existingPos) < minDistance) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          positions.push(newPosition);
        }
      }
      
      return positions;
    };

    const starPositions = generateBetterDistribution();
    
    // Place stars at calculated positions
    for (let i = 0; i < starPositions.length; i++) {
      const position = starPositions[i];
      
      dummy.position.copy(position);
      dummy.lookAt(0, 0, 0); // Ensure the starbit faces inward
      dummy.scale.setScalar(initialScales[i]);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Store animation data on the mesh for later use
    instancedMesh.userData.initialScales = initialScales;
    instancedMesh.userData.animationPhases = animationPhases;
    instancedMesh.userData.starPositions = [];
    
    // Store positions for animation
    for (let i = 0; i < starPositions.length; i++) {
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

  return <primitive object={starbits} ref={starbitRef} />;
}
