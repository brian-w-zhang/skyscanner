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
const photoSpacing = 6; // Gap between photos
const photoSize = (width - 40 - (photoSpacing * 2)) / 3; // 3 photos per row with padding and gaps

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
          style={[
            styles.photoContainer,
            selectedPhoto === index && styles.photoContainerSelected
          ]}
          onPress={() => setSelectedPhoto(selectedPhoto === index ? null : index)}
        >
          <Image source={{ uri }} style={styles.photo} />
          <View style={styles.photoOverlay}>
            <View style={styles.photoHeader}>
              <Text style={styles.photoIndex}>{index}</Text>
              {selectedPhoto === index && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#00D4FF" />
                </View>
              )}
            </View>
            {photoDataPoint && (
              <View style={styles.rotationInfo}>
                <Text style={styles.rotationText}>P: {photoDataPoint.beta.toFixed(1)}</Text>
                <Text style={styles.rotationText}>Y: {photoDataPoint.alpha.toFixed(1)}</Text>
                <Text style={styles.rotationText}>R: {photoDataPoint.gamma.toFixed(1)}</Text>
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
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>PHOTO {selectedPhoto} ORIENTATION</Text>
          <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={20} color="#8A8A8A" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailsItem}>
            <Text style={styles.detailsLabel}>PITCH</Text>
            <Text style={styles.detailsValue}>{photoDataPoint.beta.toFixed(4)}°</Text>
          </View>
          <View style={styles.detailsItem}>
            <Text style={styles.detailsLabel}>YAW</Text>
            <Text style={styles.detailsValue}>{photoDataPoint.alpha.toFixed(4)}°</Text>
          </View>
          <View style={styles.detailsItem}>
            <Text style={styles.detailsLabel}>ROLL</Text>
            <Text style={styles.detailsValue}>{photoDataPoint.gamma.toFixed(4)}°</Text>
          </View>
        </View>
        
        <View style={styles.timestampContainer}>
          <Text style={styles.timestampLabel}>CAPTURED</Text>
          <Text style={styles.timestampValue}>
            {new Date(photoDataPoint.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoHome}>
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>SKY SCAN</Text>
          <Text style={styles.headerSubtitle}>{photoUris.length} PHOTOS</Text>
        </View>
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
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.controlButtonText}>NEW SCAN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: photoSpacing,
  },
  photoContainer: {
    width: photoSize,
    height: photoSize,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoContainerSelected: {
    borderColor: '#00D4FF',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: 6,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoIndex: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  selectedIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  rotationInfo: {
    alignItems: 'flex-end',
  },
  rotationText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginBottom: 1,
    minWidth: 30,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailsItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  detailsLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailsValue: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  timestampContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  timestampLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timestampValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
});
