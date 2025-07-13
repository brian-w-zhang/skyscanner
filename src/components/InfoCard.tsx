import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function InfoCard() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/pfp.jpg')}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.textContainer}>
        <Text style={styles.subtitle}>Hi Aaron, I'm Brian.</Text>
        <Text style={styles.bodyText}>This is my take on reverse engineering the check for obstructions tool.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch', // Changed from 'center' to 'stretch'
    marginVertical: 20,
    height: 90, // Fixed height for the card
  },
  image: {
    width: 90, // Made it rectangular and same height as container
    height: '100%', // Takes full height of container
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  textContainer: {
    backgroundColor: 'rgba(3, 10, 31, 0.34)', // Navy blue semi-transparent
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
});
