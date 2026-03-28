import { useEffect, useRef, useState, useCallback } from 'react';

import { API_URL } from '../services/api';

/**
 * WebSocket hook for real-time chat messaging
 * Connects to ChatRoom Durable Object for a specific conversation
 */
export const useChatWebSocket = (conversationId, token, onMessage, onError) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const isManualCloseRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const connect = useCallback(async () => {
    if (!conversationId || !token) {
      return;
    }

    if (isConnectingRef.current) {
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    isConnectingRef.current = true;

    try {
      let wsUrl = null;

      try {
        const response = await fetch(`${API_URL}/conversations/${encodeURIComponent(conversationId)}/connect`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok && data?.success && data?.data?.wsUrl) {
          wsUrl = data.data.wsUrl;
        }
      } catch {
        // Fallback to direct URL if connect endpoint fails
      }

      if (!wsUrl) {
        // Convert http/https to ws/wss
        const baseWsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        wsUrl = `${baseWsUrl}/chat/${conversationId}`;
      }

      const wsUrlObj = new URL(wsUrl);
      if (!wsUrlObj.searchParams.get('conversationId')) {
        wsUrlObj.searchParams.set('conversationId', conversationId);
      }
      // Add token to URL as query parameter (reliable method)
      wsUrlObj.searchParams.set('token', token);
      const url = wsUrlObj.toString();

      if (__DEV__) console.info('[ChatWebSocket] Connecting to conversation:', conversationId, { hasToken: !!token });
      // Pass token via both query parameter and Sec-WebSocket-Protocol header for redundancy
      wsRef.current = new WebSocket(url, ['bearer', token]);

      wsRef.current.onopen = () => {
        if (__DEV__) console.info('[ChatWebSocket] Connected to conversation:', conversationId);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        wsRef.current.pingInterval = pingInterval;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            return; // Ignore pong responses
          }

          if (data.type === 'new_message') {
            // New message received
            if (onMessageRef.current) {
              onMessageRef.current(data.message);
            }
          } else if (data.type === 'error') {
            if (__DEV__) console.error('[ChatWebSocket] Server error:', data.error);
            if (onErrorRef.current) {
              onErrorRef.current(data.error);
            }
          }
        } catch (error) {
          if (__DEV__) console.error('[ChatWebSocket] Failed to parse message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        if (__DEV__) console.info('[ChatWebSocket] Disconnected from conversation:', conversationId, 'Code:', event.code);
        setIsConnected(false);
        isConnectingRef.current = false;

        // Clear ping interval
        if (wsRef.current?.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }

        if (isManualCloseRef.current) {
          isManualCloseRef.current = false;
          return;
        }

        // Attempt reconnection if not a normal closure (with exponential backoff)
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s (capped at 60s)
          const delay = Math.min(3000 * Math.pow(2, reconnectAttempts.current - 1), 60000);
          if (__DEV__) console.info(`[ChatWebSocket] Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        if (__DEV__) console.error('[ChatWebSocket] Connection error:', error);
        isConnectingRef.current = false;
        if (onErrorRef.current) {
          onErrorRef.current('WebSocket connection failed');
        }
      };

    } catch (error) {
      if (__DEV__) console.error('[ChatWebSocket] Failed to create connection:', error);
      isConnectingRef.current = false;
      if (onErrorRef.current) {
        onErrorRef.current('Failed to establish WebSocket connection');
      }
    }
  }, [conversationId, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      if (__DEV__) console.info('[ChatWebSocket] Manually disconnecting from conversation:', conversationId);
      isManualCloseRef.current = true;
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, [conversationId]);

  const sendMessage = useCallback((messageData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Pass through the message data as-is (caller should provide type: 'send_message', payload: {...})
      wsRef.current.send(JSON.stringify(messageData));
      return true;
    }
    if (__DEV__) console.warn('[ChatWebSocket] Cannot send message - WebSocket not connected');
    return false;

  }, []);

  // Reconnect when conversationId or token changes
  useEffect(() => {
    if (conversationId && token) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [conversationId, token, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};
