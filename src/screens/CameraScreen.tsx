import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import Compass from '../components/Compass';
import AccelerometerDebug from '../components/AccelerometerDebug';

interface CameraScreenProps {
  navigation: any;
}

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [isPointingUp, setIsPointingUp] = useState(false);

  useEffect(() => {
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
      
      // Calculate if device is pointing up at sky
      // Based on observations: when pointing up, pitch ~0, roll ~0
      const pitch = Math.atan2(-data.y, Math.sqrt(data.x * data.x + data.z * data.z));
      const roll = Math.atan2(data.x, data.z);
      
      const pitchDegrees = pitch * (180 / Math.PI);
      const rollDegrees = roll * (180 / Math.PI);
      
      // Check if both pitch and roll are close to 0 (pointing up at sky)
      const isPitchNearZero = Math.abs(pitchDegrees) < 30;
      const isRollNearZero = Math.abs(rollDegrees) < 45;
      
      const pointingUp = isPitchNearZero && isRollNearZero;
      setIsPointingUp(pointingUp);
    });

    Accelerometer.setUpdateInterval(100);

    return () => subscription && subscription.remove();
  }, []);

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
        
        <View style={styles.compassContainer}>
          <Compass />
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
    zIndex: 1,
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
    zIndex: 1,
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
