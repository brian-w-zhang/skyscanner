// src/components/OrientationDebug.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OrientationDebugProps {
  accelerometerData: { x: number; y: number; z: number };
  magnetometerData: { x: number; y: number; z: number };
  gyroscopeData: { x: number; y: number; z: number };
  compassHeading: number;
}

export default function OrientationDebug({ 
  accelerometerData, 
  magnetometerData, 
  gyroscopeData, 
  compassHeading 
}: OrientationDebugProps) {
  const { x: ax, y: ay, z: az } = accelerometerData;
  const { x: gx, y: gy, z: gz } = gyroscopeData;
  
  // Calculate pitch and roll from accelerometer
  const pitch = Math.atan2(-ay, Math.sqrt(ax * ax + az * az));
  const roll = Math.atan2(ax, az);
  
  const pitchDegrees = pitch * (180 / Math.PI);
  const rollDegrees = roll * (180 / Math.PI);
  
  const getOrientationDescription = () => {
    if (pitchDegrees > 60) return "Pointing DOWN";
    if (pitchDegrees < -60) return "Pointing UP";
    if (pitchDegrees > -30 && pitchDegrees < 30) return "Pointing AHEAD";
    return "Tilted";
  };

  const getCompassDirection = () => {
    if (compassHeading >= 337.5 || compassHeading < 22.5) return 'N';
    if (compassHeading >= 22.5 && compassHeading < 67.5) return 'NE';
    if (compassHeading >= 67.5 && compassHeading < 112.5) return 'E';
    if (compassHeading >= 112.5 && compassHeading < 157.5) return 'SE';
    if (compassHeading >= 157.5 && compassHeading < 202.5) return 'S';
    if (compassHeading >= 202.5 && compassHeading < 247.5) return 'SW';
    if (compassHeading >= 247.5 && compassHeading < 292.5) return 'W';
    if (compassHeading >= 292.5 && compassHeading < 337.5) return 'NW';
    return 'N';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hybrid Orientation</Text>
      
      <Text style={styles.sectionTitle}>Accelerometer</Text>
      <Text style={styles.text}>Pitch: {pitchDegrees.toFixed(1)}°</Text>
      <Text style={styles.text}>Roll: {rollDegrees.toFixed(1)}°</Text>
      
      <Text style={styles.sectionTitle}>Gyroscope</Text>
      <Text style={styles.text}>X: {gx.toFixed(2)} rad/s</Text>
      <Text style={styles.text}>Y: {gy.toFixed(2)} rad/s</Text>
      <Text style={styles.text}>Z: {gz.toFixed(2)} rad/s</Text>
      
      <Text style={styles.sectionTitle}>Compass</Text>
      <Text style={styles.text}>Heading: {compassHeading.toFixed(0)}°</Text>
      <Text style={styles.text}>Direction: {getCompassDirection()}</Text>
      
      <Text style={[styles.text, styles.description]}>{getOrientationDescription()}</Text>
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
