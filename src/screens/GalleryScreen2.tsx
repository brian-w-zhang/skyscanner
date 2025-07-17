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
      glbPath?: string; // Add optional glbPath
      streamUrl?: string; // Add optional streamUrl
    };
  };
}

const { width, height } = Dimensions.get('window');
const photoSpacing = 6; // Gap between photos
const photoSize = (width - 40 - (photoSpacing * 2)) / 3; // 3 photos per row with padding and gaps

export default function GalleryScreen2({ navigation, route }: GalleryScreen2Props) {
  const { photoUris, photoData, glbPath, streamUrl } = route.params;
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const handleViewModel = () => {
    navigation.navigate('ObstructionScreen', { 
      glbPath,
      streamUrl 
    });
  };

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
    navigation.popToTop();
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
              {/* {selectedPhoto === index && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#00D4FF" />
                </View>
              )} */}
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

  const renderOrientationPanel = () => {
    const photoDataPoint = selectedPhoto !== null ? photoData.find(data => data.index === selectedPhoto) : null;

    return (
      <View style={styles.orientationPanel}>
        <View style={styles.orientationHeader}>
          <Text style={styles.orientationTitle}>ORIENTATION DATA</Text>
          <View style={styles.orientationSubtitle}>
            <Ionicons name="compass" size={14} color="#8A8A8A" />
            <Text style={styles.orientationSubtitleText}>FROM GYROSCOPE CALCULATIONS</Text>
          </View>
        </View>
        
        <View style={styles.orientationGrid}>
          <View style={styles.orientationItem}>
            <Text style={styles.orientationLabel}>PITCH</Text>
            <Text
              style={[
                styles.orientationValue,
                !photoDataPoint && styles.orientationValueNoData,
              ]}
            >
              {photoDataPoint ? `${photoDataPoint.beta.toFixed(4)} rad` : 'NO DATA'}
            </Text>
            <View style={styles.orientationIndicator}>
              <Ionicons name="arrow-up" size={16} color={photoDataPoint ? "#00D4FF" : "#333"} />
            </View>
          </View>
          
          <View style={styles.orientationItem}>
            <Text style={styles.orientationLabel}>YAW</Text>
            <Text
              style={[
                styles.orientationValue,
                !photoDataPoint && styles.orientationValueNoData,
              ]}
            >
              {photoDataPoint ? `${photoDataPoint.alpha.toFixed(4)} rad` : 'NO DATA'}
            </Text>
            <View style={styles.orientationIndicator}>
              <Ionicons name="sync" size={16} color={photoDataPoint ? "#00D4FF" : "#333"} />
            </View>
          </View>
          
          <View style={styles.orientationItem}>
            <Text style={styles.orientationLabel}>ROLL</Text>
            <Text
              style={[
                styles.orientationValue,
                !photoDataPoint && styles.orientationValueNoData,
              ]}
            >
              {photoDataPoint ? `${photoDataPoint.gamma.toFixed(4)} rad` : 'NO DATA'}
            </Text>
            <View style={styles.orientationIndicator}>
              <Ionicons name="refresh" size={16} color={photoDataPoint ? "#00D4FF" : "#333"} />
            </View>
          </View>
        </View>
        
        <View style={styles.orientationFooter}>
          <View style={styles.statusRow}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: photoDataPoint ? "#00D4FF" : "#333" }]} />
              <Text style={styles.statusText}>
                {photoDataPoint ? `PHOTO ${selectedPhoto} SELECTED` : 'SELECT PHOTO TO VIEW DATA'}
              </Text>
            </View>
            
            {photoDataPoint && (
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampValue}>
                  TIMESTAMP: {new Date(photoDataPoint.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>
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

      <View style={styles.mainContent}>
        <ScrollView style={styles.photoScrollContainer} contentContainerStyle={styles.photoScrollContent}>
          <View style={styles.photoGrid}>
            {renderPhotoGrid()}
          </View>
        </ScrollView>

        {/* GLB Status Panel */}
        {(glbPath || streamUrl) && (
          <View style={styles.glbStatusPanel}>
            <View style={styles.glbStatusHeader}>
              <Ionicons name="cube" size={20} color="#00D4FF" />
              <Text style={styles.glbStatusTitle}>3D MODEL READY</Text>
            </View>
            <TouchableOpacity style={styles.viewModelButton} onPress={handleViewModel}>
              <Text style={styles.viewModelButtonText}>VIEW OBSTRUCTIONS</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
        
        {renderOrientationPanel()}
      </View>

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
    // backgroundColor: 'rgba(255, 255, 255, 0.08)',
    // borderRadius: 8,
    padding: 10,
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.12)',
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
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  photoScrollContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  photoScrollContent: {
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
  orientationPanel: {
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 200,
  },
  orientationHeader: {
    marginBottom: 20,
  },
  orientationTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  orientationSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orientationSubtitleText: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  orientationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  orientationItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  orientationLabel: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  orientationValue: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  orientationIndicator: {
    opacity: 0.7,
  },
  orientationFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timestampContainer: {
    alignItems: 'flex-end',
  },
  timestampLabel: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timestampValue: {
    color: '#8A8A8A',
    fontSize: 13,
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
  orientationValueNoData: {
    color: '#8A8A8A', // Grey color similar to the icons
    opacity: 0.7,     // Slightly dimmed
  },

  glbStatusPanel: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  glbStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  glbStatusTitle: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  viewModelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4FF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  viewModelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});
