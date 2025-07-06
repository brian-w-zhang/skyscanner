// src/components/Compass.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

interface CompassProps {
  style?: any;
  onHeadingChange?: (heading: number) => void; // Add this line
}

export default function Compass({ style, onHeadingChange }: CompassProps) {
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    const magnetometerSubscription = Magnetometer.addListener((data) => {
      setMagnetometerData(data);
    });

    const accelerometerSubscription = Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });

    // Set update intervals
    Magnetometer.setUpdateInterval(100);
    Accelerometer.setUpdateInterval(100);

    return () => {
      magnetometerSubscription && magnetometerSubscription.remove();
      accelerometerSubscription && accelerometerSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // Calculate tilt-compensated heading
    const { x: mx, y: my, z: mz } = magnetometerData;
    const { x: ax, y: ay, z: az } = accelerometerData;

    // Calculate roll and pitch from accelerometer
    const roll = Math.atan2(ay, az);
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));

    // Tilt compensation for magnetometer readings
    const magX = mx * Math.cos(pitch) + mz * Math.sin(pitch);
    const magY = mx * Math.sin(roll) * Math.sin(pitch) + my * Math.cos(roll) - mz * Math.sin(roll) * Math.cos(pitch);

    // Use your original working formula - just with tilt-compensated values and flipped Y
    const angle = Math.atan2(-magX, -magY) * (180 / Math.PI);
    const compensatedHeading = (angle + 360) % 360;
    
    const roundedHeading = Math.round(compensatedHeading);
    setHeading(roundedHeading);
    
    // Add this line to export the heading
    if (onHeadingChange) {
      onHeadingChange(roundedHeading);
    }
  }, [magnetometerData, accelerometerData, onHeadingChange]); // Add onHeadingChange to dependency array

  // Rest of your code stays exactly the same...
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

// Your styles stay exactly the same
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
