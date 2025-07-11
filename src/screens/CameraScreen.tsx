import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Compass from '../components/Compass';
import OrientationDebugNew from '../components/OrientationDebugNew';
import SkyDome3D from '../components/SkyDome3D';
import AccelerometerOverlay from '../components/AccelerometerOverlay';
import { OrientationTracker, Orientation } from '../utils/orientationTracker';

interface CameraScreenProps {
  navigation: any;
}

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [orientation, setOrientation] = useState<Orientation>({ pitch: 0, yaw: 0, roll: 0 });
  const [initialOrientation, setInitialOrientation] = useState<Orientation>({ pitch: 0, yaw: 0, roll: 0 });
  const [compassHeading, setCompassHeading] = useState(0);
  const [isPointingUp, setIsPointingUp] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
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

  const handleScanStart = useCallback(() => {
    // Capture the current orientation when scan starts
    setInitialOrientation({ ...orientation });
    setIsScanning(true);
  }, [orientation]);

  const handleScanStop = useCallback(() => {
    setIsScanning(false);
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
        {/* Show either AccelerometerOverlay or SkyDome3D based on scanning state */}
        {!isScanning ? (
          <AccelerometerOverlay onScanStart={handleScanStart} />
        ) : (
          <SkyDome3D 
            orientation={orientation} 
            initialOrientation={initialOrientation}
          />
        )}
        
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

        {/* Reset button - also stops scanning when pressed */}
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={() => {
            orientationTracker.current?.reset();
            handleScanStop();
          }}
        >
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>

        {/* Stop scanning button - only shows when scanning */}
        {isScanning && (
          <TouchableOpacity
            style={styles.stopScanButton}
            onPress={handleScanStop}
          >
            <Text style={styles.stopScanButtonText}>Stop Scan</Text>
          </TouchableOpacity>
        )}
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
  stopScanButton: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  stopScanButtonText: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    textAlign: 'center',
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
