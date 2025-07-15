import React from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BlurryButton from '../components/BlurryButton';
import InfoCard from '../components/InfoCard';

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
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>STARLINK</Text>
          </View>
          <InfoCard />
        </View>
        <View style={styles.buttonContainer}>
          <BlurryButton
            title="Check for Obstructions (Video)"
            onPress={() => navigation.navigate('CameraScreen')}
            style={styles.button}
            icon="camera-outline"
          />
          <BlurryButton
            title="Check for Obstructions (Photos)"
            onPress={() => navigation.navigate('CameraScreen2')}
            style={{ ...styles.button, marginTop: 15 }}
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  button: {
    width: '80%',
  },
});
