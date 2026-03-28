import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CoverPlaceholder() {
  return (
    <LinearGradient
      colors={['#0EA5E9', '#6366F1']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.container}
    >
      <View style={[styles.circle, { top: '50%', left: '15%', width: 100, height: 100 }]} />
      <View style={[styles.circle, { top: '25%', left: '40%', width: 70, height: 70 }]} />
      <View style={[styles.circle, { top: '65%', left: '60%', width: 90, height: 90 }]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
