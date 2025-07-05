import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Ellipse, Rect } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SkyDomeOverlayProps {
  isPointingUp: boolean;
}

export default function SkyDomeOverlay({ isPointingUp }: SkyDomeOverlayProps) {
  // Dome dimensions - positioned at the top of the screen
  const domeWidth = screenWidth * 0.8;
  const domeHeight = screenHeight * 0.4;
  const domeX = screenWidth * 0.1; // Center horizontally
  const domeY = -domeHeight * 0.3; // Position at top, slightly above screen

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={screenWidth} height={screenHeight} style={styles.svg}>
        <Defs>
          {/* Gradient for the dome area */}
          <RadialGradient id="domeGradient" cx="50%" cy="100%" r="60%">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <Stop offset="70%" stopColor="rgba(255, 255, 255, 0)" />
            <Stop offset="100%" stopColor="rgba(0, 0, 0, 0.7)" />
          </RadialGradient>
          
          {/* Gradient for dimmed areas */}
          <RadialGradient id="dimGradient" cx="50%" cy="0%" r="80%">
            <Stop offset="0%" stopColor="rgba(0, 0, 0, 0)" />
            <Stop offset="60%" stopColor="rgba(0, 0, 0, 0.5)" />
            <Stop offset="100%" stopColor="rgba(0, 0, 0, 0.7)" />
          </RadialGradient>
        </Defs>
        
        {/* Full screen dim overlay */}
        <Rect
          x={0}
          y={0}
          width={screenWidth}
          height={screenHeight}
          fill="rgba(0, 0, 0, 0.6)"
        />
        
        {/* Clear dome area at the top */}
        <Ellipse
          cx={screenWidth / 2}
          cy={domeY + domeHeight}
          rx={domeWidth / 2}
          ry={domeHeight}
          fill="url(#domeGradient)"
        />
        
        {/* Dome border indicator */}
        <Ellipse
          cx={screenWidth / 2}
          cy={domeY + domeHeight}
          rx={domeWidth / 2}
          ry={domeHeight}
          fill="none"
          stroke={isPointingUp ? '#00ff00' : '#ffffff'}
          strokeWidth={2}
          strokeOpacity={0.8}
          strokeDasharray="5,5"
        />
      </Svg>
    </View>
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
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
