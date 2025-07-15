import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';

interface AccelerometerOverlayProps {
  onScanStart?: () => void;
}

interface ThresholdState {
  color: string;
  opacity: number;
  message: string;
  status: 'perfect' | 'close' | 'adjust';
}

// Simple camera icon component
const CameraIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <View style={[styles.cameraIcon, { width: size, height: size, borderColor: color }]}>
    <View style={[styles.cameraLens, { backgroundColor: color }]} />
  </View>
);

export default function AccelerometerOverlay({ onScanStart }: AccelerometerOverlayProps) {
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [thresholdState, setThresholdState] = useState<ThresholdState>({
    color: '#ff0000',
    opacity: 0.35,
    message: 'Point camera straight up at the sky',
    status: 'adjust',
  });

  useEffect(() => {
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });

    Accelerometer.setUpdateInterval(100);

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Calculate pitch and roll
    const pitch = Math.atan2(-accelerometerData.y, Math.sqrt(accelerometerData.x * accelerometerData.x + accelerometerData.z * accelerometerData.z));
    const roll = Math.atan2(accelerometerData.x, accelerometerData.z);

    const pitchDegrees = Math.abs(pitch * (180 / Math.PI));
    const rollDegrees = Math.abs(roll * (180 / Math.PI));

    // Define thresholds
    const GREEN_THRESHOLD = 20;
    const YELLOW_THRESHOLD = 60;

    // Determine overall state
    let color: string;
    let opacity: number;
    let message: string;
    let status: 'perfect' | 'close' | 'adjust';

    if (pitchDegrees <= GREEN_THRESHOLD && rollDegrees <= GREEN_THRESHOLD) {
      color = '#00D4FF'; // SpaceX blue instead of green
      opacity = 0.9;
      message = 'READY FOR SKY SCAN';
      status = 'perfect';
    } else if (pitchDegrees <= YELLOW_THRESHOLD && rollDegrees <= YELLOW_THRESHOLD) {
      color = '#FFA500'; // Orange instead of yellow
      opacity = 0.8;
      message = 'ADJUST ORIENTATION';
      status = 'close';
    } else {
      color = '#FF4444'; // Softer red
      opacity = 0.7;
      message = 'POINT CAMERA UPWARD';
      status = 'adjust';
    }

    setThresholdState({
      color,
      opacity,
      message,
      status,
    });
  }, [accelerometerData]);

  // Check if user is pointing at sky (perfect state)
  const isPointingAtSky = thresholdState.status === 'perfect';

  // Calculate pitch and roll values for display
  const pitchValue = Math.abs(Math.atan2(-accelerometerData.y, Math.sqrt(accelerometerData.x * accelerometerData.x + accelerometerData.z * accelerometerData.z)) * (180 / Math.PI));
  const rollValue = Math.abs(Math.atan2(accelerometerData.x, accelerometerData.z) * (180 / Math.PI));

  return (
    <>
      {/* Main orientation indicator */}
      <View style={styles.orientationContainer}>
        <View 
          style={[
            styles.orientationIndicator,
            {
              borderColor: thresholdState.color,
              shadowColor: thresholdState.color,
              shadowOpacity: thresholdState.opacity,
            }
          ]}
        >
          {/* Message */}
          <Text style={styles.orientationMessage}>{thresholdState.message}</Text>
          
          {/* Status text */}
          <Text style={[styles.statusText, { color: thresholdState.color }]}>
            {thresholdState.status === 'perfect' ? 'OPTIMAL' : 
             thresholdState.status === 'close' ? 'CLOSE' : 'ADJUST'}
          </Text>
        </View>
      </View>

      {/* Telemetry panel - compact version */}
      <View style={styles.telemetryContainer}>
        <View style={styles.telemetryPanel}>
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>PITCH</Text>
              <Text style={styles.telemetryValue}>{pitchValue.toFixed(1)}°</Text>
            </View>
            
            <View style={styles.telemetryDivider} />
            
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>ROLL</Text>
              <Text style={styles.telemetryValue}>{rollValue.toFixed(1)}°</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Scan button - only shows when pointing at sky */}
      {isPointingAtSky && onScanStart && (
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity
            style={[
              styles.scanButton,
              {
                borderColor: thresholdState.color,
                shadowColor: thresholdState.color,
              }
            ]}
            onPress={onScanStart}
            activeOpacity={0.8}
          >
            <View style={styles.scanButtonContent}>
              <CameraIcon color={thresholdState.color} size={18} />
              <Text style={styles.scanButtonText}>INITIATE SKY SCAN</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  orientationContainer: {
    position: 'absolute',
    top: '45%',
    left: 40,
    right: 40,
    alignItems: 'center',
    zIndex: 3,
  },
  orientationIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 280,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 15,
  },
  orientationMessage: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  telemetryContainer: {
    position: 'absolute',
    top: '58%',
    left: 40,
    right: 40,
    alignItems: 'center',
    zIndex: 2,
  },
  telemetryPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 200,
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 16,
  },
  telemetryLabel: {
    color: '#999',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  telemetryValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  scanButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 12,
  },
  cameraIcon: {
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraLens: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
