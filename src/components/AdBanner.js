import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';

import { useAdContext } from '../contexts/AdContext';

import AdSDK from './AdSDK';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_HEIGHT = 90;
const REFRESH_INTERVAL = 120000; // 2 minutes (reduced from 30s to save API quota)

/**
 * AdBanner Component - Scrollable banner that appears on bottom of screens
 * Refreshes every 30 seconds with new ad
 * Scrolls away as user scrolls
 */
export const AdBanner = ({ position = 'explore' }) => {
  const {
    fetchAdForPosition,
    trackImpression,
    trackClick,
    adLoading,
  } = useAdContext();

  const [adData, setAdData] = useState(null);
  const refreshTimerRef = useRef(null);
  const impressionTrackedRef = useRef(false);

  // Load ad function - memoized to use in dependency arrays
  const loadAd = useCallback(async () => {
    const ad = await fetchAdForPosition(position);
    if (ad) {
      setAdData(ad);
      impressionTrackedRef.current = false;
    }
  }, [fetchAdForPosition, position]);

  // Initial load
  useEffect(() => {
    loadAd();
  }, [loadAd]);

  // Refresh banner every 30 seconds
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadAd()
        .catch((error) => {
          if (__DEV__) console.error('[AdBanner] Failed to refresh ad:', error);
        });
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [position, loadAd]);

  // Track impression when ad is visible
  useEffect(() => {
    if (adData?.id && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      trackImpression(adData.id, position);
    }
  }, [adData?.id, position, trackImpression]);

  const handlePress = () => {
    if (adData?.id && adData?.url) {
      trackClick(adData.id, position);
      // In real app: Linking.openURL(adData.url);
    }
  };

  if (!adData && !adLoading[position]) {
    return null;
  }

  // Handle SDK ads differently
  if (adData?.adType === 'sdk') {
    return (
      <View style={styles.bannerContainer}>
        <AdSDK
          adData={adData}
          onClick={(adId) => trackClick(adId, position)}
          onImpression={(adId) => trackImpression(adId, position)}
        />
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.banner}
        onPress={handlePress}
      >
        {adLoading[position] ? (
          <ActivityIndicator color="#FF6B35" size="small" />
        ) : (
          <>
            {/* Banner Image */}
            {adData?.mediaUrl ? (
              <Image
                resizeMode="cover"
                source={{ uri: adData.mediaUrl }}
                style={styles.bannerImage}
              />
            ) : null}

            {/* Banner Content */}
            <View style={styles.bannerContent}>
              <View style={styles.textContent}>
                {adData?.headline ? (
                  <Text numberOfLines={1} style={styles.headline}>
                    {adData.headline}
                  </Text>
                ) : null}
                {adData?.description ? (
                  <Text numberOfLines={1} style={styles.bannerDescription}>
                    {adData.description}
                  </Text>
                ) : null}
              </View>

              {/* CTA Text */}
              {adData?.ctaText ? <Text style={styles.cta}>{adData.ctaText}</Text> : null}
            </View>

            {/* Ad Label */}
            <View style={styles.adLabel}>
              <Text style={styles.adLabelText}>Ad</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bannerImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 8,
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  textContent: {
    marginBottom: 4,
  },
  headline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  bannerDescription: {
    fontSize: 12,
    color: '#666',
  },
  cta: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600',
  },
  adLabel: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
  },
  adLabelText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
});

export default AdBanner;
