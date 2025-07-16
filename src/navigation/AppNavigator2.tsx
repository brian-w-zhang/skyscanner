import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen2';
import CameraScreen from '../screens/CameraScreen';
import CameraScreen2 from '../screens/CameraScreen2';
import GalleryScreen from '../screens/GalleryScreen';
import GalleryScreen2 from '../screens/GalleryScreen2';
import ObstructionScreen from '../screens/ObstructionScreen';
import { PhotoData } from '../utils/photoDataRecorder';

// Define the parameter list for type safety
export type RootStackParamList = {
  Home: undefined;
  CameraScreen: undefined;
  CameraScreen2: undefined;
  GalleryScreen: { videoUri: string };
  GalleryScreen2: { 
    photoUris: string[]; 
    photoData: PhotoData[];
    glbPath?: string;  // Local GLB file path
    streamUrl?: string; // Stream URL for Three.js
  };
  ObstructionScreen: { 
    glbPath?: string;
    streamUrl?: string;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CameraScreen" 
          component={CameraScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CameraScreen2" 
          component={CameraScreen2} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="GalleryScreen" 
          component={GalleryScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="GalleryScreen2" 
          component={GalleryScreen2} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ObstructionScreen" 
          component={ObstructionScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
