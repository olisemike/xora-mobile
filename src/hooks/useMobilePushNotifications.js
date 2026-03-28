import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import api from '../services/api';

/**
 * Mobile Push Notifications Hook
 * Handles Expo push token registration and notification listeners
 */
export const useMobilePushNotifications = (userId, token) => {
  const listenersRef = useRef({ notification: null, response: null });
  const lastRegisteredRef = useRef({ userId: null, expoPushToken: null });

  // Configure notification handler
  useEffect(() => {
    if (!Device.isDevice) return;

    Notifications.setNotificationHandler({
      handleNotification: () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  // Register for push notifications
  useEffect(() => {
    if (!userId || !token || !Device.isDevice) return;

    let isMounted = true;
    const listeners = listenersRef.current;

    const registerPushToken = async () => {
      try {
        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          if (__DEV__) console.warn('[Push] Notification permission not granted');
          return;
        }

        // Get Expo push token
        const expoPushTokenResponse = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = expoPushTokenResponse.data;

        if (__DEV__) console.warn('[Push] Expo push token:', expoPushToken);

        // Send to backend (deduped by user + token pair)
        if (expoPushToken && token) {
          try {
            const alreadyRegistered =
              lastRegisteredRef.current.userId === userId
              && lastRegisteredRef.current.expoPushToken === expoPushToken;

            if (!alreadyRegistered) {
              await api.registerExpoPushToken(token, expoPushToken);
              lastRegisteredRef.current = { userId, expoPushToken };
              if (__DEV__) console.warn('[Push] Token registered with backend');
            } else if (__DEV__) {
              console.warn('[Push] Token already registered for user, skipping backend call');
            }
          } catch (e) {
            if (__DEV__) console.error('[Push] Failed to register token:', e.message);
          }
        }

        // Setup Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
            enableLights: true,
            enableVibration: true,
          });
        }

        // Only set up listeners if component is still mounted
        if (!isMounted) return;

        // Listen for notifications
        listeners.notification = Notifications.addNotificationReceivedListener((notification) => {
          if (__DEV__) console.warn('[Push] Notification received:', notification);
          // Handle foreground notification
          handleNotification(notification);
        });

        // Listen for notification responses (taps)
        listeners.response = Notifications.addNotificationResponseReceivedListener((response) => {
          if (__DEV__) console.warn('[Push] Notification tapped:', response);
          handleNotificationTap(response);
        });

      } catch (error) {
        if (__DEV__) console.error('[Push] Setup failed:', error);
      }
    };

    registerPushToken();

    return () => {
      isMounted = false;

      // Clean up listeners using the subscription's remove() method
      if (listeners.notification) {
        listeners.notification.remove();
        listeners.notification = null;
      }
      if (listeners.response) {
        listeners.response.remove();
        listeners.response = null;
      }
    };
  }, [userId, token]);

  return null;
};

/**
 * Handle foreground notification
 */
function handleNotification(notification) {
  const { request } = notification;
  const { content } = request;
  const { title, body, data } = content;

  if (__DEV__) console.warn('[Push] Notification content:', { title, body, data });

  // Dispatch custom event for app-level handling
  // (In React Native, you might use Redux, Context, or custom events)
  if (global.notificationHandlers) {
    global.notificationHandlers.forEach(handler => {
      try {
        handler({ title, body, data, notification });
      } catch (e) {
        if (__DEV__) console.error('[Push] Error in notification handler:', e);
      }
    });
  }
}

/**
 * Handle notification tap/response
 */
function handleNotificationTap(response) {
  const { notification } = response;
  const { request } = notification;
  const { content } = request;
  const { data } = content;

  if (__DEV__) console.warn('[Push] Notification tapped, data:', data);

  // Navigate based on notification data
  if (data?.type === 'like' && data?.postId) {
    // Navigate to post detail
    if (global.navigationRef) {
      global.navigationRef.navigate('PostDetail', { postId: data.postId });
    }
  } else if (data?.type === 'follow' && data?.userId) {
    // Navigate to user profile
    if (global.navigationRef) {
      global.navigationRef.navigate('UserProfile', { userId: data.userId });
    }
  } else if (data?.type === 'message' && data?.conversationId) {
    // Navigate to messages
    if (global.navigationRef) {
      global.navigationRef.navigate('Chat', { conversationId: data.conversationId });
    }
  }
}

/**
 * Register a global notification handler
 */
export function addNotificationHandler(handler) {
  if (!global.notificationHandlers) {
    global.notificationHandlers = [];
  }
  global.notificationHandlers.push(handler);

  return () => {
    global.notificationHandlers = global.notificationHandlers.filter(h => h !== handler);
  };
}
