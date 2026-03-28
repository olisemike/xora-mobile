import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../services/api';

import { useAuth } from './AuthContext';

const STORAGE_KEY = 'xora_settings_v1';

const SettingsContext = createContext(null);

const defaultSettings = {
  // Privacy & security
  privateAccount: false,
  turnOffComments: false,
  turnOffMessaging: false,
  twoFactorEnabled: false,

  // Notifications
  muteNotifications: false,
  pushNotifications: true,
  inAppNotifications: true,
  emailNotifications: false,
  tagNotifications: true,
  likesReactions: true,
  commentsReplies: true,
  newFollowers: true,
  messageNotifications: true,
  liveTrendingAlerts: false,
  doNotDisturb: false,

  // Content preferences
  autoplayWifi: true,
  mediaAutoplayMobile: false,
  dataSaverMode: false,
  sensitiveContentVisibility: false,
  sensitiveContentSuggestion: false,
  topicInterests: true,
  contentWarnings: true,

  // Accessibility
  textSizeLarge: false,
  textSize: 'default', // 'default' or 'large' (mapped from textSizeLarge)
  boldText: false,
  highContrastMode: false,
  reduceMotion: false,
  captionsForVideos: true,
};

// Helper function to map frontend settings to backend payload
const mapSettingsToPayload = (partial) => {
  const mapping = {
    privateAccount: 'privateAccount',
    turnOffComments: (value) => ({ whoCanComment: value ? 'none' : 'everyone' }),
    turnOffMessaging: (value) => ({ whoCanMessage: value ? 'none' : 'everyone' }),
    sensitiveContentVisibility: 'displaySensitiveContent',
    sensitiveContentSuggestion: 'suggestSensitiveContent',
    emailNotifications: 'notificationsEmail',
    pushNotifications: 'notificationsPush',
    inAppNotifications: 'notificationsInApp',
    contentWarnings: 'contentWarnings',
    highContrastMode: 'highContrast',
    reduceMotion: 'reducedMotion',
    likesReactions: 'notifyLikes',
    commentsReplies: 'notifyComments',
    newFollowers: 'notifyFollows',
    messageNotifications: 'notifyMessages',
    tagNotifications: 'notifyMentions',
    liveTrendingAlerts: 'notifyShares',
    muteNotifications: (value) => ({
      notificationsPush: !value,
      notificationsInApp: !value,
      notifyLikes: !value,
      notifyComments: !value,
      notifyFollows: !value,
      notifyMentions: !value,
      notifyMessages: !value,
      notifyShares: !value,
    }),
    doNotDisturb: (value) => ({
      notificationsPush: !value,
      notifyLikes: !value,
      notifyComments: !value,
      notifyFollows: !value,
      notifyMentions: !value,
      notifyMessages: !value,
      notifyShares: !value,
    }),
    autoplayWifi: 'autoplayWifi',
    mediaAutoplayMobile: 'mediaAutoplayMobile',
    dataSaverMode: 'dataSaverMode',
    topicInterests: 'topicInterests',
    boldText: 'screenReader',
    captionsForVideos: 'captionsForVideos',
  };

  const payload = {};

  Object.entries(mapping).forEach(([key, backendKey]) => {
    if (partial[key] !== undefined) {
      if (typeof backendKey === 'function') {
        Object.assign(payload, backendKey(partial[key]));
      } else {
        payload[backendKey] = partial[key];
      }
    }
  });

  // Handle text size separately
  if (partial.textSize !== undefined || partial.textSizeLarge !== undefined) {
    const textSize = partial.textSize || (partial.textSizeLarge ? 'large' : 'default');
    const normalizedTextSize = textSize === 'default' ? 'medium' : textSize;
    payload.fontSize = normalizedTextSize;
  }

  return payload;
};

// Helper function to map server response to frontend settings
const mapServerResponseToSettings = (serverSettings) => {
  const readBool = (value, fallback) => (value === undefined || value === null ? fallback : !!value);
  const readTextSize = (value, fallback) => {
    if (value === undefined || value === null) return fallback;
    return value === 'large' ? 'large' : 'default';
  };

  const notificationsPush = readBool(serverSettings.notifications_push, defaultSettings.pushNotifications);
  const notificationsInApp = readBool(serverSettings.notifications_in_app, defaultSettings.inAppNotifications);

  return {
    ...defaultSettings,
    privateAccount: readBool(serverSettings.private_account, defaultSettings.privateAccount),
    turnOffComments: serverSettings.who_can_comment ? serverSettings.who_can_comment.toLowerCase() === 'none' : defaultSettings.turnOffComments,
    turnOffMessaging: serverSettings.who_can_message ? serverSettings.who_can_message.toLowerCase() === 'none' : defaultSettings.turnOffMessaging,
    twoFactorEnabled: readBool(serverSettings.two_factor_enabled ?? serverSettings.twoFactorEnabled, defaultSettings.twoFactorEnabled),
    emailNotifications: readBool(serverSettings.notifications_email, defaultSettings.emailNotifications),
    pushNotifications: notificationsPush,
    inAppNotifications: notificationsInApp,
    sensitiveContentVisibility: readBool(serverSettings.display_sensitive_content, defaultSettings.sensitiveContentVisibility),
    sensitiveContentSuggestion: readBool(serverSettings.suggest_sensitive_content, defaultSettings.sensitiveContentSuggestion),
    contentWarnings: serverSettings.content_warnings !== undefined ? !!serverSettings.content_warnings : defaultSettings.contentWarnings,
    textSize: readTextSize(serverSettings.font_size, defaultSettings.textSize),
    textSizeLarge: readTextSize(serverSettings.font_size, defaultSettings.textSize) === 'large',
    highContrastMode: readBool(serverSettings.high_contrast, defaultSettings.highContrastMode),
    reduceMotion: readBool(serverSettings.reduced_motion, defaultSettings.reduceMotion),
    likesReactions: readBool(serverSettings.notify_likes, defaultSettings.likesReactions),
    commentsReplies: readBool(serverSettings.notify_comments, defaultSettings.commentsReplies),
    newFollowers: readBool(serverSettings.notify_follows, defaultSettings.newFollowers),
    messageNotifications: readBool(serverSettings.notify_messages, defaultSettings.messageNotifications),
    tagNotifications: readBool(serverSettings.notify_mentions, defaultSettings.tagNotifications),
    liveTrendingAlerts: readBool(serverSettings.notify_shares, defaultSettings.liveTrendingAlerts),
    // muteNotifications is true when ALL notification channels are disabled
    muteNotifications: !notificationsPush && !notificationsInApp,
    // doNotDisturb is true when push is disabled but in-app might still work
    doNotDisturb: !notificationsPush && notificationsInApp,
    autoplayWifi: readBool(serverSettings.autoplay_wifi, defaultSettings.autoplayWifi),
    mediaAutoplayMobile: readBool(serverSettings.media_autoplay_mobile, defaultSettings.mediaAutoplayMobile),
    dataSaverMode: readBool(serverSettings.data_saver_mode, defaultSettings.dataSaverMode),
    topicInterests: serverSettings.topic_interests !== undefined ? !!serverSettings.topic_interests : defaultSettings.topicInterests,
    boldText: readBool(serverSettings.screen_reader, defaultSettings.boldText),
    captionsForVideos: readBool(serverSettings.captions_for_videos, defaultSettings.captionsForVideos),
  };
};

// Helper to load settings from local storage
const loadLocalSettings = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (__DEV__) console.warn('[Settings] AsyncStorage raw data:', raw ? `${raw.length} bytes` : 'null');

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (__DEV__) {
        const keys = Object.keys(parsed);
        console.warn(`[Settings] Loaded ${keys.length} keys from AsyncStorage`, keys);
      }
      const merged = { ...defaultSettings, ...parsed };
      if (__DEV__) {
        const mergedKeys = Object.keys(merged);
        console.warn(`[Settings] After merge with defaults: ${mergedKeys.length} keys`);
      }
      return merged;
    } catch (parseError) {
      if (__DEV__) console.error('Failed to parse settings data:', parseError);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }
  if (__DEV__) console.warn('[Settings] Returning defaultSettings (nothing in AsyncStorage)');
  return defaultSettings;
};

// Helper function to load and merge server settings
const loadServerSettings = async (token) => {
  try {
    const serverSettings = await api.getSettings(token);
    if (serverSettings) {
      return mapServerResponseToSettings(serverSettings);
    }
  } catch (serverError) {
    if (__DEV__) console.error('Failed to load settings from server:', serverError);
  }
  return null;
};

// Helper to save settings to AsyncStorage with logging
const saveSettingsToStorage = (settings) => {
  const jsonString = JSON.stringify(settings);
  if (__DEV__) {
    const settingsKeys = Object.keys(settings);
    console.warn(`[Settings] Preparing to save ${settingsKeys.length} keys: ${settingsKeys.slice(0, 5).join(', ')}...`);
  }
  return AsyncStorage.setItem(STORAGE_KEY, jsonString)
    .then(() => {
      if (__DEV__) {
        console.warn(`[Settings] ✓ Saved ${jsonString.length} bytes to AsyncStorage`);
      }
      return settings;
    })
    .catch((e) => {
      if (__DEV__) console.error('[Settings] ✗ Failed to save to AsyncStorage:', e);
      throw e;
    });
};

// Helper to sync settings changes to backend
const syncSettingToServer = async (partial, isAuthenticated, token) => {
  if (!isAuthenticated || !token) return;

  try {
    const payload = mapSettingsToPayload(partial);
    if (Object.keys(payload).length > 0) {
      await api.updateSettings(token, payload);
      if (__DEV__) console.warn('[Settings] ✓ Server sync completed');
    }
  } catch (error) {
    if (__DEV__) console.error('[Settings] ✗ Server sync failed:', error);
  }
};

// Helper to check if server sync should occur and execute it
const performServerSync = async (isAuthenticated, token) => {
  if (!isAuthenticated || !token) {
    return null;
  }

  if (__DEV__) {
    console.warn('[Settings] Loading from server...');
  }

  const serverSettings = await loadServerSettings(token);
  if (serverSettings) {
    if (__DEV__) console.warn('[Settings] Server settings loaded and applied', { serverSettings });
    return serverSettings;
  }

  if (__DEV__) {
    console.warn('[Settings] No server settings returned');
  }
  return null;
};

// Helper to compare settings and determine if server has changes
const shouldUpdateFromServer = (serverSettings, localSettings, lastUpdateTime, justLoadedTime) => {
  const hasChanges = Object.keys(serverSettings).some(
    (key) => JSON.stringify(serverSettings[key]) !== JSON.stringify(localSettings[key]),
  );

  if (!hasChanges) {
    return false;
  }

  const NOW = Date.now();
  const UPDATE_GRACE_MS = 3000; // 3 seconds after manual update
  const INITIAL_LOAD_GRACE_MS = 10000; // 10 seconds after initial AsyncStorage load

  const isAfterUserUpdate = lastUpdateTime && (NOW - lastUpdateTime) < UPDATE_GRACE_MS;
  const isAfterInitialLoad = justLoadedTime && (NOW - justLoadedTime) < INITIAL_LOAD_GRACE_MS;
  const isInGracePeriod = isAfterUserUpdate || isAfterInitialLoad;

  if (__DEV__) {
    const reason = isAfterUserUpdate ? 'user update' : 'initial load';
    const timeLeft = isAfterUserUpdate ? UPDATE_GRACE_MS - (NOW - lastUpdateTime) : INITIAL_LOAD_GRACE_MS - (NOW - justLoadedTime);
    console.warn(`[Settings] Server differs on keys, grace period: ${isInGracePeriod ? `yes (${reason}, ${Math.round(timeLeft)}ms)` : 'no'}`);
    Object.keys(serverSettings).forEach((key) => {
      if (JSON.stringify(serverSettings[key]) !== JSON.stringify(localSettings[key])) {
        console.warn(`[Settings] Server differs on ${key}:`, serverSettings[key], 'vs local:', localSettings[key]);
      }
    });
  }

  return !isInGracePeriod;
};

const getSettingsDiff = (localSettings, serverSettings) => {
  const diff = {};
  Object.keys(localSettings).forEach((key) => {
    if (JSON.stringify(localSettings[key]) !== JSON.stringify(serverSettings[key])) {
      diff[key] = localSettings[key];
    }
  });
  return diff;
};

// Helper to log sync conditions
const logSyncConditions = (isAuthenticated, token) => {
  if (!__DEV__) return;

  console.warn('[Settings] Checking server sync conditions:', {
    isAuthenticated,
    hasToken: !!token,
    currentToken: token ? `${token.substring(0, 10)}...` : undefined,
    shouldSync: Boolean(isAuthenticated && token),
  });
};

// Helper to handle post-server-sync state update
const handleServerSyncSuccess = async (serverSettings, token, setSettings, syncedTokenRef) => {
  if (__DEV__) console.warn('[Settings] Applying server settings to state');
  setSettings(serverSettings);
  await saveSettingsToStorage(serverSettings);
  syncedTokenRef.current = token;
  if (__DEV__) console.warn('[Settings] ✓ Server settings persisted');
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const syncedTokenRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const justLoadedTimeRef = useRef(null);

  // Handle syncing from server
  const handleServerSync = useCallback(async (localSettings) => {
    if (!isAuthenticated || !token || syncedTokenRef.current === token) {
      return;
    }

    if (__DEV__) console.warn('[Settings] Starting server sync...');
    const serverSettings = await performServerSync(isAuthenticated, token);

    if (!serverSettings) {
      return;
    }

    const shouldApplyServer = shouldUpdateFromServer(
      serverSettings,
      localSettings,
      lastUpdateTimeRef.current,
      justLoadedTimeRef.current,
    );

    if (shouldApplyServer) {
      if (__DEV__) console.warn('[Settings] Server has changes, applying...');
      await handleServerSyncSuccess(serverSettings, token, setSettings, syncedTokenRef);
    } else {
      const diff = getSettingsDiff(localSettings, serverSettings);
      const diffKeys = Object.keys(diff);
      if (diffKeys.length > 0) {
        if (__DEV__) console.warn('[Settings] Server differs during grace period, syncing local to server');
        await syncSettingToServer(diff, isAuthenticated, token);
      } else if (__DEV__) {
        console.warn('[Settings] Server data matches local or in grace period, no update needed');
      }
      syncedTokenRef.current = token;
    }
  }, [isAuthenticated, token]);

  // Initial load from AsyncStorage only (fast and stable)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const localSettings = await loadLocalSettings();
        justLoadedTimeRef.current = Date.now();
        if (__DEV__) console.warn('[Settings] ✓ Loaded from AsyncStorage');
        setSettings(localSettings);
      } catch (e) {
        if (__DEV__) console.error('[Settings] ✗ Load error:', e);
      } finally {
        if (__DEV__) console.warn('[Settings] ✓ Load cycle complete');
        setLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Server sync on auth/token availability without reloading local settings
  useEffect(() => {
    if (!loaded) return;

    const syncFromServer = async () => {
      logSyncConditions(isAuthenticated, token);
      await handleServerSync(settings);
    };

    syncFromServer();
  }, [loaded, isAuthenticated, token, handleServerSync, settings]);

  // Reset sync tracker when user logs out to force fresh server load on re-login
  useEffect(() => {
    if (!isAuthenticated) {
      if (__DEV__) console.warn('[Settings] User logged out, resetting sync state');
      syncedTokenRef.current = null;
      lastUpdateTimeRef.current = null;
      justLoadedTimeRef.current = null;
    }
  }, [isAuthenticated]);

  const updateSettings = useCallback(async (partial) => {
    // Track when this update happened to prevent stale server data from overwriting
    lastUpdateTimeRef.current = Date.now();
    // Clear the initial load timer so grace period only applies to this update
    justLoadedTimeRef.current = null;

    // Use functional setState to always get latest settings
    setSettings((prevSettings) => {
      // IMPORTANT: Merge with ALL previous settings to avoid losing data
      const newSettings = { ...prevSettings, ...partial };
      if (__DEV__) {
        console.warn('[Settings] Update requested:', Object.keys(partial));
        console.warn('[Settings] Full settings object keys:', Object.keys(newSettings).length);
      }
      // Save to storage (fire and forget, catches errors internally)
      saveSettingsToStorage(newSettings);
      return newSettings;
    });

    // Sync to backend if authenticated
    await syncSettingToServer(partial, isAuthenticated, token);
  }, [isAuthenticated, token]);

  const value = useMemo(() => ({ settings, updateSettings, loaded }), [settings, updateSettings, loaded]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
