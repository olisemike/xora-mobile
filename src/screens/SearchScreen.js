import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import PostMedia from '../components/PostMedia';

const TABS = ['all', 'people', 'tags', 'posts'];

const SearchScreen = () => {
  const navigation = useNavigation();
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { token } = useAuth();
  const { colors } = useTheme();

  const largeText = settings.textSizeLarge;
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [recentSearches, setRecentSearches] = useState([]);
  const [results, setResults] = useState({ posts: [], users: [], hashtags: [] });
  const [pagination, setPagination] = useState({ hasMore: false, nextCursor: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, recent, popular

  useEffect(() => {
    const runSearch = async () => {
      const q = query.trim();
      if (!q || !token) {
        setResults({ posts: [], users: [], hashtags: [] });
        setPagination({ hasMore: false, nextCursor: null });
        return;
      }
      if (!isOnline) {
        registerError('You are offline. Search requires a connection.');
        return;
      }
      try {
        const searchType = activeTab === 'all' ? 'all' :
          activeTab === 'people' ? 'users' :
            activeTab === 'tags' ? 'hashtags' : 'posts';

        const options = {
          type: searchType,
          limit: 20,
          sort: sortBy,
        };

        const res = await api.searchAll(token, q, options);
        setResults({
          users: res.users,
          posts: res.posts,
          hashtags: res.hashtags,
        });
        setPagination(res.pagination || { hasMore: false, nextCursor: null });
      } catch (e) {
        if (__DEV__) console.error('Search failed:', e);
        registerError('Search failed. Please try again.');
        setResults({ posts: [], users: [], hashtags: [] });
        setPagination({ hasMore: false, nextCursor: null });
      }
    };

    const handle = setTimeout(runSearch, 350);
    return () => clearTimeout(handle);
  }, [query, token, isOnline, registerError, activeTab, sortBy]);

  const loadMore = async () => {
    if (!pagination.hasMore || isLoadingMore || !query.trim()) return;

    setIsLoadingMore(true);
    try {
      const searchType = activeTab === 'all' ? 'all' :
        activeTab === 'people' ? 'users' :
          activeTab === 'tags' ? 'hashtags' : 'posts';

      const options = {
        type: searchType,
        limit: 20,
        sort: sortBy,
        cursor: pagination.nextCursor,
      };

      const res = await api.searchAll(token, query.trim(), options);

      setResults(prev => ({
        users: [...prev.users, ...res.users],
        posts: [...prev.posts, ...res.posts],
        hashtags: [...prev.hashtags, ...res.hashtags],
      }));

      setPagination(res.pagination || { hasMore: false, nextCursor: null });
    } catch (e) {
      if (__DEV__) console.error('Load more failed:', e);
      registerError('Failed to load more results.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const recordSearch = (term) => {
    const q = term.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((v) => v !== q)];
      return next.slice(0, 5);
    });
  };

  const handleSelectRecent = (term) => {
    setQuery(term);
  };

  const showPeople = activeTab === 'all' || activeTab === 'people';
  const showTags = activeTab === 'all' || activeTab === 'tags';
  const showPosts = activeTab === 'all' || activeTab === 'posts';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <TextInput
          autoFocus
          placeholder="Search people, tags, posts..."
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.searchInput,
            largeText && styles.searchInputLarge,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.textSecondary },
          ]}
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.tabActive, { backgroundColor: colors.surface }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab === 'all' ? 'All' : (tab && tab.length > 0 ? tab.charAt(0).toUpperCase() + tab.slice(1) : '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!query ? (
          <>
            {recentSearches.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent</Text>
                {recentSearches.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={styles.recentRow}
                    onPress={() => handleSelectRecent(term)}
                  >
                    <Ionicons
                      color={colors.textSecondary}
                      name="time-outline"
                      size={18}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.recentText, { color: colors.text }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Start typing to search across people, tags, and posts.</Text>
          </>
        ) : (
          <>
            {(activeTab === 'all' || activeTab === 'posts') && (
              <View style={styles.sortContainer}>
                <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'relevance' && [styles.sortOptionActive, { backgroundColor: colors.primary }]]}
                  onPress={() => setSortBy('relevance')}
                >
                  <Text style={[styles.sortText, sortBy === 'relevance' && styles.sortTextActive]}>Relevant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'recent' && [styles.sortOptionActive, { backgroundColor: colors.primary }]]}
                  onPress={() => setSortBy('recent')}
                >
                  <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>Recent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === 'popular' && [styles.sortOptionActive, { backgroundColor: colors.primary }]]}
                  onPress={() => setSortBy('popular')}
                >
                  <Text style={[styles.sortText, sortBy === 'popular' && styles.sortTextActive]}>Popular</Text>
                </TouchableOpacity>
              </View>
            )}

            {showTags ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tags</Text>
                {results.hashtags.length === 0 ? (
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>No tags match “{query}”</Text>
                ) : null}
                {results.hashtags.map((tag, index) => {
                  const tagLabel = tag?.tag || '';
                  const postCount = Number(tag?.postCount) || 0;

                  return (
                    <TouchableOpacity
                      key={tagLabel || `tag-${index}`}
                      style={[styles.resultRow, { backgroundColor: colors.surface }]}
                      onPress={() => {
                        if (!tagLabel) return;
                        recordSearch(query);
                        navigation.navigate('Hashtag', { tag: tagLabel });
                      }}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons color="#FFFFFF" name="pricetag" size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultTitle, largeText && styles.resultTitleLarge, { color: colors.text }]}>
                          #{tagLabel || 'tag'}
                        </Text>
                        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                          {postCount > 0 ? `${postCount} ${postCount === 1 ? 'post' : 'posts'}` : 'Hashtag'}
                        </Text>
                      </View>
                      <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}

            {showPeople && Boolean(results.users.length) ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>People</Text>
                {results.users.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.resultRow, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      recordSearch(query);
                      navigation.navigate('UserProfile', { user: u });
                    }}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>{(u.name || 'U')[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultTitle, largeText && styles.resultTitleLarge, { color: colors.text }]}>
                        {u.name}
                      </Text>
                      <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>@{u.username}</Text>
                    </View>
                    <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
                  </TouchableOpacity>
                ))}
              </>
            ) : null}

            {showPosts ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Posts</Text>
                {results.posts.length === 0 ? <Text style={[styles.empty, { color: colors.textSecondary }]}>No posts match “{query}”</Text> : null}

                {results.posts.map((post) => {
                  const isShared = post.kind === 'share' && post.original;
                  const original = isShared ? post.original : post;

                  // Handle media array - try multiple sources (handles both normalized and non-normalized responses)
                  let mediaArray = [];
                  if (Array.isArray(original.media)) {
                    mediaArray = original.media;
                  } else if (original.media_urls) {
                    if (typeof original.media_urls === 'string') {
                      try {
                        const parsed = JSON.parse(original.media_urls);
                        mediaArray = Array.isArray(parsed) ? parsed : [];
                      } catch {
                        mediaArray = [];
                      }
                    } else if (Array.isArray(original.media_urls)) {
                      mediaArray = original.media_urls;
                    }
                  }

                  // Handle sensitive content blurring
                  const isSensitive = Boolean(original.isSensitive ?? original.is_sensitive);
                  const shouldBlurSensitive = isSensitive && Boolean(original.isBlurred);

                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={[styles.postCard, { backgroundColor: colors.surface }]}
                      onPress={() => {
                        recordSearch(query);
                        navigation.navigate('PostDetail', { postId: post.id });
                      }}
                    >
                      {/* Header */}
                      <View style={styles.postHeader}>
                        <View style={styles.userInfo}>
                          <Text style={[styles.username, { color: colors.text }]}>{post.author?.username || 'Unknown'}</Text>
                          {isShared && (
                            <Text style={[styles.sharedText, { color: colors.textSecondary }]}>shared</Text>
                          )}
                        </View>
                      </View>

                      {/* Content */}
                      {shouldBlurSensitive && (
                        <View style={[styles.sensitiveWarning, { backgroundColor: colors.warning || '#FF9500' }]}>
                          <Ionicons name="alert-circle" size={14} color="#fff" />
                          <Text style={styles.sensitiveWarningText}>Sensitive content</Text>
                        </View>
                      )}
                      <Text style={[styles.postContent, largeText && styles.postContentLarge, { color: colors.text }]}>
                        {original.content}
                      </Text>

                      {/* Media */}
                      {mediaArray.length > 0 && (
                        <PostMedia
                          media={mediaArray}
                          style={styles.mediaContainer}
                          imageStyle={styles.postImage}
                          showVideoControls={false}
                          autoPlayVideo={settings.mediaAutoplayMobile}
                          allowInlineVideoPlayback={false}
                          blurSensitive={shouldBlurSensitive}
                          sensitiveLabel="Sensitive content"
                          onMediaPress={(mediaIndex, mediaItem) => {
                            const mediaType = mediaItem.type || (mediaItem.uri?.includes('.mp4') ? 'video' : 'image');
                            if (mediaType === 'video') {
                              navigation.navigate('PostDetail', { postId: post.id });
                            }
                          }}
                        />
                      )}

                      {/* Footer - Removed engagement counts to keep it clean like bookmarks */}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}
          </>
        )}
        {pagination.hasMore && query && (
          <View style={styles.loadMoreContainer}>
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: colors.primary }]}
              onPress={loadMore}
              disabled={isLoadingMore}
            >
              <Text style={[styles.loadMoreText, { color: '#FFFFFF' }]}>
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!pagination.hasMore && query && (results.posts.length > 0 || results.users.length > 0 || results.hashtags.length > 0) && (
          <View style={[styles.endOfListContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.endOfListText, { color: colors.text }]}>
              End of List
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 32,
    paddingBottom: 10,
    borderBottomWidth: 1,

  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 2,
  },
  searchInputLarge: { fontSize: 18 },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderBottomWidth: 1,

    paddingVertical: 6,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tabActive: {

  },
  tabText: {
    fontSize: 13,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  content: { padding: 12 },
  helper: { fontSize: 14, marginTop: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  empty: { fontSize: 13, marginBottom: 4 },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 14,
    marginRight: 12,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  sortOptionActive: {
    // backgroundColor is set dynamically
  },
  sortText: {
    fontSize: 13,
    color: '#666',
  },
  sortTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: { fontWeight: 'bold' },
  resultTitle: { fontSize: 15, fontWeight: '600' },
  resultTitleLarge: { fontSize: 17 },
  resultSubtitle: { fontSize: 13 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postSnippet: { fontSize: 14 },
  postSnippetLarge: { fontSize: 16 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  recentText: {
    fontSize: 14,
  },
  postCard: {
    borderRadius: 12,
    minHeight: 120,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  sharedText: {
    fontSize: 12,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  postContentLarge: {
    fontSize: 17,
    lineHeight: 24,
  },
  sensitiveWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  sensitiveWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  mediaContainer: {
    minHeight: 400,  //edited from 120 to 400 to better accomodate videos and multiple images without looking cramped
    maxHeight: 400,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 12,
    marginLeft: 2,
    marginRight: 8,
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfListContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 8,
  },
  endOfListText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SearchScreen;
