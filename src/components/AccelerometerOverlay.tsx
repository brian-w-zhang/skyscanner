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
}

export default function AccelerometerOverlay({ onScanStart }: AccelerometerOverlayProps) {
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [thresholdState, setThresholdState] = useState<ThresholdState>({
    color: '#ff0000',
    opacity: 0.35,
    message: 'Point camera straight up at the sky',
  });

  useEffect(() => {
    const subscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });

    Accelerometer.setUpdateInterval(100); // 10 FPS

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
    const GREEN_THRESHOLD = 20; // Within 20 degrees = green
    const YELLOW_THRESHOLD = 60; // Within 60 degrees = yellow
    // Above 60 degrees = red

    // Determine overall state
    let color: string;
    let opacity: number;
    let message: string;

    if (pitchDegrees <= GREEN_THRESHOLD && rollDegrees <= GREEN_THRESHOLD) {
      color = '#00ff00'; // Green - perfect
      opacity = 0.8;
      message = 'Perfect! Pointing at the sky';
    } else if (pitchDegrees <= YELLOW_THRESHOLD && rollDegrees <= YELLOW_THRESHOLD) {
      color = '#ffff00'; // Yellow - close
      opacity = 0.7;
      message = 'Almost there! Adjust phone slightly';
    } else {
      color = '#ff0000'; // Red - needs adjustment
      opacity = 0.6;
      message = 'Point camera straight up at the sky';
    }

    setThresholdState({
      color,
      opacity,
      message,
    });
  }, [accelerometerData]);

  // Check if user is pointing at sky (green state)
  const isPointingAtSky = thresholdState.color === '#00ff00';

  return (
    <>
      {/* Grid container with colored border glow */}
      <View 
        style={[
          styles.gridContainer,
          {
            borderColor: thresholdState.color,
            shadowColor: thresholdState.color,
            shadowOpacity: thresholdState.opacity,
          }
        ]} 
        pointerEvents="none"
      >
        {/* Message box */}
        <View style={[styles.messageBox, { borderBottomColor: thresholdState.color }]}>
          <Text style={styles.messageText}>{thresholdState.message}</Text>
        </View>

        {/* Debug label */}
        <View style={styles.debugLabelContainer}>
          <Text style={styles.debugLabelText}>Accelerometer debug info</Text>
        </View>

        {/* Pitch and roll boxes */}
        <View style={styles.dataRow}>
          <View style={styles.dataBox}>
            <Text style={styles.dataText}>
              Pitch: {Math.abs(Math.atan2(-accelerometerData.y, Math.sqrt(accelerometerData.x * accelerometerData.x + accelerometerData.z * accelerometerData.z)) * (180 / Math.PI)).toFixed(1)}°
            </Text>
          </View>
          <View style={styles.dataBox}>
            <Text style={styles.dataText}>
              Roll: {Math.abs(Math.atan2(accelerometerData.x, accelerometerData.z) * (180 / Math.PI)).toFixed(1)}°
            </Text>
          </View>
        </View>
      </View>

      {/* Scan button - only shows when pointing at sky */}
      {isPointingAtSky && onScanStart && (
        <View style={styles.scanButtonContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.scanButton}
            onPress={onScanStart}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>Start Sky Scan</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    position: 'absolute',
    top: '50%',
    left: 40,
    right: 40,
    height: 180, // Increased height to accommodate the new row
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    borderWidth: 3, // Increased border width for better visibility
    zIndex: 2,
    transform: [{ translateY: -90 }], // Adjusted to center the taller container
    // Shadow properties for the glow effect
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 20, // Larger radius for more pronounced glow
    elevation: 20, // For Android shadow
  },
  messageBox: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  debugLabelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  debugLabelText: {
    color: 'white',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dataRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dataBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  dataText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 270,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  scanButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  scanButtonText: {
    color: 'white', // White text
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center', // Center text
  },
});
