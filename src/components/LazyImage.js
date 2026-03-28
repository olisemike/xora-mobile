import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * LazyImage - Lazy-loaded image with skeleton placeholder and error handling
 * Uses React Native's Image component with loading states
 */
const LazyImage = memo(({
  source,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  onPress,
  placeholder,
  showRetry = true,
  containerStyle,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const handleLoad = useCallback((e) => {
    setIsLoading(false);
    setHasError(false);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onLoad?.(e);
  }, [fadeAnim, onLoad]);

  const handleError = useCallback((e) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  }, [onError]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    fadeAnim.setValue(0);
  }, [fadeAnim]);

  // Get the URI from source
  const uri = typeof source === 'object' ? source.uri : source;

  // Don't render if no valid URI
  if (!uri) {
    return null;
  }

  const content = (
    <View style={[styles.container, containerStyle]}>
      {/* Skeleton placeholder */}
      {isLoading && !hasError && (
        <View style={[styles.skeleton, style]}>
          {placeholder || <SkeletonShimmer />}
        </View>
      )}

      {/* Error state */}
      {hasError && (
        <View style={[styles.errorContainer, style]}>
          <Ionicons name="image-outline" size={32} color="#999" />
          {showRetry && (
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actual image */}
      {!hasError && (
        <Animated.Image
          {...props}
          source={{ uri }}
          style={[style, { opacity: fadeAnim }]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

/**
 * SkeletonShimmer - Animated skeleton loading placeholder
 */
const SkeletonShimmer = memo(() => {
  const [shimmerAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.shimmer,
        { opacity },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
  },
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
