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
          <InfoCard videoSource={require('../../assets/inception.mp4')}
                  thumbnailSource={require('../../assets/pfp.jpg')}
          />
        </View>
        <View style={styles.buttonContainer}>
          <BlurryButton
            title="Check for Obstructions"
            onPress={() => navigation.navigate('CameraScreen2')}
            style={styles.button}
            icon="camera-outline"
          />
          <BlurryButton
            title="View Model"
            onPress={() => navigation.navigate('ObstructionScreen')}
            style={styles.button}
            icon="cube-outline"
          />
        </View>
      </View>
    </ImageBackground>
  );
}

// ... existing styles remain the same
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  titleContainer: {
    paddingTop: 0,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    letterSpacing: 8,
  },
  buttonContainer: {
    paddingBottom: 15,
    gap: 5,
  },
  button: {
    marginHorizontal: 0,
    marginBottom: 10,
  },
});
