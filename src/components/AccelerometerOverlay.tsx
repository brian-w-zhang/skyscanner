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
      opacity = 0.15;
      message = 'Perfect! Pointing at the sky';
    } else if (pitchDegrees <= YELLOW_THRESHOLD && rollDegrees <= YELLOW_THRESHOLD) {
      color = '#ffff00'; // Yellow - close
      opacity = 0.25;
      message = 'Almost there! Adjust phone slightly';
    } else {
      color = '#ff0000'; // Red - needs adjustment
      opacity = 0.35;
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
      {/* Colored overlay */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: thresholdState.color,
            opacity: thresholdState.opacity,
          },
        ]}
        pointerEvents="none"
      />

      {/* Grid container */}
      <View style={styles.gridContainer} pointerEvents="none">
        {/* Message box */}
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{thresholdState.message}</Text>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gridContainer: {
    position: 'absolute',
    top: '50%',
    left: 40, // Increased padding from the edges
    right: 40, // Increased padding from the edges
    height: 150, // Adjusted height for the grid
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'white',
    zIndex: 2,
    transform: [{ translateY: -75 }], // Center vertically
  },
  messageBox: {
    flex: 2, // Larger area for the message
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'white',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dataRow: {
    flex: 1, // Smaller area for pitch and roll
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10, // Padding between the two boxes
  },
  dataBox: {
    flex: 1, // Equal width for pitch and roll boxes
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5, // Space between the boxes
  },
  dataText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  scanButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  scanButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
