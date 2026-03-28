import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { API_URL } from '../services/api';

/**
 * Unified WebSocket hook for all real-time updates
 * Handles: posts, comments, likes, bookmarks, shares, reels, stories, follows, etc.
 */
export const useRealtimeUpdates = (userId, token, callbacks = {}) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const pendingRefreshesRef = useRef(new Set());
  const callbacksRef = useRef(callbacks); // Store callbacks in ref to avoid reconnects
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const lastNetworkConnectedRef = useRef(true);
  const maxReconnectAttempts = 8;
  const DEBOUNCE_DELAY = 500; // 500ms debounce

  const getReconnectDelayMs = useCallback((attempt) => {
    // Stable, low-stress reconnect profile:
    // 2s, 4s, 8s, 16s, then cap near 30s with jitter.
    const baseDelay = Math.min(2000 * Math.pow(2, attempt), 30000);
    const jitter = Math.floor(Math.random() * 2000); // 0-2s jitter to avoid synchronized reconnect storms
    return baseDelay + jitter;
  }, []);

  // Update callbacks ref when callbacks change (without triggering reconnect)
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Debounced feed refresh handler
  const debouncedFeedRefresh = useCallback((feedType) => {
    // Add to pending refreshes
    pendingRefreshesRef.current.add(feedType);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      // Execute all pending refreshes
      const feedTypes = Array.from(pendingRefreshesRef.current);
      pendingRefreshesRef.current.clear();

      if (callbacksRef.current.onFeedRefresh) {
        feedTypes.forEach(type => {
          callbacksRef.current.onFeedRefresh(type);
        });
      }
    }, DEBOUNCE_DELAY);
  }, []);

  const handleMessage = useCallback((data) => {
    const { type, action } = data;
    const cbs = callbacksRef.current;

    switch (type) {
    case 'post_action':
      if (cbs.onPostAction) {
        cbs.onPostAction(action, data.post);
      }
      break;

    case 'comment_action':
      if (cbs.onCommentAction) {
        cbs.onCommentAction(action, data.comment, data.postOwnerId);
      }
      break;

    case 'like_action':
      if (cbs.onLikeAction) {
        cbs.onLikeAction(action, data.like, data.contentOwnerId);
      }
      break;

    case 'bookmark_action':
      if (cbs.onBookmarkAction) {
        cbs.onBookmarkAction(action, data.bookmark);
      }
      break;

    case 'share_action':
      if (cbs.onShareAction) {
        cbs.onShareAction(action, data.share, data.postOwnerId);
      }
      break;

    case 'reel_action':
      if (cbs.onReelAction) {
        cbs.onReelAction(action, data.reel, data.reelOwnerId);
      }
      break;

    case 'story_action':
      if (cbs.onStoryAction) {
        cbs.onStoryAction(action, data.story, data.storyOwnerId);
      }
      break;

    case 'follow_action':
      if (cbs.onFollowAction) {
        cbs.onFollowAction(action, data.follow);
      }
      break;

    case 'profile_update':
      if (cbs.onProfileUpdate) {
        cbs.onProfileUpdate(data.userId, data.updatedFields);
      }
      break;

    case 'message_action':
      if (cbs.onMessageAction) {
        const conversationId =
          data.conversationId ||
          data?.message?.conversationId ||
          data?.data?.conversationId ||
          data?.message?.conversation_id ||
          data?.data?.conversation_id;
        const message = data.message || data.data?.message || data;
        cbs.onMessageAction(action, message, conversationId);
      }
      break;

    case 'feed_refresh':
      // Use debounced refresh instead of immediate
      debouncedFeedRefresh(data.feedType);
      break;

    case 'notification':
      if (cbs.onNotification) {
        cbs.onNotification(data);
      }
      break;

    case 'engagement_update':
      // Real-time engagement count updates for posts in feed
      if (cbs.onEngagementUpdate) {
        cbs.onEngagementUpdate(data.postId, data.engagementType, data.counts);
      }
      break;

    default:
      if (cbs.onUnknown) {
        cbs.onUnknown(data);
      }
    }
  }, [debouncedFeedRefresh]);

  const connect = useCallback(() => {
    if (!userId || !token) {
      if (__DEV__) console.warn('[RealtimeUpdates] Skipping connection - missing userId or token', {
        hasUserId: !!userId,
        hasToken: !!token,
      });
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      // Pass token via both query parameter (reliable) and Sec-WebSocket-Protocol header (secure)
      const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const url = `${wsUrl}/notifications/stream?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;

      if (__DEV__) console.warn('[RealtimeUpdates] Connecting', {
        wsBaseUrl: wsUrl,
        userId,
        hasToken: !!token,
      });
      const ws = new WebSocket(url, ['bearer', token]);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) {
          try { ws.close(); } catch { /* ignore */ }
          return;
        }
        if (__DEV__) console.warn('[RealtimeUpdates] Connected', { userId });
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send ping every 30 seconds to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            return; // Ignore pong responses
          }

          if (__DEV__) console.info('[RealtimeUpdates] Received:', data);
          handleMessage(data);
        } catch (error) {
          if (__DEV__) console.error('[RealtimeUpdates] Parse error:', error);
        }
      };

      ws.onerror = (error) => {
        if (wsRef.current !== ws) return;
        if (__DEV__) console.error('[RealtimeUpdates] WebSocket error occurred', error?.message || 'Connection error');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        if (wsRef.current !== ws) return;
        if (__DEV__) {
          console.warn('[RealtimeUpdates] Disconnected', {
            userId,
            code: event?.code,
            reason: event?.reason,
            wasClean: event?.wasClean,
          });
        }
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect with stable exponential backoff and jitter
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = getReconnectDelayMs(reconnectAttempts.current);
          if (__DEV__) console.warn(`[RealtimeUpdates] Reconnecting in ${delay / 1000}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          if (__DEV__) console.warn('[RealtimeUpdates] Max reconnect attempts reached, waiting for next app/network/token cycle');
        }
      };
    } catch (error) {
      if (__DEV__) console.error('[RealtimeUpdates] Connection failed:', error?.message || error);
      setIsConnected(false);

      // Attempt reconnect on connection failure with stable backoff and jitter
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = getReconnectDelayMs(reconnectAttempts.current);
        if (__DEV__) console.warn(`[RealtimeUpdates] Retrying connection in ${delay / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    }
  }, [userId, token, handleMessage, getReconnectDelayMs]);

  const triggerWakeReconnect = useCallback((reason) => {
    if (!userId || !token) return;

    const ws = wsRef.current;
    const isOpen = ws && ws.readyState === WebSocket.OPEN;
    if (isOpen) return;

    if (__DEV__) console.warn(`[RealtimeUpdates] Wake reconnect triggered (${reason})`);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectAttempts.current = 0;
    connect();
  }, [userId, token, connect]);

  useEffect(() => {
    connect();

    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close WebSocket
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Wake-up reconnect: app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if ((prevState === 'background' || prevState === 'inactive') && nextState === 'active') {
        triggerWakeReconnect('app-foreground');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [triggerWakeReconnect]);

  // Wake-up reconnect: network comes back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected) && (state.isInternetReachable !== false);
      const wasConnected = lastNetworkConnectedRef.current;
      lastNetworkConnectedRef.current = isConnected;

      if (!wasConnected && isConnected) {
        triggerWakeReconnect('network-restored');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [triggerWakeReconnect]);

  return { isConnected };
};
