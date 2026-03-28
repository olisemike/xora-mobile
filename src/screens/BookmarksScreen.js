import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppData } from '../contexts/AppDataContext';
import api from '../services/api';
import HashtagText from '../components/HashtagText';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import PostMedia from '../components/PostMedia';

const BookmarksScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { _isOnline, registerError } = useNetwork();
  const { token } = useAuth();
  const { colors } = useTheme();
  const { toggleBookmark } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const largeText = settings.textSizeLarge;

  const loadBookmarks = async (isRefresh = false, cursor = null) => {
    if (!token) {
      setBookmarkedPosts([]);
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
      setHasMore(true);
      setNextCursor(null);
    } else if (!cursor) {
      setLoading(true);
    }

    try {
      const data = await api.getBookmarks(token, 20, cursor);

      // Handle response - api.getBookmarks may return array or object with pagination
      const bookmarks = Array.isArray(data) ? data : (data?.bookmarks || data?.items || []);
      const pagination = data?.pagination || { hasMore: false, cursor: null };

      if (cursor) {
        // Append to existing bookmarks (pagination load more)
        setBookmarkedPosts(prev => [...prev, ...bookmarks]);
      } else {
        // Replace all bookmarks (initial load or refresh)
        setBookmarkedPosts(bookmarks);
      }

      setHasMore(pagination.hasMore ?? false);
      setNextCursor(pagination.cursor ?? null);
    } catch (e) {
      if (__DEV__) console.error('Failed to load bookmarks:', e);
      registerError('Failed to load bookmarks.');
      if (!cursor) {
        setBookmarkedPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await loadBookmarks(false, nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks(true);
  };

  const renderItem = ({ item }) => {
    const original = item?.kind === 'share' && item?.original ? item.original : item;
    const author = original?.author || item?.author || {};
    const handlePressPost = () => {
      navigation.navigate('PostDetail', { postId: original?.id || item.id });
    };

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={handlePressPost}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}
          >
            <AvatarPlaceholder size={36} avatarUrl={author?.avatar} />
          </View>
          <View>
            <Text style={[styles.userName, largeText && styles.userNameLarge, { color: colors.text }]}>{author.name || 'User'}</Text>
            <Text style={[styles.userUsername, largeText && styles.userUsernameLarge, { color: colors.textSecondary }]}>@{author.username || 'user'}</Text>
          </View>
        </View>
        <HashtagText
          style={[styles.content, largeText && styles.contentLarge, { color: colors.text }]}
          text={original?.content || ''}
          onPressHashtag={(tag) => navigation.navigate('Hashtag', { tag })}
          onPressMention={(username) => navigation.navigate('UserProfile', { username })}
        />
        {Array.isArray(original?.media) && original.media.length > 0 ? (
          <PostMedia
            media={original.media}
            style={styles.mediaContainer}
            imageStyle={styles.postImage}
            showVideoControls={false}
            autoPlayVideo={settings.mediaAutoplayMobile}
            allowInlineVideoPlayback={false}
            onMediaPress={(mediaIndex, mediaItem) => {
              const mediaType = mediaItem.type || (mediaItem.uri?.includes('.mp4') ? 'video' : 'image');
              if (mediaType === 'video') {
                navigation.navigate('PostDetail', { postId: original?.id || item.id });
              }
            }}
          />
        ) : original?.image ? (
          <Image source={{ uri: original.image }} style={styles.image} />
        ) : null}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.removeButton, { borderColor: colors.border }]}
            onPress={async () => {
              const targetId = original?.id || item.id;
              try {
                await toggleBookmark(targetId);
                setBookmarkedPosts((prev) => prev.filter((p) => (p?.original?.id || p?.id) !== targetId));
              } catch (e) {
                if (__DEV__) console.error('Failed to remove bookmark:', e);
                registerError('Failed to remove bookmark.');
              }
            }}
          >
            <Ionicons color={colors.textSecondary} name="trash-outline" size={18} />
            <Text style={[styles.removeButtonText, { color: colors.textSecondary }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>
          {t('nav.bookmarks') || 'Bookmarks'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && bookmarkedPosts.length === 0 ? (
        <View style={[styles.emptyContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading bookmarks...</Text>
        </View>
      ) : bookmarkedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons color={colors.textSecondary} name="bookmark-outline" size={48} />
          <Text style={[styles.emptyText, largeText && styles.emptyTextLarge, { color: colors.textSecondary }]}>
            {t('bookmarks.empty') || 'No bookmarks yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={bookmarkedPosts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor="#E91E63"
              onRefresh={handleRefresh}
            />
          }
          renderItem={renderItem}
          onEndReached={() => {
            if (hasMore && !isLoadingMore) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore && hasMore ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more...</Text>
              </View>
            ) : !hasMore && bookmarkedPosts.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
                <Text style={[styles.endOfListText, { color: colors.text }]}>
                  {t('bookmarksEndOfList', 'End of List')}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 32,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleLarge: {
    fontSize: 22,
  },
  listContent: {
    padding: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  sharedHeader: {
    marginBottom: 4,
  },
  sharedText: {
    fontSize: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userNameLarge: {
    fontSize: 18,
  },
  userUsername: {
    fontSize: 13,
  },
  userUsernameLarge: {
    fontSize: 15,
  },
  content: {
    fontSize: 14,
    marginTop: 4,
  },
  contentLarge: {
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginTop: 8,
  },
  mediaContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
  },
  emptyTextLarge: {
    fontSize: 18,
  },
  loadingText: {
    fontSize: 14,
  },
  endOfListText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BookmarksScreen;
