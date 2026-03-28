import React, { useEffect, useMemo, useState, Component } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppData } from '../contexts/AppDataContext';
import api from '../services/api';

const TABS = [
  { key: 'all' },
  { key: 'mentions' },
  { key: 'system' },
];

// Error Boundary for notification rendering
class NotificationErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (__DEV__) console.error('Notification render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 12, opacity: 0.5 }}>
          <Text style={{ color: '#999', fontSize: 13 }}>Unable to display notification</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Group similar notifications together to reduce spam
 * e.g., "John, Jane, and 3 others liked your post"
 */
const groupNotifications = (notifications) => {
  const grouped = [];
  const groupMap = new Map();

  for (const notif of notifications) {
    // Group likes and follows by target (postId for likes, null for follows)
    const groupKey = notif.type === 'like' && notif.postId
      ? `like:${notif.postId}`
      : notif.type === 'follow'
        ? 'follow:recent'
        : null;

    if (groupKey && !notif.read) {
      const existing = groupMap.get(groupKey);
      if (existing) {
        existing.actors.push({ name: notif.actorName, username: notif.actorUsername });
        existing.count++;
        // Keep the most recent time
        if (notif.createdAtMs > (existing.createdAtMs || 0)) {
          existing.createdAtMs = notif.createdAtMs;
          existing.time = notif.time;
        }
      } else {
        groupMap.set(groupKey, {
          ...notif,
          actors: [{ name: notif.actorName, username: notif.actorUsername }],
          count: 1,
          isGrouped: true,
        });
      }
    } else {
      grouped.push(notif);
    }
  }

  // Convert grouped notifications to display format
  for (const [, group] of groupMap) {
    if (group.count > 1) {
      const firstTwo = group.actors.slice(0, 2).map(a => a.name || a.username || 'Someone');
      const othersCount = group.count - 2;
      group.message = othersCount > 0
        ? `${firstTwo.join(', ')} and ${othersCount} other${othersCount > 1 ? 's' : ''} ${group.type === 'like' ? 'liked your post' : 'followed you'}`
        : `${firstTwo.join(' and ')} ${group.type === 'like' ? 'liked your post' : 'followed you'}`;
    }
    grouped.push(group);
  }

  // Sort unread first, then by newest
  return grouped.sort((a, b) => {
    const readA = a.read ? 1 : 0;
    const readB = b.read ? 1 : 0;
    if (readA !== readB) return readA - readB;
    const timeA = a.createdAtMs || 0;
    const timeB = b.createdAtMs || 0;
    return timeB - timeA;
  });
};

const NotificationsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const tf = (key, fallback) => {
    const v = t(key);
    return v === key ? (fallback || key) : v;
  };
  const { settings } = useSettings();
  const { isOnline } = useNetwork();
  const { _user, token } = useAuth();
  const { colors } = useTheme();
  const { setUnreadNotificationCount } = useAppData();
  const largeText = settings.textSizeLarge;
  const { boldText } = settings;

  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [hiddenTypes, setHiddenTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadNotifications = React.useCallback(async (isRefresh = false, cursor = null) => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setLoading(true);
      setHasMore(true);
      setNextCursor(null);
    } else if (!cursor) {
      setLoading(true);
    }

    try {
      const result = await api.getNotifications(token, 20, cursor);
      const rows = result.notifications || [];
      const pagination = result.pagination || { hasMore: false, nextCursor: null };

      const now = Date.now();
      const formatTime = (createdAt) => {
        if (!createdAt) return { label: '', ms: 0 };
        const ms = typeof createdAt === 'number' ? createdAt * 1000 : Date.parse(createdAt);
        if (Number.isNaN(ms)) return { label: '', ms: 0 };
        const diffMs = now - ms;
        const diffMin = Math.max(1, Math.floor(diffMs / 60000));
        if (diffMin < 60) return { label: `${diffMin}m`, ms };
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return { label: `${diffHr}h`, ms };
        const diffDay = Math.floor(diffHr / 24);
        return { label: `${diffDay}d`, ms };
      };

      const mapped = rows.map((n) => {
        const { label, ms } = formatTime(n.createdAt);
        let icon = 'alert-circle';
        if (n.type === 'like') icon = 'heart';
        else if (n.type === 'comment') icon = 'chatbubble';
        else if (n.type === 'follow') icon = 'person-add';
        else if (n.type === 'message') icon = 'mail';

        return {
          id: n.id,
          type: n.type,
          icon,
          message: n.message,
          time: label,
          createdAtMs: ms,
          postId: n.postId,
          userId: n.userId,
          actorName: n.actorName,
          actorUsername: n.actorUsername,
          read: n.read || false,
        };
      });

      if (cursor) {
        // Append to existing notifications (pagination load more)
        setNotifications(prev => [...prev, ...mapped]);
      } else {
        // Replace all notifications (initial load or refresh)
        setNotifications(mapped);
      }

      setHasMore(pagination.hasMore ?? false);
      setNextCursor(pagination.nextCursor ?? null);

      // Update global unread notification count (only on initial load)
      if (!cursor) {
        const unreadCount = mapped.filter((n) => !n.read).length;
        setUnreadNotificationCount(unreadCount);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to load notifications:', e);
      if (!cursor) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token, setUnreadNotificationCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await loadNotifications(false, nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  };
  const visibleNotifications = useMemo(() => {
    if (settings.muteNotifications || settings.doNotDisturb) {
      return [];
    }

    let items = notifications.filter((n) => {
      if (hiddenTypes.includes(n.type)) return false;
      if (n.type === 'like' && !settings.likesReactions) return false;
      if (n.type === 'comment' && !settings.commentsReplies) return false;
      if (n.type === 'follow' && !settings.newFollowers) return false;
      if (n.type === 'message' && !settings.messageNotifications) return false;
      return true;
    });

    if (activeTab === 'mentions') {
      items = items.filter(
        (n) => n.type === 'comment' || n.type === 'like' || n.type === 'tag',
      );
    } else if (activeTab === 'system') {
      items = items.filter((n) => n.type === 'system');
    }

    // Group similar notifications (likes on same post, multiple follows)
    return groupNotifications(items);
  }, [notifications, hiddenTypes, settings, activeTab]);

  const handlePressNotification = (item) => {
    if (item.type === 'like' || item.type === 'comment') {
      if (item.postId) {
        navigation.navigate('PostDetail', { postId: item.postId });
      }
      return;
    }
    if (item.type === 'follow' && item.userId) {
      // Navigate to a backend-backed profile using username when available
      navigation.navigate('UserProfile', {
        user: {
          id: item.userId,
          name: item.actorName || 'User',
          username: item.actorUsername || undefined,
        },
      });
      return;
    }
    if (item.type === 'message') {
      // Open the messages list; future: deep-link into specific conversation
      navigation.navigate('Messages');
      return;
    }
    if (item.type === 'system') {
      navigation.navigate('Security');
    }
  };

  const markAsRead = async (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      // Update global unread count
      const unreadCount = updated.filter((n) => !n.read).length;
      setUnreadNotificationCount(unreadCount);
      return updated;
    });
    if (!token) return;
    try {
      await api.markNotificationRead(token, id);
    } catch (e) {
      if (__DEV__) console.error('Failed to mark notification read on backend:', e);
    }
  };

  const hideType = (type) => {
    setHiddenTypes((prev) =>
      prev.includes(type) ? prev : [...prev, type],
    );
  };

  const renderItem = ({ item }) => (
    <NotificationErrorBoundary>
      <View style={[styles.item, item.read && styles.itemRead, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.itemMain}
          onPress={() => handlePressNotification(item)}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
              <Ionicons color={colors.primary} name={item.icon} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={item.isGrouped ? 3 : 2}
                style={[styles.message, largeText && styles.messageLarge, boldText && styles.messageBold, { color: colors.text }]}
              >
                {item.message}
              </Text>
              {item.isGrouped && item.count > 1 ? (
                <Text style={[styles.groupCount, { color: colors.primary }]}>
                  {item.count} notifications grouped
                </Text>
              ) : null}
              <Text style={[styles.time, { color: colors.textSecondary }]}>{item.time} ago</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.itemActions}>
          {!item.read ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface }]}
              onPress={() => markAsRead(item.id)}
            >
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Mark read</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => hideType(item.type)}
          >
            <Ionicons
              color={colors.textSecondary}
              name="eye-off-outline"
              size={18}
            />
          </TouchableOpacity>
        </View>
      </View>
    </NotificationErrorBoundary>
  );

  const data = visibleNotifications;
  const isMuted = settings.muteNotifications || settings.doNotDisturb;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>
          {tf('notificationsTitle', 'Notifications')}
        </Text>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={async () => {
            try {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              // Update global unread count to 0
              setUnreadNotificationCount(0);
              if (token) {
                await api.markAllNotificationsRead(token);
              }
            } catch (e) {
              if (__DEV__) console.error('Failed to mark all notifications read:', e);
            }
          }}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            {tf('notificationsMarkAllRead', 'Mark all')}
          </Text>
        </TouchableOpacity>
      </View>

      {!isOnline ? (
        <View style={[styles.offlineBanner, { backgroundColor: colors.surface }]}>
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            {tf('notificationsOffline', 'You are offline. Notifications may be out of date.')}
          </Text>
        </View>
      ) : null}

      {isMuted && data.length === 0 ? (
        <View style={[styles.mutedBanner, { backgroundColor: colors.surface }]}>
          <Text style={[styles.mutedText, { color: colors.textSecondary }]}>
            {tf(
              'notificationsMuted',
              'Notifications are muted. Turn on all notifications in Settings to see notifications.',
            )}
          </Text>
        </View>
      ) : null}

      {data.length > 0 && (
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            let label = '';
            if (tab.key === 'all') {
              label = tf('notificationsAll', 'All');
            } else if (tab.key === 'mentions') {
              label = tf('notificationsMentions', 'Mentions');
            } else if (tab.key === 'system') {
              label = tf('notificationsSystem', 'System');
            }
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive, { backgroundColor: active ? colors.primary : colors.surface }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive, { color: active ? colors.onPrimary : colors.textSecondary }]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        contentContainerStyle={
          data.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading && notifications.length > 0}
            tintColor={colors.primary}
            onRefresh={() => loadNotifications(true)}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {tf('notificationsLoading', 'Loading notifications...')}
            </Text>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {tf(
                'notifications.emptyHelp',
                'Notifications you turn off, mute, or hide will stop appearing here.',
              )}
            </Text>
          )
        }
        ListFooterComponent={
          isLoadingMore && hasMore ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading more notifications...
              </Text>
            </View>
          ) : !hasMore && data.length > 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                {tf('notificationsEndOfList', 'End of List')}
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
        onEndReached={() => {
          if (hasMore && !isLoadingMore && !loading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerTitleLarge: { fontSize: 22 },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBanner: {
    padding: 10,
  },
  offlineText: { fontSize: 13 },
  mutedBanner: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  mutedText: {
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabActive: {
  },
  tabLabel: {
    fontSize: 13,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  listContainer: { padding: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemRead: {
    opacity: 0.6,
  },
  itemMain: {
    flex: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  message: { fontSize: 14 },
  messageLarge: { fontSize: 16 },
  messageBold: { fontWeight: '700' },
  groupCount: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  time: { fontSize: 12, marginTop: 2 },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  actionText: {
    fontSize: 11,
  },
  iconAction: {
    padding: 4,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  loadingText: { fontSize: 14 },
  endOfListText: { fontSize: 14, fontWeight: '500' },
});

export default NotificationsScreen;
