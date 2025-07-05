import React from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BlurryButton from '../components/BlurryButton';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <ImageBackground
      source={require('../../assets/starlink_home.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>STARLINK</Text>
        </View>
        <View style={styles.buttonContainer}>
          <BlurryButton
            title="Check for Obstructions"
            onPress={() => navigation.navigate('CameraScreen')}
            style={styles.button}
            icon="camera-outline"
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark overlay for better text readability
    paddingHorizontal: 20,
    paddingTop: 60, // Reduced from 100
    paddingBottom: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // Reduced from 20
  },
  iconButton: {
    padding: 8,
  },
  titleContainer: {
    paddingTop: 20, // Reduced from 40
    marginBottom: 'auto', // Pushes button area down
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    letterSpacing: 8,
  },
  buttonContainer: {
    paddingBottom: 15, // Raises button higher from bottom
  },
  button: {
    marginHorizontal: 0,
  },
});
