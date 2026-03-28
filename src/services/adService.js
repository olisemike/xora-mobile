import AsyncStorage from '@react-native-async-storage/async-storage';

import api from './api';

// Ad Service - Manages ad fetching, rotation, and tracking
class AdService {
  constructor() {
    this.adQueue = {}; // Store eligible ads by position (feed, story, reel, banner)
    this.adIndex = {}; // Track which ad in queue we're on
    this.adHistory = {}; // Track which ad URLs were shown
  }

  /**
   * Fetch eligible ads for a specific position using new API
   * Backend returns multiple ad URLs, client rotates through them
   */
  async fetchAdsForPosition(position, userLocation = null, token = null) {
    try {
      if (!token) {
        if (__DEV__) console.warn('No token provided for ad fetching');
        return [];
      }

      const response = await api.getEligibleAds(token, position, userLocation);

      // Handle different response structures
      let ads = [];
      if (Array.isArray(response)) {
        ads = response;
      } else if (response && response.data && Array.isArray(response.data.ads)) {
        ads = response.data.ads;
      } else if (response && Array.isArray(response.ads)) {
        ads = response.ads;
      } else {
        if (__DEV__) console.warn('[AdService] Unexpected response structure:', response);
        return [];
      }

      // Normalize field names for consistency
      return ads.map(ad => ({
        id: ad.id,
        title: ad.title || ad.headline || '',
        headline: ad.title || ad.headline || '', // backward compatibility
        description: ad.description || '',
        mediaUrl: ad.mediaUrl || ad.media_url || ad.contentUrl || ad.content_url || ad.thumbnailUrl || ad.thumbnail_url || null,
        media_url: ad.mediaUrl || ad.media_url || ad.contentUrl || ad.content_url || ad.thumbnailUrl || ad.thumbnail_url || null, // backward compatibility
        url: ad.url || ad.click_url || ad.ctaUrl || ad.cta_url || '',
        click_url: ad.url || ad.click_url || ad.ctaUrl || ad.cta_url || '', // backward compatibility
        ctaText: ad.ctaText || ad.cta_text || 'Learn More',
        cta_text: ad.ctaText || ad.cta_text || 'Learn More', // backward compatibility
        position: ad.position || position,
        adType: ad.adType || ad.ad_type,
        sdkProvider: ad.sdkProvider || ad.sdk_provider,
        sdkAdUnitId: ad.sdkAdUnitId || ad.sdk_ad_unit_id,
        sdkConfig: ad.sdkConfig || ad.sdk_config,
      }));
    } catch (err) {
      if (__DEV__) console.error('Error fetching ads:', err);
      return [];
    }
  }

  /**
   * Get next eligible ad for a position (rotates through URLs)
   * Ensures same ad doesn't repeat until all eligible URLs are used
   */
  async getNextAdForPosition(position, userLocation = null, token = null) {
    // Check if we have ads queued for this position
    if (!this.adQueue[position] || this.adQueue[position].length === 0) {
      // Fetch new batch of eligible ads
      const ads = await this.fetchAdsForPosition(position, userLocation, token);
      if (ads.length === 0) return null;

      this.adQueue[position] = ads;
      this.adIndex[position] = 0;
    }

    // Get current ad and increment index
    const ads = this.adQueue[position];
    const currentIndex = this.adIndex[position] || 0;
    const ad = ads[currentIndex];

    // Increment to next ad
    const nextIndex = (currentIndex + 1) % ads.length;
    this.adIndex[position] = nextIndex;

    // If we've cycled through all ads, reset for next cycle
    if (nextIndex === 0) {
      // All ads have been shown once, can repeat now
      // But backend will ensure same ad doesn't exceed daily limits
    }

    return ad;
  }

  /**
   * Track ad impression when ad is displayed using new API
   */
  async trackImpression(adId, position, duration = null, token = null) {
    try {
      if (!token) {
        if (__DEV__) console.warn('No token provided for impression tracking');
        return false;
      }

      await api.trackAdImpression(token, adId, position, duration);
      return true;
    } catch (err) {
      if (__DEV__) console.error('Error tracking impression:', err);
      return false;
    }
  }

  /**
   * Track ad click/engagement using new API
   */
  async trackClick(adId, position, token = null) {
    try {
      if (!token) {
        if (__DEV__) console.warn('No token provided for click tracking');
        return false;
      }

      await api.trackAdClick(token, adId, position);
      return true;
    } catch (err) {
      if (__DEV__) console.error('Error tracking click:', err);
      return false;
    }
  }

  /**
   * Track video ad completion/quartiles (for VAST ads) using new API
   */
  async trackVideoEvent(adId, position, eventType, token = null) {
    try {
      if (!token) {
        if (__DEV__) console.warn('No token provided for video event tracking');
        return false;
      }

      // For now, just track as impression with video event type
      // Backend can handle video-specific tracking later
      await api.trackAdImpression(token, adId, position, null);
      return true;
    } catch (err) {
      if (__DEV__) console.error('Error tracking video event:', err);
      return false;
    }
  }

  /**
   * Reset ad queue for a position (e.g., when refreshing banner every 30 sec)
   */
  resetPositionQueue(position) {
    this.adQueue[position] = null;
    this.adIndex[position] = 0;
  }

  /**
   * Clear all ad queues (e.g., when app resets)
   */
  clearAllQueues() {
    this.adQueue = {};
    this.adIndex = {};
  }
}

export const adService = new AdService();

/**
 * Storage helper to persist impression tracking
 */
export const adStorageHelper = {
  async saveImpressionCount(adId) {
    try {
      const key = `ad_impression_${adId}`;
      const count = await AsyncStorage.getItem(key);
      const newCount = (parseInt(count) || 0) + 1;
      await AsyncStorage.setItem(key, newCount.toString());
      return newCount;
    } catch (err) {
      if (__DEV__) console.error('Error saving impression count:', err);
    }
  },

  async getImpressionCount(adId) {
    try {
      const key = `ad_impression_${adId}`;
      const count = await AsyncStorage.getItem(key);
      return parseInt(count) || 0;
    } catch (err) {
      if (__DEV__) console.error('Error getting impression count:', err);
      return 0;
    }
  },

  async clearImpressions() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const adKeys = keys.filter(k => k.startsWith('ad_impression_'));
      await AsyncStorage.multiRemove(adKeys);
    } catch (err) {
      if (__DEV__) console.error('Error clearing impressions:', err);
    }
  },
};

// Create singleton instance
export default adService;
