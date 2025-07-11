import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Compass from '../components/Compass';
import OrientationDebugNew from '../components/OrientationDebugNew';
import SkyDome3D from '../components/SkyDome3D';
import { OrientationTracker, Orientation } from '../utils/orientationTracker';

interface CameraScreenProps {
  navigation: any;
}

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [orientation, setOrientation] = useState<Orientation>({ pitch: 0, yaw: 0, roll: 0 });
  const [compassHeading, setCompassHeading] = useState(0);
  const [isPointingUp, setIsPointingUp] = useState(false);
  
  const orientationTracker = useRef<OrientationTracker | null>(null);

  // Calculate if pointing up based on pitch
  const calculatePointingUp = useCallback((orientation: Orientation) => {
    const pitchDegrees = orientation.pitch * (180 / Math.PI);
    
    // Consider "pointing up" when pitch is negative (phone tilted up)
    // and within reasonable bounds
    return pitchDegrees < -20 && pitchDegrees > -90;
  }, []);

  const handleOrientationChange = useCallback((newOrientation: Orientation) => {
    setOrientation(newOrientation);
    
    const pointingUp = calculatePointingUp(newOrientation);
    setIsPointingUp(pointingUp);
  }, [calculatePointingUp]);

  const handleHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
  }, []);

  useEffect(() => {
    // Initialize orientation tracker
    orientationTracker.current = new OrientationTracker(handleOrientationChange);
    orientationTracker.current.start();

    return () => {
      orientationTracker.current?.stop();
    };
  }, [handleOrientationChange]);

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
          orientation={orientation}
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
        
        {/* New Orientation Debug */}
        <OrientationDebugNew 
          orientation={orientation}
          isPointingUp={isPointingUp}
        />
        
        <View style={styles.compassContainer}>
          <Compass onHeadingChange={handleHeadingChange} />
        </View>

        {/* Optional: Reset button for testing */}
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={() => orientationTracker.current?.reset()}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
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
  resetButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 2,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
