import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AccelerometerDebugProps {
  data: { x: number; y: number; z: number };
  isPointingUp: boolean;
}

export default function AccelerometerDebug({ data, isPointingUp }: AccelerometerDebugProps) {
  // Calculate pitch and roll correctly
  // Based on your observations:
  // - Phone pointing up at sky: pitch ~0, roll ~0
  // - Phone face up on table: pitch ~0, roll ~180
  
  const pitch = Math.atan2(-data.y, Math.sqrt(data.x * data.x + data.z * data.z));
  const roll = Math.atan2(data.x, data.z);
  
  const pitchDegrees = pitch * (180 / Math.PI);
  const rollDegrees = roll * (180 / Math.PI);

  // Determine if pointing up at sky
  // When pointing up: pitch close to 0, roll close to 0
  // Allow some tolerance for the "dome" area
  const isPitchNearZero = Math.abs(pitchDegrees) < 30; // Within 30 degrees of 0
  const isRollNearZero = Math.abs(rollDegrees) < 45; // Within 45 degrees of 0
  
  const pointingUp = isPitchNearZero && isRollNearZero;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accelerometer Debug</Text>
      <Text style={styles.text}>X: {data.x.toFixed(2)}</Text>
      <Text style={styles.text}>Y: {data.y.toFixed(2)}</Text>
      <Text style={styles.text}>Z: {data.z.toFixed(2)}</Text>
      <Text style={styles.text}>Pitch: {pitchDegrees.toFixed(1)}°</Text>
      <Text style={styles.text}>Roll: {rollDegrees.toFixed(1)}°</Text>
      <Text style={styles.text}>Pitch Near 0: {isPitchNearZero ? 'YES' : 'NO'}</Text>
      <Text style={styles.text}>Roll Near 0: {isRollNearZero ? 'YES' : 'NO'}</Text>
      <Text style={[styles.text, { color: pointingUp ? '#00ff00' : '#ff0000' }]}>
        Pointing Up: {pointingUp ? 'YES' : 'NO'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 180,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    zIndex: 2,
    minWidth: 150,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
