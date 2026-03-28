import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

import LazyImage from './LazyImage';
import LazyVideo from './LazyVideo';
import ErrorBoundary from './ErrorBoundary';

/**
 * Detect media type from URL or explicit type
 */
const getMediaType = (item) => {
  if (item.type) {
    return item.type;
  }

  const url = item.url || item.uri || item.image_url || '';

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();

  // Video extensions
  if (['mp4', 'webm', 'ogg', 'mov', 'm3u8'].includes(ext)) {
    return 'video';
  }

  // GIF (treat as video for autoplay)
  if (ext === 'gif') {
    return 'gif';
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) {
    return 'audio';
  }

  // Default to image
  return 'image';
};

/**
 * Get the URL from various media item formats
 */
const getMediaUrl = (item) => {
  if (typeof item === 'string') return item;
  return item.url || item.uri || item.image_url || '';
};

/**
 * PostMedia - Unified media renderer for posts in mobile
 * Handles images, videos, and mixed media with lazy loading
 * CAROUSEL SIZE: 2X BIGGER (440px)
 */
const PostMedia = memo(({
  media,
  style,
  onMediaPress,
  showVideoControls = true,
  autoPlayVideo = false,
  imageStyle,
  allowInlineVideoPlayback = true,
  isVisible = true,
  isScreenFocused = true,
  blurSensitive = false,
  sensitiveLabel = 'Sensitive content',
}) => {
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  // Filter valid media items
  const validMedia = media.filter((item) => {
    const url = getMediaUrl(item);
    return url && url.length > 0;
  });

  const handlePress = useCallback((index, item) => {
    onMediaPress?.(index, item);
  }, [onMediaPress]);

  // Multiple media items - carousel layout (stacked horizontal carousel)
  const screenWidth = Dimensions.get('window').width;
  const mediaHeight = 440; // 2X BIGGER: was 220
  const itemWidth = screenWidth - 60; // Card width with overlap buffer
  const overlapAmount = 0; // How much cards overlap (negative margin)
  const snapInterval = itemWidth - overlapAmount; // Snap to visible card movement

  const handleScroll = useCallback((event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    // Calculate which card is most visible (front of stack)
    const currentIndex = Math.round(contentOffsetX / snapInterval);

    setCurrentPage(currentIndex);
  }, [snapInterval]);

  if (!media || !Array.isArray(media) || media.length === 0 || validMedia.length === 0) {
    return null;
  }

  // Single media item
  if (validMedia.length === 1) {
    const item = validMedia[0];
    const url = getMediaUrl(item);
    const type = getMediaType(item);
    const isVideo = type === 'video' || type === 'gif';

    return (
      <ErrorBoundary fallback={<MediaErrorFallback />}>
        <View style={[styles.singleMedia, style]}>
          {isVideo ? (
            <LazyVideo
              source={{ uri: url }}
              poster={item.thumbnail || item.poster || item.thumbnailUri}
              style={[styles.mediaItem, imageStyle]}
              autoPlay={type === 'gif' || autoPlayVideo}
              loop={type === 'gif'}
              muted
              showControls={showVideoControls}
              showPlayButton={type === 'video'}
              isVisible={isVisible && isScreenFocused}
              isActive={isVisible && isScreenFocused}
              onPress={allowInlineVideoPlayback ? undefined : () => handlePress(0, item)}
            />
          ) : (
            <LazyImage
              source={{ uri: url }}
              style={[styles.mediaItem, imageStyle]}
              blurRadius={blurSensitive ? 22 : 0}
              onPress={() => handlePress(0, item)}
            />
          )}
          {blurSensitive ? (
            <View pointerEvents="none" style={styles.sensitiveOverlay}>
              <Ionicons name="eye-off-outline" size={20} color="#fff" />
              <Text style={styles.sensitiveOverlayText}>{sensitiveLabel}</Text>
            </View>
          ) : null}
        </View>
      </ErrorBoundary>
    );
  }

  // Multiple media carousel
  return (
    <ErrorBoundary fallback={<MediaErrorFallback />}>
      <View style={[styles.carouselContainer, style]}>
        <ScrollView
          horizontal
          snapToInterval={snapInterval}
          decelerationRate="fast"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselStackContent}
          style={styles.carousel}
          onScroll={handleScroll}
        >
          {validMedia.map((item, index) => {
            const url = getMediaUrl(item);
            const type = getMediaType(item);
            const isVideo = type === 'video' || type === 'gif';
            const useInlineVideo = allowInlineVideoPlayback && isVideo;
            const Wrapper = useInlineVideo ? View : TouchableOpacity;
            // Calculate stacking effect based on distance from current visible card
            const distanceFromFront = Math.abs(index - currentPage);
            const isCarouselVisible = distanceFromFront < 3; // Show 3 cards max
            const isItemVisible = isVisible && isScreenFocused && isCarouselVisible;

            // Much more dramatic scaling for side cards - significantly smaller
            let scale;
            if (distanceFromFront === 0) {
              scale = 1; // Front card at full size
            } else if (distanceFromFront === 1) {
              scale = 0.45; // Second card at 65%
            } else if (distanceFromFront === 2) {
              scale = 0.45; // Third card at 45%
            } else {
              scale = 0.3; // Hidden cards very small
            }

            // Increased vertical offset for more pronounced stacking
            const yOffset = distanceFromFront * 0; // Increased from 8
            // Higher zIndex for cards closer to front (dynamic, not static)
            const dynamicZIndex = Math.round(1000 - distanceFromFront * 100);
            // Fade out cards further back
            const opacity = isCarouselVisible ? Math.max(0.4, 1 - distanceFromFront * 0.3) : 0;

            return (
              <View
                key={index}
                style={[
                  styles.carouselItem,
                  {
                    width: itemWidth,
                    marginRight: -overlapAmount,
                    zIndex: dynamicZIndex,
                    transform: [{ scale }, { translateY: yOffset }],
                    opacity,
                  },
                ]}
              >
                <Wrapper
                  {...(!useInlineVideo
                    ? {
                      onPress: () => handlePress(index, item),
                      activeOpacity: 0.9,
                    }
                    : undefined)}
                  pointerEvents={distanceFromFront === 0 ? 'auto' : 'none'}
                  style={styles.carouselItemContent}
                >
                  {type === 'video' || type === 'gif' ? (
                    <LazyVideo
                      source={{ uri: url }}
                      poster={item.thumbnail || item.poster || item.thumbnailUri}
                      style={[styles.carouselMedia, { height: mediaHeight }]}
                      autoPlay={false}
                      loop={type === 'gif'}
                      muted
                      showPlayButton={type === 'video'}
                      isVisible={isItemVisible}
                      isActive={distanceFromFront === 0 && isItemVisible}
                      onPress={useInlineVideo ? undefined : () => handlePress(index, item)}
                    />
                  ) : type === 'audio' ? (
                    <View style={[styles.audioPlaceholder, { height: mediaHeight }]}>
                      <Ionicons name="volume-mute" size={48} color="#999" />
                      <Text style={styles.audioText}>Audio</Text>
                    </View>
                  ) : (
                    <LazyImage
                      source={{ uri: url }}
                      style={[styles.carouselMedia, { height: mediaHeight }]}
                      blurRadius={blurSensitive ? 22 : 0}
                    />
                  )}
                  {blurSensitive ? (
                    <View pointerEvents="none" style={styles.sensitiveOverlay}>
                      <Ionicons name="eye-off-outline" size={18} color="#fff" />
                      <Text style={styles.sensitiveOverlayText}>{sensitiveLabel}</Text>
                    </View>
                  ) : null}
                </Wrapper>
              </View>
            );
          })}
        </ScrollView>
        {validMedia.length > 1 && (
          <View style={[styles.carouselIndicator, { borderColor: colors.primary }]}>
            <Text style={[styles.carouselIndicatorText, { color: colors.primary }]}>
              {currentPage + 1} / {validMedia.length}
            </Text>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
});

/**
 * Fallback component for media errors
 */
const MediaErrorFallback = memo(() => (
  <View style={styles.errorFallback}>
    <Text style={styles.errorText}>Failed to load media</Text>
  </View>
));

const styles = StyleSheet.create({
  singleMedia: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  mediaItem: {
    width: '100%',
    height: 440, // 2X BIGGER: was 220
  },
  carouselContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    position: 'relative',
  },
  carouselContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  carouselStackContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40, // Extra padding at end to allow scrolling past last card
  },
  carousel: {
    borderRadius: 12,
  },
  carouselItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselItemContent: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: '#fff',
  },
  carouselMedia: {
    width: '100%',
    borderRadius: 12,
  },
  audioPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  audioText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  carouselIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    zIndex: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  errorFallback: {
    height: 300, // 2X BIGGER: was 150
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
  },
  sensitiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sensitiveOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

PostMedia.displayName = 'PostMedia';
export default PostMedia;
