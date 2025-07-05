import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface BlurryButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;

}

export default function BlurryButton({ title, onPress, style, icon }: BlurryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.buttonContainer, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <BlurView
        style={styles.blurView}
        intensity={70}
        tint="dark"
      >
        <View style={styles.overlay}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color="white" 
              style={styles.icon}
            />
          )}
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  blurView: {
    borderRadius: 12,
  },
  icon: {
    marginRight: 8,
  },
  overlay: {
    backgroundColor: 'rgba(25, 25, 30, 0.1)', // Lighter overlay since expo-blur is stronger
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
