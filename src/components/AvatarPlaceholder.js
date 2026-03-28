import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AvatarPlaceholder({ size = 80, avatarUrl = null }) {
  // If avatar URL is provided, render actual image
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  // Fallback to placeholder gradient
  const headSize = size * 0.4;
  const bodyWidth = size * 0.7;
  const bodyHeight = size * 0.35;

  return (
    <LinearGradient
      colors={['#4F46E5', '#06B6D4']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View
        style={[
          styles.head,
          {
            width: headSize,
            height: headSize,
            borderRadius: headSize / 2,
            marginBottom: size * 0.06,
          },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius: bodyHeight,
          },
        ]}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    backgroundColor: '#F5F5F5',
  },
  body: {
    backgroundColor: '#F5F5F5',
  },
  image: {
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
});
