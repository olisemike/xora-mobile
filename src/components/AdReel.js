import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Video } from 'expo-av';

import { useAdContext } from '../contexts/AdContext';

import AdSDK from './AdSDK';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * AdReel Component - Full screen video/image reel ad
 * Vertical 9:16 aspect ratio, max 30 seconds
 * Swipe to skip immediately (unlike story ads)
 * Counts as impression at 50% watched
 */
export const AdReel = ({ adData, onSkip, onNext }) => {
  const {
    trackImpression,
    trackClick,
    trackVideoEvent,
    _impressionTracker,
  } = useAdContext();

  const [watchedMs, setWatchedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const watchTimerRef = useRef(null);
  const impressionTrackedRef = useRef(false);

  const TOTAL_DURATION = (adData?.duration || 15) * 1000; // default 15 seconds
  const IMPRESSION_THRESHOLD = TOTAL_DURATION * 0.5; // 50%

  // Track impression when shown
  useEffect(() => {
    if (adData?.id && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      trackVideoEvent(adData.id, 'reel', 'start');
    }
  }, [adData?.id, trackVideoEvent]);

  // Update watch time and check for impression
  useEffect(() => {
    if (!isPlaying) return;

    watchTimerRef.current = setInterval(() => {
      setWatchedMs(prev => {
        const newVal = prev + 100;

        // Check if crossed 50% threshold
        if (newVal >= IMPRESSION_THRESHOLD && !impressionTrackedRef.current) {
          impressionTrackedRef.current = true;
          trackImpression(adData.id, 'reel');
          trackVideoEvent(adData.id, 'reel', 'quartile_50');
        }

        // Auto-complete at end
        if (newVal >= TOTAL_DURATION) {
          trackVideoEvent(adData.id, 'reel', 'complete');
          onNext?.();
          return TOTAL_DURATION;
        }

        return newVal;
      });
    }, 100);

    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, [isPlaying, adData?.id, TOTAL_DURATION, IMPRESSION_THRESHOLD, onNext, trackImpression, trackVideoEvent]);

  const handleSkip = () => {
    trackVideoEvent(adData.id, 'reel', 'skip');
    onSkip?.();
  };

  const handlePress = () => {
    const clickUrl = adData?.url || adData?.click_url || adData?.ctaUrl || adData?.cta_url;
    if (clickUrl) {
      trackClick(adData.id, 'reel');
      Linking.openURL(clickUrl).catch((err) => {
        if (__DEV__) console.warn('[AdReel] Failed to open URL:', err);
      });
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const watchPercent = (watchedMs / TOTAL_DURATION) * 100;

  if (!adData) return null;

  // Handle SDK ads - render using AdSDK component in fullscreen
  const adType = adData.adType || adData.ad_type || 'video';
  const mediaUrl = adData.mediaUrl || adData.media_url || adData.contentUrl || adData.content_url || adData.thumbnailUrl || adData.thumbnail_url || null;
  const isVideo = adType === 'video' || (typeof mediaUrl === 'string' && /\.mp4|\.mov|\.webm|\.m3u8|cloudflarestream|\/video\//i.test(mediaUrl));
  if (adType === 'sdk') {
    return (
      <View style={styles.sdkContainer}>
        <View style={styles.sdkOverlay}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>📢 Ad</Text>
          </View>
          <AdSDK
            adData={adData}
            onImpression={(id) => trackImpression(id, 'reel')}
          />
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={handlePlayPause}
    >
      {/* Reel Media */}
      {mediaUrl ? (
        isVideo ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.media}
            resizeMode="cover"
            shouldPlay={isPlaying}
            isLooping
          />
        ) : (
          <Image
            resizeMode="cover"
            source={{ uri: mediaUrl }}
            style={styles.media}
          />
        )
      ) : (
        <View style={[styles.media, styles.loadingContainer]}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      )}

      {/* Overlay */}
      <View style={styles.overlay} />

      {/* Ad Badge - Top Right */}
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>📢 Ad</Text>
      </View>

      {/* Advertiser Info - Bottom Left */}
      <View style={styles.advertiserContainer}>
        <View style={styles.advertiserInfo}>
          <View style={styles.advertiserAvatar}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
          <View>
            <Text style={styles.advertiserName}>Sponsored Ad</Text>
            <Text style={styles.advertiserHandle}>@advertisement</Text>
          </View>
        </View>
        {adData.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {adData.description}
          </Text>
        ) : null}
      </View>

      {/* CTA Button - Center Bottom */}
      {adData.ctaText ? (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePress}
        >
          <Text style={styles.ctaButtonText}>{adData.ctaText}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Skip Button - Right Side */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress Bar - Bottom */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${watchPercent}%` },
          ]}
        />
      </View>

      {/* Watch Time - Bottom Right */}
      <View style={styles.watchTimeContainer}>
        <Text style={styles.watchTimeText}>
          {Math.floor(watchedMs / 1000)}s / {Math.floor(TOTAL_DURATION / 1000)}s
        </Text>
      </View>

      {/* Impression Indicator */}
      {impressionTrackedRef.current ? (
        <View style={styles.impressionIndicator}>
          <Text style={styles.impressionText}>✓ Viewed</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  adBadge: {
    position: 'absolute',
    top: 16,
    right: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  adBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  advertiserContainer: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
  },
  advertiserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  advertiserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  advertiserName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  advertiserHandle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  skipButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  skipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#FF6B35',
  },
  watchTimeContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
  },
  watchTimeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  impressionIndicator: {
    position: 'absolute',
    top: 60,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
    borderRadius: 4,
  },
  impressionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sdkContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sdkOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});

export default AdReel;
