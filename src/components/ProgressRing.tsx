import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number; // 0-100 percentage
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8 
}: ProgressRingProps) {
  // Memoize all calculations to prevent recalculation on every render
  const ringData = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    // Round progress to nearest 5% to reduce unnecessary updates
    const roundedProgress = Math.round(progress / 5) * 5;
    const strokeDashoffset = circumference - (roundedProgress / 100) * circumference;
    
    return {
      radius,
      circumference,
      strokeDashoffset,
      displayProgress: Math.round(roundedProgress)
    };
  }, [progress, size, strokeWidth]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringData.radius}
          stroke="#000000"
          strokeWidth={strokeWidth}
          fill="none"
          strokeOpacity={0.8}
        />
        
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={ringData.radius}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={ringData.circumference}
          strokeDashoffset={ringData.strokeDashoffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeOpacity={0.9}
        />
      </Svg>
      
      {/* Percentage text */}
      <View style={styles.textContainer}>
        <Text style={styles.percentageText}>
          {ringData.displayProgress}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
