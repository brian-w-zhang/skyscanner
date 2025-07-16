import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

interface AccelerometerOverlayProps {
  onScanStart?: () => void;
}

interface ThresholdState {
  color: string;
  opacity: number;
  message: string;
  status: 'perfect' | 'close' | 'adjust';
}

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
      color = '#18d127ff'; // SpaceX blue instead of green
      opacity = 0.9;
      message = 'READY FOR SKY SCAN';
      status = 'perfect';
    } else if (pitchDegrees <= YELLOW_THRESHOLD && rollDegrees <= YELLOW_THRESHOLD) {
      color = '#FFA500'; // Orange instead of yellow
      opacity = 0.8;
      message = 'TILT UP SLIGHTLY';
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
            {thresholdState.status === 'perfect' ? 'OPTIMAL POSITION' : 
             thresholdState.status === 'close' ? 'ALMOST THERE' : 'NEEDS ADJUSTMENT'}
          </Text>
        </View>
      </View>

      {/* Scan button - positioned under main text box */}
      {isPointingAtSky && onScanStart && (
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={onScanStart}
            activeOpacity={0.8}
          >
            <View style={styles.scanButtonContent}>
              <Ionicons name="camera-outline" size={16} color="white" />
              <Text style={styles.scanButtonText}>START SCAN</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Telemetry panel - bottom left corner */}
      <View style={styles.telemetryContainer}>
        <View style={styles.telemetryPanel}>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel}>PITCH</Text>
            <Text style={styles.telemetryValue}>{pitchValue.toFixed(1)}°</Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel}>ROLL</Text>
            <Text style={styles.telemetryValue}>{rollValue.toFixed(1)}°</Text>
          </View>
        </View>
      </View>
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
  scanButtonContainer: {
    position: 'absolute',
    top: '58%', // Positioned directly under the main text box
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  scanButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  telemetryContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    zIndex: 2,
  },
  telemetryPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  telemetryLabel: {
    color: '#999',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    width: 35,
  },
  telemetryValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginLeft: 8,
  },
});
