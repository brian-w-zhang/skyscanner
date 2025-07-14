import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

interface GalleryScreenProps {
  navigation: any;
  route: {
    params: {
      videoUri: string;
    };
  };
}

export default function GalleryScreen({ navigation, route }: GalleryScreenProps) {
  const { videoUri } = route.params;
  const [status, setStatus] = useState<any>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.replayAsync();
      setIsPlaying(true);
    }
  };

  const handleSaveToGallery = async () => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required to save the video.');
        return;
      }

      // Save the video to the device's media library
      const asset = await MediaLibrary.createAssetAsync(videoUri);
      await MediaLibrary.createAlbumAsync('Sky Scanner', asset, false);
      
      Alert.alert('Success', 'Video saved to your gallery!');
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert('Error', 'Failed to save video to gallery.');
    }
  };

  const handleReturnToCamera = () => {
    navigation.replace('CameraScreen');
  };

  const handleGoHome = () => {
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGoHome}
        >
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sky Scan Recording</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSaveToGallery}
        >
          <Ionicons name="download" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            setStatus(status);
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying || false);
            }
          }}
        />
        
        {/* Video overlay controls */}
        <View style={styles.videoOverlay}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={48} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleReplay}
        >
          <Ionicons name="refresh" size={24} color="white" />
          <Text style={styles.controlButtonText}>Replay</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleReturnToCamera}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.controlButtonText}>New Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Video info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Duration: {status.isLoaded ? Math.round(status.durationMillis / 1000) : 0}s
        </Text>
        <Text style={styles.infoText}>
          Position: {status.isLoaded ? Math.round(status.positionMillis / 1000) : 0}s
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(23, 23, 23)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 40,
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
});
