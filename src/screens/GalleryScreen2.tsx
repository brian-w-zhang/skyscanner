import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { PhotoData } from '../utils/photoDataRecorder';

interface GalleryScreen2Props {
  navigation: any;
  route: {
    params: {
      photoUris: string[];
      photoData: PhotoData[];
    };
  };
}

const { width } = Dimensions.get('window');
const photoSize = (width - 60) / 3; // 3 photos per row with padding

export default function GalleryScreen2({ navigation, route }: GalleryScreen2Props) {
  const { photoUris, photoData } = route.params;
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const handleSaveAllToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Permission to access media library is required to save the photos.');
        return;
      }

      let savedCount = 0;
      for (const photoUri of photoUris) {
        try {
          await MediaLibrary.createAssetAsync(photoUri);
          savedCount++;
        } catch (error) {
          console.error('Error saving individual photo:', error);
        }
      }

      Alert.alert('Success', `${savedCount} photos saved to your gallery!`);
    } catch (error) {
      console.error('Error saving photos:', error);
      Alert.alert('Error', 'Failed to save photos to gallery.');
    }
  };

  const handleReturnToCamera = () => {
    navigation.replace('CameraScreen2');
  };

  const handleGoHome = () => {
    navigation.replace('Home');
  };

  const renderPhotoGrid = () => {
    return photoUris.map((uri, index) => {
      const photoDataPoint = photoData.find(data => data.index === index);
      
      return (
        <TouchableOpacity
          key={index}
          style={styles.photoContainer}
          onPress={() => setSelectedPhoto(selectedPhoto === index ? null : index)}
        >
          <Image source={{ uri }} style={styles.photo} />
          <View style={styles.photoOverlay}>
            <Text style={styles.photoIndex}>{index}</Text>
            {photoDataPoint && (
              <View style={styles.rotationInfo}>
                <Text style={styles.rotationText}>α: {photoDataPoint.alpha.toFixed(2)}</Text>
                <Text style={styles.rotationText}>β: {photoDataPoint.beta.toFixed(2)}</Text>
                <Text style={styles.rotationText}>γ: {photoDataPoint.gamma.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    });
  };

  const renderSelectedPhotoDetails = () => {
    if (selectedPhoto === null) return null;
    
    const photoDataPoint = photoData.find(data => data.index === selectedPhoto);
    if (!photoDataPoint) return null;

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Photo {selectedPhoto} Details</Text>
        <Text style={styles.detailsText}>Alpha: {photoDataPoint.alpha.toFixed(4)} rad</Text>
        <Text style={styles.detailsText}>Beta: {photoDataPoint.beta.toFixed(4)} rad</Text>
        <Text style={styles.detailsText}>Gamma: {photoDataPoint.gamma.toFixed(4)} rad</Text>
        <Text style={styles.detailsText}>Timestamp: {new Date(photoDataPoint.timestamp).toLocaleTimeString()}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoHome}>
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sky Scan Photos ({photoUris.length})</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSaveAllToGallery}>
          <Ionicons name="download" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.photoGrid}>
          {renderPhotoGrid()}
        </View>
        
        {renderSelectedPhotoDetails()}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleReturnToCamera}>
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.controlButtonText}>New Scan</Text>
        </TouchableOpacity>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: photoSize,
    height: photoSize,
    marginBottom: 10,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 4,
  },
  photoIndex: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 2,
  },
  rotationInfo: {
    alignItems: 'center',
  },
  rotationText: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 1,
    borderRadius: 2,
    marginBottom: 1,
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  detailsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailsText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
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
});
