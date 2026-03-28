import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { Video } from 'expo-av';

import { useAdContext } from '../contexts/AdContext';

import AdSDK from './AdSDK';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * AdStory Component - Full screen ad story
 * Appears between user stories during story viewing (not in homefeed list)
 * Shows like normal story with "Ad" badge, users can scroll through
 */
export const AdStory = ({ adData, _onClose, onNext }) => {
  const { trackImpression, trackClick, trackVideoEvent } = useAdContext();
  const [skipAvailable] = useState(true);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const progressTimerRef = useRef(null);
  const impressionTrackedRef = useRef(false);

  // Track impression immediately when story is shown
  useEffect(() => {
    if (adData?.id && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      trackImpression(adData.id, 'story');
      trackVideoEvent(adData.id, 'story', 'start');
    }
  }, [adData?.id, trackImpression, trackVideoEvent]);

  // Auto-advance after 10 seconds if not manually skipped
  useEffect(() => {
    const mediaUrl = adData?.mediaUrl || adData?.media_url || null;
    const adType = adData?.adType || adData?.ad_type || 'image';
    const isVideo = adType === 'video' || (typeof mediaUrl === 'string' && /\.mp4|\.mov|\.webm|\.m3u8|cloudflarestream|\/video\//i.test(mediaUrl));
    if (isVideo) return undefined;

    progressTimerRef.current = setInterval(() => {
      setAutoPlayProgress(prev => {
        const next = prev + 1;
        if (next >= 10) {
          trackVideoEvent(adData?.id, 'story', 'complete');
          onNext?.();
        }
        return next;
      });
    }, 1000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [adData?.id, adData?.adType, adData?.ad_type, adData?.mediaUrl, adData?.media_url, onNext, trackVideoEvent]);

  const handleSkip = () => {
    if (skipAvailable) {
      onNext?.();
    }
  };

  const handlePress = () => {
    const clickUrl = adData.url || adData.click_url || '';
    if (adData.id && clickUrl) {
      trackClick(adData.id, 'story');
      Linking.openURL(clickUrl).catch((err) => {
        if (__DEV__) console.warn('[AdStory] Failed to open URL:', err);
      });
    }
  };

  if (!adData) return null;

  // Handle SDK ads - render using AdSDK component in fullscreen
  const adType = adData.adType || adData.ad_type || 'image';
  if (adType === 'sdk') {
    return (
      <View style={styles.sdkContainer}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${(autoPlayProgress / 10) * 100}%` },
            ]}
          />
        </View>

        {/* Ad Badge */}
        <View style={styles.adBadge}>
          <Text style={styles.badgeText}>📢 SPONSORED</Text>
        </View>

        <View style={styles.sdkContent}>
          <AdSDK
            adData={adData}
            onImpression={(id) => trackImpression(id, 'story')}
          />
        </View>

        {/* Skip Button (after 3 seconds) */}
        {skipAvailable ? (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : null}

        {/* Time Remaining */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{10 - autoPlayProgress}s</Text>
        </View>
      </View>
    );
  }

  // Handle field name variations from backend
  const title = adData.title || adData.headline || '';
  const mediaUrl = adData.mediaUrl || adData.media_url || null;
  const isVideo = adType === 'video' || (typeof mediaUrl === 'string' && /\.mp4|\.mov|\.webm|\.m3u8|cloudflarestream|\/video\//i.test(mediaUrl));
  const ctaText = adData.ctaText || adData.cta_text || 'Learn More';
  const description = adData.description || '';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={handlePress}
    >
      {/* Background Image/Video */}
      {mediaUrl ? (
        isVideo ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.media}
            resizeMode="cover"
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={(status) => {
              if (status?.didJustFinish) {
                trackVideoEvent(adData?.id, 'story', 'complete');
                onNext?.();
              }
            }}
          />
        ) : (
          <Image
            resizeMode="cover"
            source={{ uri: mediaUrl }}
            style={styles.media}
            onError={(error) => {
              if (__DEV__) console.warn('[AdStory] Image failed to load:', error.nativeEvent.error);
            }}
          />
        )
      ) : null}

      {/* Gradient Overlay */}
      <View style={styles.overlay} />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${(autoPlayProgress / 10) * 100}%` },
          ]}
        />
      </View>

      {/* Ad Badge */}
      <View style={styles.adBadge}>
        <Text style={styles.badgeText}>📢 SPONSORED</Text>
      </View>

      {/* Story Content */}
      <View style={styles.contentContainer}>
        {/* Advertiser Info */}
        <View style={styles.advertiserInfo}>
          <View style={styles.advertiserAvatar}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
          <View>
            <Text style={styles.advertiserName}>Sponsored Ad</Text>
            <Text style={styles.advertiserHandle}>@advertisement</Text>
          </View>
        </View>

        {/* Ad Message */}
        {title ? (
          <Text style={styles.storyTitle}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text style={styles.storyText}>
            {description}
          </Text>
        ) : null}

        {/* CTA Button */}
        {ctaText ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handlePress}
          >
            <Text style={styles.ctaButtonText}>{ctaText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Skip Button (after 3 seconds) */}
      {skipAvailable ? (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : null}

      {/* Time Remaining */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{10 - autoPlayProgress}s</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#fff',
  },
  adBadge: {
    position: 'absolute',
    top: 16,
    right: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
  },
  advertiserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  advertiserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advertiserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  advertiserHandle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },  storyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },  storyText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  timerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
  },
  timerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sdkContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
  },
  sdkContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 80,
  },
});

export default AdStory;
