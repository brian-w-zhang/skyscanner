import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Compass from '../components/Compass';
import SkyDome3D from '../components/SkyDome3D';
import AccelerometerOverlay from '../components/AccelerometerOverlay';
import ProgressRing from '../components/ProgressRing';
import { OrientationTracker, Orientation } from '../utils/orientationTracker';
import { ScanTracker, ScanCoverage } from '../utils/scanTracker';
import { PhotoDataRecorder, PhotoData } from '../utils/photoDataRecorder';
import { ActivityIndicator } from 'react-native';
import { FlaskService, FlaskResponse } from '../utils/flaskService';
import * as FileSystem from 'expo-file-system';
// import { FLASK_SERVER_URL } from '@env';


interface CameraScreen2Props {
  navigation: any;
}

export default function CameraScreen2({ navigation }: CameraScreen2Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [orientation, setOrientation] = useState<Orientation>({ pitch: 0, yaw: 0, roll: 0 });
  const [initialOrientation, setInitialOrientation] = useState<Orientation>({ pitch: 0, yaw: 0, roll: 0 });
  const [compassHeading, setCompassHeading] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isSkyDomeLoaded, setIsSkyDomeLoaded] = useState(false);
  const [scanCoverage, setScanCoverage] = useState<ScanCoverage>({ totalCoverage: 0, scannedPoints: [] });
  const [photoCount, setPhotoCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); // New state for processing
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const orientationTracker = useRef<OrientationTracker | null>(null);
  const scanTracker = useRef<ScanTracker | null>(null);
  const photoRecorder = useRef<PhotoDataRecorder | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const photoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const photoUrisRef = useRef<string[]>([]);
  const isMountedRef = useRef<boolean>(true);
  const isCapturingRef = useRef<boolean>(false);
  
  // Store current orientation in a ref so it's always accessible
  const currentOrientationRef = useRef<Orientation>({ pitch: 0, yaw: 0, roll: 0 });

  // Create stable refs for callbacks with proper initial values
  const handleOrientationChangeRef = useRef<(orientation: Orientation) => void>(() => {});
  const handleScanCoverageChangeRef = useRef<(coverage: ScanCoverage) => void>(() => {});

  const flaskService = useRef<FlaskService>(new FlaskService('http://192.168.1.103:5002'));
  
  const handleOrientationChange = useCallback((newOrientation: Orientation) => {
    setOrientation(newOrientation);
    // Update the ref so it's always current
    currentOrientationRef.current = newOrientation;

    // Only update scan tracking if scanning is active AND sky dome is loaded
    if (isScanning && isSkyDomeLoaded && scanTracker.current) {
      scanTracker.current.updateOrientation(newOrientation);
    }
  }, [isScanning, isSkyDomeLoaded]);

  const handleScanCoverageChange = useCallback((coverage: ScanCoverage) => {
    setScanCoverage(coverage);
  }, []);

  const handleHeadingChange = useCallback((heading: number) => {
    setCompassHeading(heading);
  }, []);

  const handleSkyDomeLoaded = useCallback(() => {
    setIsSkyDomeLoaded(true);
  }, []);

  const takePhoto = useCallback(async () => {
    // Check if component is still mounted and camera is available
    if (!isMountedRef.current || !cameraRef.current || isCapturingRef.current) {
      return;
    }

    // Check if photo recorder is available and recording
    if (!photoRecorder.current || !photoRecorder.current.isCurrentlyRecording()) {
      return;
    }

    // Set capturing flag to prevent concurrent photo captures
    isCapturingRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        imageType: 'jpg',
        shutterSound: false,
      });
      
      // Double-check we're still mounted after async operation
      if (!isMountedRef.current) {
        return;
      }
      
      if (photo?.uri) {
        photoUrisRef.current.push(photo.uri);
        
        // Pass the current orientation from the orientation tracker
        photoRecorder.current.recordPhotoData(photo.uri, currentOrientationRef.current);
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setPhotoCount(photoRecorder.current.getCurrentPhotoCount());
        }
      }
    } catch (error) {
      // Only log error if component is still mounted (to avoid logging unmount errors)
      if (isMountedRef.current) {
        console.error('Error taking photo:', error);
      }
    } finally {
      // Reset capturing flag
      isCapturingRef.current = false;
    }
  }, []);

  const startPhotoCapture = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      // Log the time right before starting photo recording
      const photoStartLogTime = Date.now();
      console.log('⏱️ About to start photo data recording at:', photoStartLogTime);

      // Start photo data recording
      if (photoRecorder.current) {
        try {
          console.log('📱 Starting photo data recording...');
          await photoRecorder.current.startRecording();
          console.log('✅ Photo data recording started successfully');
        } catch (error) {
          console.error('❌ Failed to start photo data recording:', error);
          return;
        }
      } else {
        console.error('❌ photoRecorder.current is null');
        return;
      }

      // Clear previous photo URIs
      photoUrisRef.current = [];
      setPhotoCount(0);

      // Start taking photos every 200ms
      photoIntervalRef.current = setInterval(() => {
        // Only take photo if component is still mounted
        if (isMountedRef.current) {
          takePhoto();
        }
      }, 200);

      console.log('✅ Photo capture started');
    } catch (error) {
      console.error('Error starting photo capture:', error);
    }
  }, [takePhoto]);

  const stopPhotoCapture = useCallback(async () => {
    // Stop the photo interval immediately
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }

    // Wait for any ongoing photo capture to complete
    let tries = 0;
    while (
      isCapturingRef.current ||
      (photoRecorder.current &&
        photoUrisRef.current.length > photoRecorder.current.getCurrentPhotoCount() &&
        tries < 20)
    ) {
      await new Promise(resolve => setTimeout(resolve, 100));
      tries++;
    }

    // Stop photo data recording and get data
    let photoData: PhotoData[] = [];
    if (photoRecorder.current) {
      photoData = photoRecorder.current.stopRecording();
    }

    // Navigate to Gallery screen with the photo URIs and data (only if mounted)
    if (isMountedRef.current) {
      setTimeout(() => {
        if (isMountedRef.current) {
          navigation.replace('GalleryScreen2', { 
            photoUris: photoUrisRef.current,
            photoData: photoData
          });
        }
      }, 500);
    }
  }, [navigation]);

  const handleScanStart = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Reset the orientation tracker first to zero out any accumulated values
    orientationTracker.current?.reset();
    
    // Set initial orientation to zero since we just reset
    setInitialOrientation({ pitch: 0, yaw: 0, roll: 0 });
    currentOrientationRef.current = { pitch: 0, yaw: 0, roll: 0 };
    
    // Reset scan tracker
    scanTracker.current?.reset();
    
    // Reset sky dome loaded state
    setIsSkyDomeLoaded(false);
    
    // Start scanning
    setIsScanning(true);
    
    // Start photo capture
    await startPhotoCapture();
  }, [startPhotoCapture]);

  // old version pre flask integration
  // const handleScanStop = useCallback(async () => {
  //   // Prevent multiple calls
  //   if (!isScanning || !isMountedRef.current || isProcessing) {
  //     console.log('⚠️ handleScanStop called but not scanning or unmounted or already processing, ignoring...');
  //     return;
  //   }

  //   console.log('🛑 handleScanStop starting...');
    
  //   // Show processing loader immediately
  //   setIsProcessing(true);
    
  //   // Update the React state after stopping the recorder
  //   setIsScanning(false);
  //   setIsSkyDomeLoaded(false);
    
  //   // Stop photo capture
  //   await stopPhotoCapture();
    
  //   console.log('🛑 handleScanStop completed');
  // }, [isScanning, stopPhotoCapture, isProcessing]);

  const handleScanStop = useCallback(async () => {
    // Prevent multiple calls
    if (!isScanning || !isMountedRef.current || isProcessing) {
      console.log('⚠️ handleScanStop called but not scanning or unmounted or already processing, ignoring...');
      return;
    }

    console.log('🛑 handleScanStop starting...');
    
    // Show processing loader immediately
    setIsProcessing(true);
    setProcessingStatus('Stopping photo capture...');
    
    // Update the React state after stopping the recorder
    setIsScanning(false);
    setIsSkyDomeLoaded(false);
    
    // Stop photo capture and get data
    setProcessingStatus('Processing photos...');
    
    // Stop the photo interval immediately
    if (photoIntervalRef.current) {
      clearInterval(photoIntervalRef.current);
      photoIntervalRef.current = null;
    }

    // Wait for any ongoing photo capture to complete
    let tries = 0;
    while (
      isCapturingRef.current ||
      (photoRecorder.current &&
        photoUrisRef.current.length > photoRecorder.current.getCurrentPhotoCount() &&
        tries < 20)
    ) {
      await new Promise(resolve => setTimeout(resolve, 100));
      tries++;
    }

    // Stop photo data recording and get data
    let photoData: PhotoData[] = [];
    if (photoRecorder.current) {
      photoData = photoRecorder.current.stopRecording();
    }

    console.log('📊 Photo data for Flask processing:', JSON.stringify(photoData, null, 2));
    
    // Process photos with Flask
    setProcessingStatus('Uploading to server...');
    
    try {
      // Check Flask server health first
      const isHealthy = await flaskService.current.healthCheck();
      if (!isHealthy) {
        throw new Error('Flask server is not responding. Make sure it\'s running.');
      }

      setProcessingStatus('Generating 3D model...');
      
      const result: FlaskResponse = await flaskService.current.generateGLB(
        photoUrisRef.current,
        photoData
      );

      if (result.success && result.download_url && result.session_id) {
        console.log('✅ GLB model generated successfully!');
        console.log('🆔 Session ID:', result.session_id);
        
        // No need to download - just navigate with stream URL
        navigation.replace('GalleryScreen2', { 
          photoUris: photoUrisRef.current,
          photoData: photoData,
          streamUrl: flaskService.current.getStreamUrl(result.session_id)
        });
      }
      
    } catch (error) {
      console.error('❌ Flask processing error:', error);
      
      // Show error to user
      setProcessingStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Wait a bit then navigate to gallery anyway
      setTimeout(() => {
        navigation.replace('GalleryScreen2', { 
          photoUris: photoUrisRef.current,
          photoData: photoData
        });
      }, 2000);
      
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
    
    console.log('🛑 handleScanStop completed');
  }, [isScanning, isProcessing, navigation]);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update refs when callbacks change
  useEffect(() => {
    handleOrientationChangeRef.current = handleOrientationChange;
  }, [handleOrientationChange]);

  useEffect(() => {
    handleScanCoverageChangeRef.current = handleScanCoverageChange;
  }, [handleScanCoverageChange]);

  // Initialize photo recorder ONCE - no dependencies
  useEffect(() => {
    photoRecorder.current = new PhotoDataRecorder();
    
    return () => {
      if (photoRecorder.current) {
        photoRecorder.current.destroy();
      }
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
        photoIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize orientation tracker with stable callback - runs once
  useEffect(() => {
    orientationTracker.current = new OrientationTracker((orientation) => {
      handleOrientationChangeRef.current(orientation);
    });
    orientationTracker.current.start();

    return () => {
      orientationTracker.current?.stop();
    };
  }, []); // Only run once since we use ref

  // Initialize scan tracker with stable callback - runs once
  useEffect(() => {
    scanTracker.current = new ScanTracker((coverage) => {
      handleScanCoverageChangeRef.current(coverage);
    });
  }, []); // Only run once since we use ref

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
      <CameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing="back" 
        flash="off"
        animateShutter={false}
      />
      
      {/* All overlays moved outside CameraView with absolute positioning */}
      
      {/* Show processing loader, or AccelerometerOverlay, or SkyDome3D based on state */}
      {isProcessing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : !isScanning ? (
        <AccelerometerOverlay onScanStart={handleScanStart} />
      ) : (
        <>
          {!isSkyDomeLoaded && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
          <SkyDome3D
            orientation={orientation}
            initialOrientation={initialOrientation}
            onLoaded={handleSkyDomeLoaded}
          />
        </>
      )}
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        {/* Photo indicator */}
        {isScanning && (
          <View style={styles.photoIndicator}>
            <Ionicons name="camera" size={16} color="white" />
            <Text style={styles.photoText}>{photoCount}</Text>
          </View>
        )}
      </View>
      
      {/* Progress Ring - only show when scanning AND sky dome is loaded */}
      {isScanning && isSkyDomeLoaded && (
        <View style={styles.progressRingContainer}>
          <ProgressRing progress={scanCoverage.totalCoverage} size={100} strokeWidth={8} />
        </View>
      )}
      
      <View style={styles.compassContainer}>
        <Compass onHeadingChange={handleHeadingChange} />
      </View>

      {/* Stop scanning button - only shows when scanning */}
      {isScanning && isSkyDomeLoaded && (
        <TouchableOpacity
          style={styles.stopScanButton}
          onPress={handleScanStop}
        >
          <Text style={styles.stopScanButtonText}>STOP SCAN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(23, 23, 23)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.8)',
  },
  camera: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.8)',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  photoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
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
  stopScanButton: {
    position: 'absolute',
    bottom: 310,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  stopScanButtonText: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
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
  loaderContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 3,
  },
  processingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});
