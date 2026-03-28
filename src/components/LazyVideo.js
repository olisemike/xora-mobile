import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Image, Text, Dimensions, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

/**
 * FullscreenVideoPlayer - Fullscreen video modal with skip controls (similar to PostDetailScreen)
 */
const FullscreenVideoPlayer = ({ url, onClose }) => {
  const videoRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef(null);

  const skip = useCallback(async (seconds) => {
    if (!videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      const next = status.positionMillis + seconds * 1000;
      await videoRef.current.setPositionAsync(Math.max(0, next));
    } catch (e) {
      if (__DEV__) console.error('Skip error:', e);
    }
  }, []);

  // Control skip controls visibility
  useEffect(() => {
    setShowControls(true);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  const handleVideoPress = useCallback(() => {
    setShowControls(prev => !prev);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (!showControls) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [showControls]);

  return (
    <View style={styles.videoModalContainer}>
      {/* Close Button */}
      <TouchableOpacity style={styles.videoModalCloseBtn} onPress={onClose}>
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.videoModalVideoContainer}
        onPress={handleVideoPress}
      >
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={styles.videoModalVideo}
          resizeMode="contain"
          shouldPlay
        />
      </TouchableOpacity>

      {/* Skip controls */}
      {showControls && (
        <View style={styles.videoModalSkipControls}>
          <TouchableOpacity
            style={styles.videoModalSkipButton}
            onPress={() => skip(-5)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="play-back" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.videoModalSkipText}>-5s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoModalSkipButton}
            onPress={() => skip(5)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="play-forward" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.videoModalSkipText}>+5s</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/**
 * LazyVideo - Lazy-loaded video with thumbnail/poster and error handling
 * Shows thumbnail until user taps to play, opens fullscreen video modal on interaction
 */
const LazyVideo = memo(({
  source,
  poster,
  thumbnail,
  style,
  resizeMode = ResizeMode.COVER,
  autoPlay = false,
  loop = false,
  muted = false,
  isVisible: _isVisible = true,
  isActive = true,
  onLoad,
  onError,
  onPlaybackStatusUpdate,
  onPress,
  containerStyle,
  showPlayButton = true,
  ..._props
}) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);
  const [showVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const userPausedRef = useRef(false);

  // Pause/play according to parent-provided active flag
  useIsActiveEffect(isActive, videoRef, showVideo, setIsPlaying, userPausedRef);

  // Auto-play inline when requested and item is active
  useEffect(() => {
    if (autoPlay && isActive) {
      // Open fullscreen modal for autoPlay instead of playing inline
      setShowVideoModal(true);
    }
  }, [autoPlay, isActive]);

  // Get URIs
  const videoUri = typeof source === 'object' ? source.uri : source;
  const posterUri = poster || thumbnail;

  const handleThumbnailPress = useCallback(() => {
    // If a parent provided an explicit onPress (e.g., navigate to post), call it
    if (onPress) {
      onPress();
      return;
    }

    // Force fullscreen modal instead of inline playback
    setShowVideoModal(true);
  }, [onPress]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
  }, []);

  // Don't render if no valid URI
  if (!videoUri) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Error state */}
      {hasError && (
        <View style={[styles.errorContainer, style]}>
          <Ionicons name="videocam-outline" size={32} color="#999" />
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Thumbnail with play button */}
      {!hasError && (
        <TouchableOpacity
          onPress={handleThumbnailPress}
          activeOpacity={0.9}
          style={styles.thumbnailContainer}
        >
          {posterUri ? (
            showVideo ? (
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={[styles.thumbnail, style]}
                resizeMode={resizeMode}
                shouldPlay={isPlaying}
                isLooping={loop}
                isMuted={muted}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) setIsPlaying(status.isPlaying);
                  onPlaybackStatusUpdate?.(status);
                }}
              />
            ) : (
              <Image
                source={{ uri: posterUri }}
                style={[styles.thumbnail, style]}
                resizeMode="cover"
              />
            )
          ) : (
            <View style={[styles.placeholderThumbnail, style]}>
              <SkeletonShimmer />
            </View>
          )}
          {showPlayButton && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={28} color="#333" style={styles.playIcon} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Fullscreen Video Modal */}
      <Modal
        visible={showVideoModal}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowVideoModal(false)}
      >
        <FullscreenVideoPlayer
          url={videoUri}
          onClose={() => setShowVideoModal(false)}
        />
      </Modal>
    </View>
  );
});

// Pause/play based on `isActive` prop to avoid playback when not the active item
// This effect is outside the component return to ensure it runs per-instance
function useIsActiveEffect(isActive, videoRef, showVideo, setIsPlaying, userPausedRef) {
  useEffect(() => {
    if (!showVideo || !videoRef.current) return;

    // If parent marked this item as inactive, pause unless user explicitly paused
    if (!isActive) {
      if (videoRef.current.pauseAsync) {
        videoRef.current.pauseAsync().catch(() => {});
      }
      setIsPlaying(false);
      return;
    }

    // If active and not user-paused, attempt to play
    if (isActive && !userPausedRef.current) {
      if (videoRef.current.playAsync) {
        videoRef.current.playAsync().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [isActive, videoRef, showVideo, setIsPlaying, userPausedRef]);
}


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
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  placeholderThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#e0e0e0',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f0f0',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 16 / 9,
  },
  retryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
  },
  // Video Modal Styles (from PostDetailScreen)
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoModalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  videoModalVideoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  videoModalVideo: {
    width: '100%',
    height: '100%',
  },
  videoModalSkipControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Dimensions.get('window').height * 0.25,
  },
  videoModalSkipButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
  },
  videoModalSkipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
});

LazyVideo.displayName = 'LazyVideo';

export default LazyVideo;

