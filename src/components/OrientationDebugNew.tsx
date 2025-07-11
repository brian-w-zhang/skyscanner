import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Orientation } from '../utils/orientationTracker';

interface OrientationDebugProps {
  orientation: Orientation;
  isPointingUp: boolean;
}

export default function OrientationDebugNew({ orientation, isPointingUp }: OrientationDebugProps) {
  const pitchDegrees = orientation.pitch * (180 / Math.PI);
  const yawDegrees = orientation.yaw * (180 / Math.PI);
  const rollDegrees = orientation.roll * (180 / Math.PI);

  const getOrientationDescription = () => {
    if (pitchDegrees > 60) return "Pointing DOWN";
    if (pitchDegrees < -30) return "Pointing UP";
    if (Math.abs(pitchDegrees) < 15) return "Pointing AHEAD";
    return "Tilted";
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gyroscope Orientation</Text>
      
      <Text style={styles.sectionTitle}>Rotation (degrees)</Text>
      <Text style={styles.text}>Pitch: {pitchDegrees.toFixed(1)}°</Text>
      <Text style={styles.text}>Yaw: {yawDegrees.toFixed(1)}°</Text>
      <Text style={styles.text}>Roll: {rollDegrees.toFixed(1)}°</Text>
      
      <Text style={[styles.text, styles.description]}>{getOrientationDescription()}</Text>
      <Text style={[styles.text, { color: isPointingUp ? '#00ff00' : '#ff0000' }]}>
        Sky Visible: {isPointingUp ? 'YES' : 'NO'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 2,
    minWidth: 170,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionTitle: {
    color: '#00ccff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 5,
    marginBottom: 2,
  },
  text: {
    color: 'white',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  description: {
    color: '#00ff00',
    fontWeight: 'bold',
    marginTop: 5,
  },
});
