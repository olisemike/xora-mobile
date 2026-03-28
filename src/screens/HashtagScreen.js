import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import HashtagText from '../components/HashtagText';
import { useTheme } from '../contexts/ThemeContext';
import PostMedia from '../components/PostMedia';

const HashtagScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { tag } = route.params || {};
  const { settings } = useSettings();
  const { token } = useAuth();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;
  const [taggedPosts, setTaggedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadPosts = async (isRefresh = false, cursor = null) => {
    if (!token || !tag) {
      setTaggedPosts([]);
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setHasMore(true);
      setNextCursor(null);
    } else if (!cursor) {
      setLoading(true);
    }

    try {
      const posts = await api.searchPostsByHashtag(token, tag.replace(/^#/, ''), 20, cursor);

      // Handle response - api may return array or object with pagination
      const postsArray = Array.isArray(posts) ? posts : (posts?.posts || posts?.items || []);
      const pagination = posts?.pagination || { hasMore: false, cursor: null };

      if (cursor) {
        // Append to existing posts (pagination load more)
        setTaggedPosts(prev => [...prev, ...postsArray]);
      } else {
        // Replace all posts (initial load or refresh)
        setTaggedPosts(postsArray);
      }

      setHasMore(pagination.hasMore ?? false);
      setNextCursor(pagination.cursor ?? null);
    } catch (e) {
      if (__DEV__) console.error('Failed to load hashtag posts:', e);
      if (!cursor) {
        setTaggedPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tag]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await loadPosts(false, nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!tag) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }] }>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }] }>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hashtag</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Invalid hashtag</Text>
        </View>
      </View>
    );
  }


  const renderItem = ({ item }) => {
    const isShared = item.kind === 'share' && item.original;
    const original = isShared ? item.original : item;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }] }>
        {isShared ? (
          <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
            {`${original.author?.name || 'User'}’s post shared by ${item.sharedBy?.name || 'User'}`}
          </Text>
        ) : null}
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }] }>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{(original.author?.name || 'U')[0]}</Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.text }, largeText && styles.userNameLarge]}>{original.author?.name || 'User'}</Text>
            <Text style={[styles.username, { color: colors.textSecondary }, largeText && styles.usernameLarge]}>@{original.author?.username || 'user'}</Text>
          </View>
        </View>
        <HashtagText
          style={[styles.content, { color: colors.text }, largeText && styles.contentLarge]}
          text={original.content}
          onPressHashtag={(nextTag) => {
            if (nextTag !== tag) {
              navigation.push('Hashtag', { tag: nextTag });
            }
          }}
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
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, largeText && styles.headerTitleLarge]}>#{tag.startsWith('#') ? tag.slice(1) : tag}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && taggedPosts.length === 0 ? (
        <View style={[styles.emptyContainer, { justifyContent: 'center' }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading posts...</Text>
        </View>
      ) : taggedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }, largeText && styles.emptyTextLarge]}>
            {t('hashtag.empty') || 'No posts for this hashtag yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={taggedPosts}
          keyExtractor={(item) => item.id}
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
            ) : !hasMore && taggedPosts.length > 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 }}>
                <Text style={[styles.endOfListText, { color: colors.text }]}>
                  {t('hashtagEndOfList', 'End of List')}
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
    paddingTop: 50,
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
  sharedText: {
    fontSize: 12,
    marginBottom: 4,
  },
  headerRow: {
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
  username: {
    fontSize: 13,

  },
  usernameLarge: {
    fontSize: 15,
  },
  content: {
    fontSize: 14,

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
    minHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

export default HashtagScreen;
