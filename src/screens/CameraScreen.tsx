import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Compass from '../components/Compass';
import OrientationDebugNew from '../components/OrientationDebugNew';
import SkyDome3D from '../components/SkyDome3D';
import AccelerometerOverlay from '../components/AccelerometerOverlay';
import ProgressRing from '../components/ProgressRing';
import { OrientationTracker, Orientation } from '../utils/orientationTracker';
import { ScanTracker, ScanCoverage } from '../utils/scanTracker';

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
  const [scanCoverage, setScanCoverage] = useState<ScanCoverage>({ totalCoverage: 0, scannedPoints: [] });
  
  const orientationTracker = useRef<OrientationTracker | null>(null);
  const scanTracker = useRef<ScanTracker | null>(null);

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

    // Update scan tracking if scanning is active
    if (isScanning && scanTracker.current) {
      scanTracker.current.updateOrientation(newOrientation);
    }
  }, [calculatePointingUp, isScanning]);

  const handleScanCoverageChange = useCallback((coverage: ScanCoverage) => {
    setScanCoverage(coverage);
  }, []);

  const handleHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
  }, []);

  const handleScanStart = useCallback(() => {
    // Reset the orientation tracker first to zero out any accumulated values
    orientationTracker.current?.reset();
    
    // Set initial orientation to zero since we just reset
    setInitialOrientation({ pitch: 0, yaw: 0, roll: 0 });
    
    // Reset scan tracker
    scanTracker.current?.reset();
    
    // Start scanning
    setIsScanning(true);
  }, []);

  const handleScanStop = useCallback(() => {
    setIsScanning(false);
  }, []);

  useEffect(() => {
    // Initialize orientation tracker
    orientationTracker.current = new OrientationTracker(handleOrientationChange);
    orientationTracker.current.start();

    // Initialize scan tracker
    scanTracker.current = new ScanTracker(handleScanCoverageChange);

    return () => {
      orientationTracker.current?.stop();
    };
  }, [handleOrientationChange, handleScanCoverageChange]);

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
      <CameraView style={styles.camera} facing="back" />
      
      {/* All overlays moved outside CameraView with absolute positioning */}
      
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
      
      {/* Progress Ring - only show when scanning */}
      {isScanning && (
        <View style={styles.progressRingContainer}>
          <ProgressRing progress={scanCoverage.totalCoverage} size={100} strokeWidth={8} />
        </View>
      )}
      
      {/* New Orientation Debug */}
      {/* <OrientationDebugNew 
        orientation={orientation}
        isPointingUp={isPointingUp}
      /> */}
      
      <View style={styles.compassContainer}>
        <Compass onHeadingChange={handleHeadingChange} />
      </View>

      {/* Reset button - also stops scanning when pressed */}
      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={() => {
          orientationTracker.current?.reset();
          scanTracker.current?.reset();
          handleScanStop();
        }}
      >
        <Text style={styles.resetButtonText}>Reset Gyroscope (debug only)</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(23, 23, 23)', // Changed from white to grey
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.8)', // Add grey background here too
  },
  camera: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.8)', // Add grey background to camera view
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
  progressRingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 2,
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
    bottom: 270,
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
