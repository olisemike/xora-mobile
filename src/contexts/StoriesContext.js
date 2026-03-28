import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import api from '../services/api';

import { useAuth } from './AuthContext';

const StoriesContext = createContext(null);

const toMs = (value) => {
  if (!value) return null;
  if (typeof value === 'number') {
    return value < 1e12 ? value * 1000 : value;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isExpired = (story, nowMs) => {
  const expiresAt = toMs(story?.expiresAt || story?.expires_at);
  if (!expiresAt) return false;
  return expiresAt <= nowMs;
};

export const StoriesProvider = ({ children }) => {
  const { token, refreshAccessToken } = useAuth();
  const [stories, setStories] = useState([]);

  // Memoize refreshAccessToken reference for dependency array
  const refreshTokenRef = useCallback(() => refreshAccessToken(), [refreshAccessToken]);

  // Add refresh function to manually trigger reload
  const refreshStories = useCallback(async () => {
    if (!token) return;
    try {
      const apiStories = await api.getStoriesFeed(token);
      const nowMs = Date.now();
      setStories(apiStories.filter((s) => !isExpired(s, nowMs)));
    } catch (e) {
      if (__DEV__) console.error('Failed to refresh stories:', e);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStories([]);
      return;
    }

    let cancelled = false;

    const loadStories = async () => {
      try {
        const apiStories = await api.getStoriesFeed(token);
        if (!cancelled) {
          const nowMs = Date.now();
          setStories(apiStories.filter((s) => !isExpired(s, nowMs)));
        }
      } catch (e) {
        if (!cancelled) {
          const errorMessage = e?.message || String(e);
          if (errorMessage.includes('Invalid or expired token') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            if (__DEV__) console.info('Access token expired, attempting refresh...');
            // Try to refresh the token
            const newToken = await refreshTokenRef();
            if (newToken && !cancelled) {
              // Retry loading stories with new token
              if (__DEV__) console.info('Token refreshed, retrying stories load...');
              try {
                const apiStories = await api.getStoriesFeed(newToken);
                if (!cancelled) {
                  const nowMs = Date.now();
                  setStories(apiStories.filter((s) => !isExpired(s, nowMs)));
                }
              } catch (retryError) {
                if (__DEV__) console.error('Failed to load stories after token refresh:', retryError);
              }
            } else {
              // Refresh failed, user will be logged out by AuthContext
              if (__DEV__) console.info('Token refresh failed, clearing stories');
              setStories([]);
            }
          } else {
            if (__DEV__) console.error('Failed to load stories from backend:', e);
          }
        }
      }
    };

    loadStories();
    return () => {
      cancelled = true;
    };
  }, [token, refreshTokenRef]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const nowMs = Date.now();
      setStories((prev) => prev.filter((s) => !isExpired(s, nowMs)));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <StoriesContext.Provider value={{ stories, setStories, refreshStories }}>
      {children}
    </StoriesContext.Provider>
  );
};

export const useStories = () => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
};
