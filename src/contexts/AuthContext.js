import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

import api, { API_URL } from '../services/api';

const AuthContext = createContext(null);

const isExplicitAuthFailure = (value) => {
  const msg = String(value || '');
  return msg.includes('401') || msg.includes('403') || msg.includes('Invalid') || msg.includes('expired') || msg.includes('Unauthorized');
};

const parseStoredUser = async (storedUser) => {
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch (parseError) {
    if (__DEV__) console.error('Failed to parse stored user data:', parseError);
    await AsyncStorage.removeItem('auth_user');
    return null;
  }
};

const clearStoredAuth = async () => {
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await AsyncStorage.removeItem('auth_user');
};

const hydrateUserFromToken = async (accessToken) => {
  const response = await api.getMe(accessToken);
  if (response) {
    await AsyncStorage.setItem('auth_user', JSON.stringify(response));
  }
  return response;
};

const refreshSession = async (storedRefreshToken) => {
  const refreshRes = await api.refreshToken(storedRefreshToken);
  if (refreshRes.success && refreshRes.token) {
    await SecureStore.setItemAsync('auth_token', refreshRes.token);
    if (refreshRes.refreshToken) {
      await SecureStore.setItemAsync('refresh_token', refreshRes.refreshToken);
    }

    let refreshedUser = null;
    try {
      refreshedUser = await hydrateUserFromToken(refreshRes.token);
    } catch (getMeAfterRefreshError) {
      if (__DEV__) console.warn('getMe failed after refresh during restore; keeping local user if available', getMeAfterRefreshError);
    }

    return {
      type: 'success',
      token: refreshRes.token,
      refreshToken: refreshRes.refreshToken || storedRefreshToken,
      user: refreshedUser,
    };
  }

  const err = refreshRes?.error || '';
  const isAuthFailure = refreshRes?.statusCode === 401 || refreshRes?.statusCode === 403 || isExplicitAuthFailure(err);
  return { type: isAuthFailure ? 'auth-failure' : 'transient' };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedRefreshToken = await SecureStore.getItemAsync('refresh_token');
        const storedUser = await AsyncStorage.getItem('auth_user');

        if (!storedToken && !storedRefreshToken && !storedUser) {
          return;
        }

        const parsedUser = await parseStoredUser(storedUser);

        if (storedToken) setToken(storedToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        if (parsedUser) setUser(parsedUser);

        if (storedToken) {
          try {
            const response = await hydrateUserFromToken(storedToken);
            if (response) {
              setUser(response);
              return;
            }
          } catch (sessionError) {
            if (!storedRefreshToken && !isExplicitAuthFailure(sessionError?.message)) {
              if (__DEV__) console.warn('Transient getMe failure during restore — keeping local auth state', sessionError);
              return;
            }
          }
        }

        if (storedRefreshToken) {
          try {
            const refreshResult = await refreshSession(storedRefreshToken);
            if (refreshResult.type === 'success') {
              setToken(refreshResult.token);
              setRefreshToken(refreshResult.refreshToken);
              if (refreshResult.user) {
                setUser(refreshResult.user);
              }
              return;
            }

            if (refreshResult.type === 'transient') {
              if (__DEV__) console.warn('Transient refresh failure during restore — keeping local auth state; will retry in background');
              return;
            }
          } catch (e) {
            if (__DEV__) console.warn('Network error during restore refresh; keeping local auth state for retry:', e);
            return;
          }
        }

        if (__DEV__) console.warn('Session invalid or no refresh token, clearing auth state');
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        await clearStoredAuth();
      } catch (e) {
        if (__DEV__) console.error('Failed to restore auth state', e);
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();
  }, []);

  // Ref to always have the latest refreshAccessToken function
  const refreshAccessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);
  const refreshInFlightRef = useRef(null);
  const fetchInterceptorRef = useRef(null);

  // Proactive token refresh - every 10 minutes check if we need to refresh
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        // Use ref to avoid stale closure
        if (refreshAccessTokenRef.current) {
          await refreshAccessTokenRef.current();
        }
      } catch {
        // Ignore errors, will retry on next interval
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  useEffect(() => {
    const handleAppStateChange = async (nextState) => {
      if (nextState === 'active' && refreshAccessTokenRef.current) {
        try {
          await refreshAccessTokenRef.current();
        } catch {
          // Ignore errors; auth state will update if refresh fails
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const login = useCallback(async (emailOrUsername, password) => {
    const deviceInfo = {
      platform: Device.osName || 'unknown',
      osVersion: Device.osVersion || null,
      manufacturer: Device.manufacturer || null,
      modelName: Device.modelName || null,
      deviceId: Device.deviceName || null,
      appPlatform: 'mobile',
    };

    const res = await api.login(emailOrUsername, password, deviceInfo);
    if (!res.success) {
      throw new Error(res.error || 'Login failed');
    }

    if (res.requiresDeviceVerification) {
      return {
        requiresVerification: true,
        tempToken: res.tempToken,
        message: res.message,
      };
    }

    const { user: nextUser, token: nextToken, refreshToken: nextRefreshToken } = res;

    // Use SecureStore for tokens (encrypted), AsyncStorage for user data
    await SecureStore.setItemAsync('auth_token', nextToken);
    if (nextRefreshToken) {
      await SecureStore.setItemAsync('refresh_token', nextRefreshToken);
    }
    await AsyncStorage.setItem('auth_user', JSON.stringify(nextUser));

    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(nextUser);

    return { user: nextUser, token: nextToken, refreshToken: nextRefreshToken };
  }, []);

  const logout = useCallback(async () => {
    try {
      // Remove tokens from SecureStore
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await AsyncStorage.removeItem('auth_user');
    } catch (e) {
      if (__DEV__) console.error('Failed to clear auth state', e);
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, []);

  const logoutAllDevices = useCallback(async () => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const res = await api.logoutAllDevices(token);
    if (!res.success) {
      throw new Error(res.error || 'Failed to logout all devices');
    }

    const { token: newToken, refreshToken: newRefreshToken } = res;

    await SecureStore.setItemAsync('auth_token', newToken);
    if (newRefreshToken) {
      await SecureStore.setItemAsync('refresh_token', newRefreshToken);
    }

    setToken(newToken);
    setRefreshToken(newRefreshToken || null);
  }, [token]);

  const verifyDevice = useCallback(async (verificationCode, tempToken) => {
    const res = await api.verifyDevice(tempToken, verificationCode);
    if (!res.success) {
      return res;
    }

    const payload = res.data || {};
    const nextUser = payload.user;
    const accessToken = payload.tokens?.accessToken || payload.accessToken || payload.token || null;
    const newRefreshToken = payload.tokens?.refreshToken || payload.refreshToken || null;

    if (!accessToken || !nextUser) {
      return { success: false, error: 'Device verification response missing auth data' };
    }

    // Store tokens and user data
    await SecureStore.setItemAsync('auth_token', accessToken);
    if (newRefreshToken) {
      await SecureStore.setItemAsync('refresh_token', newRefreshToken);
    }
    await AsyncStorage.setItem('auth_user', JSON.stringify(nextUser));

    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    setUser(nextUser);

    return res;
  }, []);

  // Complete signup after email verification
  const completeSignup = useCallback(async (tempToken, code) => {
    const res = await api.completeSignup(tempToken, code);
    if (!res.success) {
      throw new Error(res.error || 'Verification failed');
    }

    const { user: nextUser, token: nextToken, refreshToken: nextRefreshToken } = res;

    // Store tokens and user data
    await SecureStore.setItemAsync('auth_token', nextToken);
    if (nextRefreshToken) {
      await SecureStore.setItemAsync('refresh_token', nextRefreshToken);
    }
    await AsyncStorage.setItem('auth_user', JSON.stringify(nextUser));

    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(nextUser);

    return { user: nextUser, token: nextToken, refreshToken: nextRefreshToken };
  }, []);

  const refreshAccessToken = useCallback(() => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const currentRefresh = refreshTokenRef.current || refreshToken;

    if (!currentRefresh) {
      if (__DEV__) console.warn('No refresh token available; keeping current access token and skipping refresh');
      return token;
    }

    const refreshPromise = (async () => {
      try {
        const res = await api.refreshToken(currentRefresh);
        if (!res.success) {
          // Check if this is an explicit auth failure (401/403) vs transient error
          const isAuthFailure = res.statusCode === 401 || res.statusCode === 403;

          if (refreshTokenRef.current && refreshTokenRef.current !== currentRefresh) {
            return token;
          }

          // Only logout on explicit authentication failures (401/403), not transient errors
          if (isAuthFailure) {
            if (__DEV__) console.warn('Refresh token invalid (401/403), logging out. Error:', res.error);
            await logout();
            return null;
          }

          // Transient error (timeout, network issue, etc) - don't logout, just return current token
          if (__DEV__) console.warn('Token refresh failed (transient):', res.error);
          return token;
        }

        const { token: newToken, refreshToken: newRefreshToken } = res;

        // Store new tokens
        await SecureStore.setItemAsync('auth_token', newToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync('refresh_token', newRefreshToken);
        }

        setToken(newToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        return newToken;
      } catch (e) {
        // Network error - don't logout, user might be temporarily offline
        if (__DEV__) console.warn('Token refresh network error:', e);
        if (refreshTokenRef.current && refreshTokenRef.current !== currentRefresh) {
          return token;
        }
        // Keep user logged in during network issues
        return token;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [refreshToken, logout, token]);

  // Keep ref updated with latest function
  useEffect(() => {
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  useEffect(() => {
    if (fetchInterceptorRef.current) return;

    const originalFetch = global.fetch;
    fetchInterceptorRef.current = originalFetch;

    global.fetch = async (input, init = {}) => {
      const response = await originalFetch(input, init);

      if (response.status !== 401) return response;

      const url = typeof input === 'string' ? input : input?.url;
      if (!url || !url.startsWith(API_URL)) return response;

      const headers = init?.headers || {};
      const authHeader = headers.Authorization || headers.authorization;
      if (!authHeader) return response;

      if (headers['X-Auth-Retry']) return response;

      const newToken = await refreshAccessTokenRef.current?.();
      if (!newToken) return response;

      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
        'X-Auth-Retry': '1',
      };

      return originalFetch(input, { ...init, headers: retryHeaders });
    };

    return () => {
      if (fetchInterceptorRef.current) {
        global.fetch = fetchInterceptorRef.current;
        fetchInterceptorRef.current = null;
      }
    };
  }, []);

  const value = {
    user,
    setUser,
    token,
    refreshToken,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    logoutAllDevices,
    verifyDevice,
    completeSignup,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
