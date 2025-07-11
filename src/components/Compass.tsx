// src/components/Compass.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

interface CompassProps {
  style?: any;
  onHeadingChange?: (heading: number) => void;
}

export default function Compass({ style, onHeadingChange }: CompassProps) {
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);
  
  // Smoothing filter buffers
  const magBuffer = useRef<Array<{x: number, y: number, z: number}>>([]);
  const accelBuffer = useRef<Array<{x: number, y: number, z: number}>>([]);
  const headingBuffer = useRef<number[]>([]);
  
  const BUFFER_SIZE = 5; // Adjust for more/less smoothing
  const HEADING_BUFFER_SIZE = 5;

  // Low-pass filter function
  const lowPassFilter = (buffer: Array<{x: number, y: number, z: number}>, newData: {x: number, y: number, z: number}) => {
    buffer.push(newData);
    if (buffer.length > BUFFER_SIZE) {
      buffer.shift();
    }
    
    if (buffer.length === 0) return newData;
    
    const sum = buffer.reduce((acc, data) => ({
      x: acc.x + data.x,
      y: acc.y + data.y,
      z: acc.z + data.z
    }), { x: 0, y: 0, z: 0 });
    
    return {
      x: sum.x / buffer.length,
      y: sum.y / buffer.length,
      z: sum.z / buffer.length
    };
  };

  // Smooth heading changes, handling 360/0 wrap-around
  const smoothHeading = (newHeading: number) => {
    headingBuffer.current.push(newHeading);
    if (headingBuffer.current.length > HEADING_BUFFER_SIZE) {
      headingBuffer.current.shift();
    }
    
    if (headingBuffer.current.length === 1) return newHeading;
    
    // Handle 360/0 degree wrap-around
    let sum = 0;
    let count = 0;
    const first = headingBuffer.current[0];
    
    for (const heading of headingBuffer.current) {
      let diff = heading - first;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      sum += first + diff;
      count++;
    }
    
    let smoothed = sum / count;
    if (smoothed < 0) smoothed += 360;
    if (smoothed >= 360) smoothed -= 360;
    
    return smoothed;
  };

  useEffect(() => {
    const magnetometerSubscription = Magnetometer.addListener((data) => {
      const filtered = lowPassFilter(magBuffer.current, data);
      setMagnetometerData(filtered);
    });

    const accelerometerSubscription = Accelerometer.addListener((data) => {
      const filtered = lowPassFilter(accelBuffer.current, data);
      setAccelerometerData(filtered);
    });

    // Sync update intervals for both sensors
    Magnetometer.setUpdateInterval(50);
    Accelerometer.setUpdateInterval(50);

    return () => {
      magnetometerSubscription && magnetometerSubscription.remove();
      accelerometerSubscription && accelerometerSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Calculate tilt-compensated heading
    const { x: mx, y: my, z: mz } = magnetometerData;
    const { x: ax, y: ay, z: az } = accelerometerData;

    // Check if we have valid sensor data
    if (mx === 0 && my === 0 && mz === 0) return;
    if (ax === 0 && ay === 0 && az === 0) return;

    // Normalize accelerometer data
    const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    if (accelMagnitude === 0) return;
    
    const axNorm = ax / accelMagnitude;
    const ayNorm = ay / accelMagnitude;
    const azNorm = az / accelMagnitude;

    // Calculate roll and pitch from normalized accelerometer
    const roll = Math.atan2(ayNorm, azNorm);
    const pitch = Math.atan2(-axNorm, Math.sqrt(ayNorm * ayNorm + azNorm * azNorm));

    // Tilt compensation for magnetometer readings
    const magX = mx * Math.cos(pitch) + mz * Math.sin(pitch);
    const magY = mx * Math.sin(roll) * Math.sin(pitch) + my * Math.cos(roll) - mz * Math.sin(roll) * Math.cos(pitch);

    // Calculate heading - use your original working formula
    const angle = Math.atan2(-magX, -magY) * (180 / Math.PI);
    const compensatedHeading = (angle + 360) % 360;
    
    // Apply smoothing
    const smoothedHeading = smoothHeading(compensatedHeading);
    const roundedHeading = Math.round(smoothedHeading);
    
    setHeading(roundedHeading);
    
    if (onHeadingChange) {
      onHeadingChange(roundedHeading);
    }
  }, [magnetometerData, accelerometerData, onHeadingChange]);

  const getDirectionText = (heading: number) => {
    if (heading >= 337.5 || heading < 22.5) return 'N';
    if (heading >= 22.5 && heading < 67.5) return 'NE';
    if (heading >= 67.5 && heading < 112.5) return 'E';
    if (heading >= 112.5 && heading < 157.5) return 'SE';
    if (heading >= 157.5 && heading < 202.5) return 'S';
    if (heading >= 202.5 && heading < 247.5) return 'SW';
    if (heading >= 247.5 && heading < 292.5) return 'W';
    if (heading >= 292.5 && heading < 337.5) return 'NW';
    return 'N';
  };

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i * 18);
      const isCardinal = i % 5 === 0;
      const isNorth = i === 0;
      
      ticks.push(
        <View
          key={i}
          style={[
            styles.tick,
            {
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -22 },
              ],
            },
          ]}
        >
          {isNorth ? (
            <Ionicons name="triangle" size={8} color="red" style={styles.redArrow} />
          ) : (
            <View style={[styles.tickLine, isCardinal && styles.cardinalTick]} />
          )}
        </View>
      );
    }
    return ticks;
  };

  return (
    <View style={[styles.compass, style]}>
      <View style={styles.userArrow}>
        <Ionicons name="triangle" size={12} color="white" />
      </View>
      
      <View style={styles.compassCircle}>
        <View style={[styles.tickContainer, { transform: [{ rotate: `${-heading}deg` }] }]}>
          {renderTicks()}
        </View>
        
        <Text style={styles.directionText}>{getDirectionText(heading)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compass: {
    alignItems: 'center',
  },
  userArrow: {
    marginBottom: 5,
  },
  compassCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tickContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tick: {
    position: 'absolute',
    alignItems: 'center',
  },
  tickLine: {
    width: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardinalTick: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 1.5,
  },
  redArrow: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  directionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
