import React, { createContext, useContext, useState, useCallback } from 'react';

import adService, { adStorageHelper } from '../services/adService';
import { impressionTracker } from '../services/impressionTracker';

import { useAuth } from './AuthContext';

const AdContext = createContext();

export const useAdContext = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAdContext must be used within AdProvider');
  }
  return context;
};

export const AdProvider = ({ children }) => {
  const { token } = useAuth();
  const [currentAds, setCurrentAds] = useState({
    feed: null,
    story: null,
    reel: null,
    banner: null,
  });

  const [adLoading, setAdLoading] = useState({
    feed: false,
    story: false,
    reel: false,
    banner: false,
  });

  const [userLocation, setUserLocation] = useState(null);

  /**
   * Fetch next ad for a position
   */
  const fetchAdForPosition = useCallback(async (position) => {
    try {
      setAdLoading(prev => ({ ...prev, [position]: true }));

      if (__DEV__) {
        // Fetching ad for position
        // User location available
        // Auth token available
      }

      const ad = await adService.getNextAdForPosition(position, userLocation, token);

      if (ad) {
        setCurrentAds(prev => ({ ...prev, [position]: ad }));
        if (__DEV__) {
          // Successfully fetched ad
        }
        return ad;
      }
      if (__DEV__) {
        // No ad available for position
      }


      return null;
    } catch (err) {
      if (__DEV__) console.error(`[AdContext] Error fetching ${position} ad:`, err);
      return null;
    } finally {
      setAdLoading(prev => ({ ...prev, [position]: false }));
    }
  }, [userLocation, token]);

  /**
   * Track ad impression
   */
  const trackImpression = useCallback(async (adId, position) => {
    try {
      if (__DEV__) {
        // Tracking impression
      }
      await adService.trackImpression(adId, position, null, token);
      await adStorageHelper.saveImpressionCount(adId);
      if (__DEV__) {
        // Successfully tracked impression
      }
    } catch (err) {
      if (__DEV__) console.error('[AdContext] Error tracking impression:', err);
    }
  }, [token]);

  /**
   * Track ad click
   */
  const trackClick = useCallback(async (adId, position, url) => {
    try {
      if (__DEV__) {
        // Tracking click
      }
      await adService.trackClick(adId, position, token);
      // Open ad URL (would use Linking module here)
      if (__DEV__) {
        // Successfully tracked click
      }
      return url;
    } catch (err) {
      if (__DEV__) console.error('Error tracking click:', err);
      return null;
    }
  }, [token]);

  /**
   * Track video event (for video ads)
   */
  const trackVideoEvent = useCallback(async (adId, position, eventType) => {
    try {
      await adService.trackVideoEvent(adId, position, eventType, token);
    } catch (err) {
      if (__DEV__) console.error('Error tracking video event:', err);
    }
  }, [token]);

  /**
   * Refresh ad for a position (used for banner refresh)
   */
  const refreshAd = useCallback(async (position) => {
    adService.resetPositionQueue(position);
    return fetchAdForPosition(position);
  }, [fetchAdForPosition]);

  /**
   * Set user location for geo-targeted ads
   */
  const setLocation = useCallback((location) => {
    setUserLocation(location);
  }, []);

  const value = {
    // Current ads
    currentAds,
    adLoading,

    // Ad operations
    fetchAdForPosition,
    refreshAd,
    trackImpression,
    trackClick,
    trackVideoEvent,

    // Utilities
    impressionTracker,
    setLocation,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export default AdContext;
