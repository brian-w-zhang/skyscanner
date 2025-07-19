import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Dimensions, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

interface InfoCardProps {
  videoSource: any; // Video source from require()
  thumbnailSource: any; // Thumbnail image source from require()
}

export default function InfoCard({ videoSource, thumbnailSource }: InfoCardProps) {
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);

  // Initialize the video player
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = false;
  });

  const handleVideoPress = async () => {
    setIsVideoModalVisible(true);

    // Allow landscape orientation when video opens
    await ScreenOrientation.unlockAsync();

    // Start playing the video
    player.play();
  };

  const handleCloseVideo = async () => {
    // Stop the video
    player.pause();

    // Lock back to portrait
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    setIsVideoModalVisible(false);
  };

  return (
    <>
      <View style={styles.container}>
        {/* Static thumbnail - clickable */}
        <TouchableOpacity style={styles.videoContainer} onPress={handleVideoPress}>
          <Image source={thumbnailSource} style={styles.videoThumbnail} />
          {/* <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={32} color="rgba(255, 255, 255, 0.9)" />
          </View> */}
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.subtitle}>Hi Aaron, I'm Brian.</Text>
          <Text style={styles.bodyText}>This is my take on reverse engineering the check for obstructions tool.</Text>
        </View>
      </View>

      {/* Full-screen video modal */}
      <Modal
        visible={isVideoModalVisible}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.modalContainer}>
          <VideoView
            player={player}
            style={styles.fullscreenVideo}
            allowsFullscreen={true}
            nativeControls={true} // Use built-in controls
            contentFit="contain"
          />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseVideo}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 20,
    height: 90,
  },
  videoContainer: {
    width: 90,
    height: '100%',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  textContainer: {
    backgroundColor: 'rgba(3, 10, 31, 0.34)',
    padding: 12,
    height: '100%',
    justifyContent: 'center',
    flex: 1,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  subtitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bodyText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.9,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullscreenVideo: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
});
