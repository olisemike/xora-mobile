import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { Video } from 'expo-av';

/**
 * Generic SDK Ad Component
 * Renders ads from various SDK providers (AdMob, Meta, etc.)
 *
 * NOTE: expo-ads-admob was deprecated and removed from Expo SDK 48+.
 * For AdMob integration in Expo SDK 48+, use react-native-google-mobile-ads
 * which requires a development build (not Expo Go).
 *
 * This component provides fallback rendering for SDK ads when running in Expo Go,
 * and can be extended to use native ad SDKs in production builds.
 */

export const AdSDK = ({ adData, onImpression }) => {
  const onImpressionRef = useRef(onImpression);
  const [adComponent, setAdComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    onImpressionRef.current = onImpression;
  }, [onImpression]);

  const renderFallbackAd = useCallback((ad) => {
    // Render as regular ad if SDK not available or in Expo Go
    const handlePress = () => {
      const clickUrl = ad?.url || ad?.click_url || ad?.redirectUrl;
      if (clickUrl) {
        Linking.openURL(clickUrl).catch(() => {
          // Ignore URL open errors
        });
      }
    };

    const mediaUrl = ad?.mediaUrl || ad?.media_url || '';
    const adType = ad?.adType || ad?.ad_type || '';
    const isVideo = adType === 'video' || (/\.mp4|\.mov|\.webm|\.m3u8|cloudflarestream|\/video\//i.test(mediaUrl));

    return (
      <TouchableOpacity activeOpacity={0.8} style={styles.fallbackContainer} onPress={handlePress}>
        {mediaUrl ? (
          isVideo ? (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.fallbackImage}
              resizeMode="cover"
              shouldPlay
              isLooping
              isMuted
            />
          ) : (
            <Image
              resizeMode="cover"
              source={{ uri: mediaUrl }}
              style={styles.fallbackImage}
            />
          )
        ) : null}
        <View style={styles.fallbackContent}>
          <Text style={styles.fallbackTitle}>{ad?.headline || ad?.title || 'Advertisement'}</Text>
          <Text style={styles.fallbackText}>{ad?.description || ''}</Text>
          {(ad?.ctaText || ad?.cta_text) ? (
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{ad?.ctaText || ad?.cta_text || 'Learn More'}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const initializeSDKAd = useCallback(async (ad) => {
    const { sdkProvider } = ad || {};

    // For Expo Go and development, render fallback ads
    // Native SDK integration requires a development build
    switch (sdkProvider) {
    case 'admob':
      // AdMob requires react-native-google-mobile-ads in production build
      return renderFallbackAd(ad);

    case 'applovin':
      // AppLovin MAX - try dynamic import for production builds
      try {
        const AppLovinMAX = require('react-native-applovin-max').default;
        if (AppLovinMAX && typeof AppLovinMAX.isInitialized === 'function') {
          // AppLovin is available - but for Expo Go compatibility, use fallback
          return renderFallbackAd(ad);
        }
      } catch {
        // AppLovin not available
      }
      return renderFallbackAd(ad);

    case 'meta':
    case 'meta_audience':
    case 'unity':
    case 'ironsource':
    case 'vungle':
    default:
      // These require native setup - render fallback
      return renderFallbackAd(ad);
    }
  }, [renderFallbackAd]);

  useEffect(() => {
    if (adData) {
      setLoading(true);
      setError(null);

      initializeSDKAd(adData)
        .then((component) => {
          setAdComponent(component);
          setLoading(false);
          // Track impression
          if (onImpressionRef.current && adData.id) {
            onImpressionRef.current(adData.id);
          }
          return component;
        })
        .catch((err) => {
          if (__DEV__) console.warn('SDK ad initialization error:', err);
          setError(err.message || 'Failed to load ad');
          setAdComponent(renderFallbackAd(adData));
          setLoading(false);
        });
    }
  }, [adData, initializeSDKAd, renderFallbackAd]);

  if (!adData) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return renderFallbackAd(adData);
  }

  return adComponent || renderFallbackAd(adData);
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fallbackImage: {
    width: '100%',
    height: 180,
  },
  fallbackContent: {
    padding: 16,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  fallbackText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsoredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
});

export default AdSDK;
