// src/screens/CameraScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer, Magnetometer, Gyroscope } from 'expo-sensors';
import Compass from '../components/Compass';
import AccelerometerDebug from '../components/AccelerometerDebug';
import OrientationDebug from '../components/OrientationDebug';
import SkyDome3D from '../components/SkyDome3D';

interface CameraScreenProps {
  navigation: any;
}

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });
  const [compassHeading, setCompassHeading] = useState(0);
  const [isPointingUp, setIsPointingUp] = useState(false);

  // Memoize the pointing up calculation to prevent infinite loops
  const calculatePointingUp = useCallback((data: { x: number; y: number; z: number }) => {
    const pitch = Math.atan2(-data.y, Math.sqrt(data.x * data.x + data.z * data.z));
    const roll = Math.atan2(data.x, data.z);
    
    const pitchDegrees = pitch * (180 / Math.PI);
    const rollDegrees = roll * (180 / Math.PI);
    
    const isPitchNearZero = Math.abs(pitchDegrees) < 30;
    const isRollNearZero = Math.abs(rollDegrees) < 45;
    
    return isPitchNearZero && isRollNearZero;
  }, []);

  const handleHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
  }, []);

  useEffect(() => {
    const accelerometerSubscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      
      // Calculate pointing up status
      const pointingUp = calculatePointingUp(data);
      setIsPointingUp(pointingUp);
    });

    const magnetometerSubscription = Magnetometer.addListener((data) => {
      setMagnetometerData(data);
    });

    const gyroscopeSubscription = Gyroscope.addListener((data) => {
      setGyroscopeData(data);
    });

    Accelerometer.setUpdateInterval(16); // 60 FPS for smooth movement
    Magnetometer.setUpdateInterval(100);
    Gyroscope.setUpdateInterval(16); // 60 FPS for smooth movement

    return () => {
      accelerometerSubscription && accelerometerSubscription.remove();
      magnetometerSubscription && magnetometerSubscription.remove();
      gyroscopeSubscription && gyroscopeSubscription.remove();
    };
  }, [calculatePointingUp]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={styles.camera} facing="back">
        {/* 3D Sky Dome Overlay */}
        <SkyDome3D 
          accelerometerData={accelerometerData} 
          magnetometerData={magnetometerData}
          gyroscopeData={gyroscopeData}
          compassHeading={compassHeading}
          isPointingUp={isPointingUp} 
        />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Accelerometer Debug */}
        <AccelerometerDebug data={accelerometerData} isPointingUp={isPointingUp} />
        
        {/* Orientation Debug */}
        <OrientationDebug 
          accelerometerData={accelerometerData} 
          magnetometerData={magnetometerData}
          gyroscopeData={gyroscopeData}
          compassHeading={compassHeading}
        />
        
        <View style={styles.compassContainer}>
          <Compass onHeadingChange={handleHeadingChange} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 2,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  compassContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    zIndex: 2,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
