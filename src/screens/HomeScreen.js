import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { useAppData } from '../contexts/AppDataContext';
import { useStories } from '../contexts/StoriesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import HashtagText from '../components/HashtagText';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import PostMenu from '../components/PostMenu';
import AdPost from '../components/AdPost';
import PostMedia from '../components/PostMedia';
import { isImportedContent, getImportedPlatform, isTrendingContent, getUserType, getRecommendedFeedType } from '../utils/contentUtils';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { posts, toggleBookmark, bookmarks, sharePost, removePost, refreshFeed, loadMorePosts, hasMorePosts, isLoadingMorePosts, unreadNotificationCount, updatePostLikeState, updatePostShareCount } = useAppData();
  const { stories } = useStories();
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const largeText = settings.textSizeLarge;
  const { boldText } = settings;
  const _reduceMotion = settings.reduceMotion;
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);

  // Sort and group stories: unviewed first, then viewed - grouped by actor
  const groupedStories = useMemo(() => {
    if (!stories || stories.length === 0) return [];

    // Create a map to group stories by actor (user/page)
    const storyMap = new Map();

    stories.forEach(story => {
      const actorId = story.user?.id;
      const actorType = story.user?.type || 'user';
      const key = `${actorId}-${actorType}`;

      if (!storyMap.has(key)) {
        // Store the first story from this actor as the "group representative"
        storyMap.set(key, {
          id: story.id,
          user: story.user,
          image: story.image,
          actorId,
          actorType,
          isViewed: story.viewed_by_me && story.viewed_by_me > 0,
          storyCount: 0,
        });
      }

      // Increment story count for this actor
      const group = storyMap.get(key);
      group.storyCount += 1;

      // If this story is unviewed, make it the representative (so unviewed shows first)
      if (!story.viewed_by_me || story.viewed_by_me === 0) {
        group.isViewed = false;
      }
    });

    // Convert map to array and sort: unviewed first, then viewed
    const grouped = Array.from(storyMap.values());
    const unviewed = grouped.filter(s => !s.isViewed);
    const viewed = grouped.filter(s => s.isViewed);

    return [...unviewed, ...viewed];
  }, [stories]);

  // Smart Feed Mixing: Detect user type and blend content suggestions
  const userType = useMemo(() => getUserType(user), [user]);
  const _recommendedFeedType = useMemo(() => getRecommendedFeedType(userType), [userType]);

  // Smart Feed Mixing: Personalize USER content based on user type
  // Imported content is ALWAYS globally available to everyone
  const blendedPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    // SEPARATE: Imported (always shown) vs User-Generated Content (personalized)
    const importedPosts = posts.filter(p => isImportedContent(p.kind === 'share' ? p.original : p));
    const ugcPosts = posts.filter(p => !isImportedContent(p.kind === 'share' ? p.original : p));

    // NEW USERS: Show more trending/imported (70% imported awareness)
    // LOYAL USERS: Show mostly followed UGC (90% UGC, 10% discovery)
    // REGULAR: Balanced (60% UGC, 40% discovery)

    if (userType === 'new') {
      // New users: 40% UGC + 60% imported/trending (help them discover content)
      const ugcRatio = 0.4;
      const _targetUGC = Math.ceil(posts.length * ugcRatio);

      // Blend: alternate between UGC and imported
      const blended = [];
      let ugcIdx = 0;
      let importedIdx = 0;

      for (let i = 0; i < posts.length; i++) {
        if (i % 5 < 2 && ugcIdx < ugcPosts.length) {
          // 2 out of 5 are UGC
          blended.push(ugcPosts[ugcIdx++]);
        } else if (importedIdx < importedPosts.length) {
          // Rest are imported/discovery
          blended.push(importedPosts[importedIdx++]);
        } else if (ugcIdx < ugcPosts.length) {
          blended.push(ugcPosts[ugcIdx++]);
        }
      }
      return blended;
    } else if (userType === 'loyal') {
      // Loyal users: 85% UGC + 15% imported (keep their proven feed, light discovery)
      const ugcRatio = 0.85;
      const _targetUGC = Math.ceil(posts.length * ugcRatio);

      const blended = [...ugcPosts.slice(0, _targetUGC), ...importedPosts.slice(0, Math.ceil(posts.length * 0.15))];
      return blended;
    } else {
      // Regular users: 60% UGC + 40% imported (balanced)
      const ugcRatio = 0.6;
      const _targetUGC = Math.ceil(posts.length * ugcRatio);

      const blended = [];
      let ugcIdx = 0;
      let importedIdx = 0;

      for (let i = 0; i < posts.length; i++) {
        if (i % 5 < 3 && ugcIdx < ugcPosts.length) {
          // 3 out of 5 are UGC
          blended.push(ugcPosts[ugcIdx++]);
        } else if (importedIdx < importedPosts.length) {
          // Rest are imported
          blended.push(importedPosts[importedIdx++]);
        } else if (ugcIdx < ugcPosts.length) {
          blended.push(ugcPosts[ugcIdx++]);
        }
      }
      return blended;
    }
  }, [posts, userType]);

  const [likedPosts, setLikedPosts] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [visiblePostIds, setVisiblePostIds] = useState(new Set());
  const lastScrollPosRef = useRef(0);
  const shareTimeoutRef = useRef(null);

  // Initialize liked state from posts data (includes is_liked from backend)
  useEffect(() => {
    if (posts && posts.length > 0) {
      const likedState = {};
      posts.forEach((post) => {
        const baseId = post.kind === 'share' && post.original ? post.original.id : post.id;
        const original = post.kind === 'share' ? post.original : post;
        if (original) {
          const likedFlag = original.isLiked ?? original.liked_by_me ?? original.is_liked;
          if (likedFlag !== undefined) {
            likedState[baseId] = Boolean(likedFlag);
          }
        }
      });
      setLikedPosts((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(likedState).forEach((key) => {
          if (next[key] !== likedState[key]) {
            next[key] = likedState[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [posts]);

  useEffect(() => {
    return () => {
      // Cleanup: clear any pending share timeout when component unmounts
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = null;
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (!isOnline) {
      registerError(
        t('common.offline') || 'You are offline. Some actions may not work.',
      );
      setRefreshing(false);
      return;
    }
    try {
      await refreshFeed();
    } catch (e) {
      if (__DEV__) console.error('Refresh feed error:', e);
      registerError('Failed to refresh feed');
    } finally {
      setRefreshing(false);
    }
  }, [isOnline, refreshFeed, registerError, t]);

  // Infinite scroll handler - called when user scrolls near end of list
  const handleEndReached = useCallback(() => {
    if (!isOnline) return; // Don't load more if offline
    if (isLoadingMorePosts) return; // Already loading
    if (!hasMorePosts) return; // No more posts to load
    if (loadMorePosts) {
      loadMorePosts();
    }
  }, [isOnline, isLoadingMorePosts, hasMorePosts, loadMorePosts]);

  // Footer component - shows loading indicator or end-of-list message
  const renderListFooter = useCallback(() => {
    // No footer if we have no posts yet
    if (!posts || posts.length === 0) return null;

    // Show loading indicator while fetching more
    if (isLoadingMorePosts) {
      return (
        <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.text }]}>Loading more posts...</Text>
        </View>
      );
    }

    // Show end-of-feed message if no more posts available
    if (!hasMorePosts) {
      return (
        <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.text} />
          <Text style={[styles.footerText, { color: colors.text }]}>You've reached the end of your feed</Text>
        </View>
      );
    }

    return null;
  }, [isLoadingMorePosts, hasMorePosts, posts, colors]);

  const handleLike = useCallback(async (postId, wasLiked) => {
    const nextLiked = !wasLiked;

    setLikedPosts((prev) => ({
      ...prev,
      [postId]: nextLiked,
    }));

    if (updatePostLikeState) {
      updatePostLikeState(postId, nextLiked);
    }
    if (!token) return;

    try {
      await api.togglePostLike(token, postId, nextLiked, 'user', user?.id);
    } catch (e) {
      if (__DEV__) console.error('Failed to toggle like from feed:', e);
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: wasLiked,
      }));
      if (updatePostLikeState) {
        updatePostLikeState(postId, wasLiked);
      }
    }
  }, [token, user?.id, updatePostLikeState]);

  const handleShare = useCallback(async (item) => {
    if (!token) {
      registerError('You must be logged in to share posts.');
      return;
    }
    const itemBaseId = item.kind === 'share' && item.original ? item.original.id : item.id;

    try {
      await api.sharePost(token, itemBaseId, 'user', user?.id);
      if (updatePostShareCount) {
        updatePostShareCount(itemBaseId, 1);
      }
      // Insert a local share card at the top of the feed so it is visible immediately
      sharePost(item, { type: 'user', id: user?.id, name: user?.name, username: user?.username, avatar: user?.avatar });
      // Refresh feed after a delay to allow backend to process the share
      // Clear any pending timeout first
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => {
        refreshFeed();
        shareTimeoutRef.current = null;
      }, 1500);
      registerError('Post shared.');
    } catch (e) {
      if (__DEV__) console.error('Failed to share post from feed:', e);
      registerError('Could not share this post.');
    }
  }, [token, user?.id, user?.avatar, user?.name, user?.username, sharePost, refreshFeed, registerError, updatePostShareCount]);

  const getBaseId = useCallback((item) => {
    if (item.kind === 'share' && item.original) return item.original.id;
    return item.id;
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const next = new Set();
    viewableItems.forEach(({ item, isViewable }) => {
      if (!isViewable || !item || item.isAd) return;
      const baseId = getBaseId(item);
      if (baseId !== undefined && baseId !== null) {
        next.add(String(baseId));
      }
    });
    setVisiblePostIds(next);
  }, [getBaseId]);

  const displayPosts = blendedPosts;

  const MAX_PREVIEW_CHARS = 220;

  const getPreviewContent = useCallback((content, postId) => {
    if (!content) return '';
    if (content.length <= MAX_PREVIEW_CHARS || expandedPosts[postId]) return content;
    return `${content.slice(0, MAX_PREVIEW_CHARS).trimEnd()}...`;
  }, [expandedPosts]);

  const toggleExpanded = useCallback((postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }, []);

  const renderPostOrAd = useCallback(({ item, index }) => {
    // Show section separator for suggested content (new users only)
    const showSectionHeader = userType === 'new' && index > 0 && index === Math.ceil(displayPosts.length * 0.7);

    return (
      <View>
        {showSectionHeader && (
          <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>Suggested For You</Text>
          </View>
        )}

        {item.isAd ? (
          <AdPost
            adData={item}
            onImpressionReady={(adId) => {
              if (__DEV__) console.warn('Feed ad impression tracked:', adId);
            }}
          />
        ) : (
          // Regular post rendering
          (() => {
            // Otherwise render normal post
            const isShared = item.kind === 'share' && item.original;
            const original = isShared ? item.original : item;
            const baseId = getBaseId(item);
            const isBookmarked = bookmarks?.has ? bookmarks.has(baseId) : false;
            const previewText = getPreviewContent(original.content, baseId);
            const isTruncated =
              original.content &&
              original.content.length > MAX_PREVIEW_CHARS &&
              !expandedPosts[baseId];
            const isVisible = visiblePostIds.size === 0 || visiblePostIds.has(String(baseId));
            const isSensitive = Boolean(original.isSensitive ?? original.is_sensitive);
            const isOwnSensitivePost = String(original.actor_id || original.author?.id || '') === String(user?.id || '');
            const canViewSensitive = Boolean(settings.sensitiveContentVisibility && settings.sensitiveContentSuggestion);
            const shouldBlurSensitive = isSensitive && !isOwnSensitivePost && (Boolean(original.isBlurred) || !canViewSensitive);

            // Check if this is imported/curated content using utility function
            const isImportedContentCheck = isImportedContent(original);

            const handlePressPost = () => {
              // Disable post navigation for imported/curated content
              if (isImportedContentCheck) {
                return;
              }

              const destId = isShared && original ? original.id : item.id;
              // Always navigate to PostDetail view - don't divert videos to Reels
              navigation.navigate('PostDetail', { postId: destId });
            };

            const handleProfilePress = () => {
              // Disable profile navigation for imported content
              if (isImportedContentCheck) {
                return;
              }

              const isOwnUserProfile =
                original.actor_type === 'user' &&
                String(original.actor_id) === String(user?.id);

              if (isOwnUserProfile) {
                navigation.navigate('Profile');
                return;
              }

              navigation.navigate('UserProfile', { user: original.author });
            };

            return (
              <TouchableOpacity style={[styles.postContainer, { backgroundColor: colors.surface }]} onPress={handlePressPost}>
                {/* Shared header */}
                {isShared ? (
                  <View style={styles.sharedHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <AvatarPlaceholder size={40} avatarUrl={item.sharedBy?.avatar} />
                      </View>
                      <View>
                        <Text style={[styles.userName, { color: colors.text }, largeText && styles.userNameLarge, boldText && styles.userNameBold]}>{item.sharedBy?.name || item.sharedBy?.username || 'User'}</Text>
                        <Text style={[styles.userUsername, { color: colors.textSecondary }, largeText && styles.userUsernameLarge]}> @{item.sharedBy?.username || 'user'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{item.timestamp}</Text>
                  </View>
                ) : null}

                <View style={isShared ? [styles.sharedCard, { borderColor: colors.border }] : null}>
                  {/* User Header */}
                  <View style={styles.postHeader}>
                    <TouchableOpacity
                      disabled={isImportedContentCheck}
                      style={[styles.userInfo, isImportedContentCheck && styles.disabledProfile]}
                      onPress={handleProfilePress}
                    >
                      <View style={styles.avatar}>
                        <AvatarPlaceholder size={40} avatarUrl={original.author?.avatar} />
                      </View>
                      <View style={styles.userInfoText}>
                        <View style={styles.userNameRow}>
                          <Text
                            ellipsizeMode="tail"
                            numberOfLines={1}
                            style={[
                              styles.userName,
                              { color: isImportedContentCheck ? colors.textSecondary : colors.text },
                              largeText && styles.userNameLarge,
                              boldText && styles.userNameBold,
                            ]}
                          >
                            {original.author?.name || original.author?.username || 'User'}
                          </Text>
                        </View>
                        <Text
                          ellipsizeMode="tail"
                          numberOfLines={1}
                          style={[
                            styles.userUsername,
                            { color: colors.textSecondary },
                            largeText && styles.userUsernameLarge,
                          ]}
                        >
                          @{original.author?.username || 'user'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                      {/* Content Source Badge */}
                      {isImportedContentCheck && (
                        <View style={[styles.contentBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="share-social" size={10} color="#fff" />
                          <Text style={styles.contentBadgeText}>{getImportedPlatform(original)?.toUpperCase()}</Text>
                        </View>
                      )}
                      {isTrendingContent(original, 50) && !isImportedContentCheck && (
                        <View style={[styles.contentBadge, { backgroundColor: '#FF6B35' }]}>
                          <Ionicons name="flame" size={10} color="#fff" />
                          <Text style={styles.contentBadgeText}>Trending</Text>
                        </View>
                      )}
                      <Text
                        numberOfLines={1}
                        style={[styles.timestamp, { color: colors.textTertiary }]}
                      >
                        {original.timestamp}
                      </Text>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => {
                          setSelectedPost(item);
                          setShowPostMenu(true);
                        }}
                      >
                        <Ionicons color={colors.textSecondary} name="ellipsis-horizontal" size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Content with hashtags + Read more */}
                  {original.content ? (
                    <View>
                      <HashtagText
                        style={[styles.content, { color: colors.text }, largeText && styles.contentLarge, boldText && styles.contentBold]}
                        text={previewText}
                        onPressHashtag={(tag) => navigation.navigate('Hashtag', { tag })}
                        onPressMention={(username) => navigation.navigate('UserProfile', { username })}
                      />
                      {original.content.length > MAX_PREVIEW_CHARS ? (
                        <Text
                          style={[styles.readMoreText, { color: colors.primary }, boldText && styles.readMoreBold]}
                          onPress={() => toggleExpanded(baseId)}
                        >
                          {isTruncated
                            ? t('common.readMore') || 'Read more'
                            : t('common.showLess') || 'Show less'}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Media - using PostMedia for lazy loading and smooth rendering */}
                  {Array.isArray(original.media) && original.media.length > 0 && (
                    <PostMedia
                      media={original.media}
                      style={styles.mediaWrapper}
                      imageStyle={styles.postImage}
                      showVideoControls={false}
                      autoPlayVideo={settings.mediaAutoplayMobile}
                      isVisible={isVisible}
                      isScreenFocused={isFocused}
                      blurSensitive={shouldBlurSensitive}
                      sensitiveLabel="Sensitive content"
                      onMediaPress={(mediaIndex, mediaItem) => {
                        const mediaType = mediaItem.type || (mediaItem.uri?.includes('.mp4') ? 'video' : 'image');
                        const postBaseId = isShared && original ? original.id : item.id;
                        if (mediaType === 'video') {
                          navigation.navigate('Reels', { postId: postBaseId, mediaIndex });
                        }
                      }}
                    />
                  )}

                  {/* Actions */}
                  <View style={[styles.actions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleLike(baseId, Boolean(likedPosts[baseId]))}
                    >
                      <Ionicons
                        color={likedPosts[baseId] ? colors.primary : colors.textSecondary}
                        name={likedPosts[baseId] ? 'heart' : 'heart-outline'}
                        size={22}
                      />
                      <Text
                        style={[
                          styles.actionText,
                          { color: likedPosts[baseId] ? colors.primary : colors.textSecondary },
                          largeText && styles.actionTextLarge,
                          boldText && styles.actionTextBold,
                        ]}
                      >
                        {original.likes}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={isImportedContentCheck}
                      style={styles.actionButton}
                      onPress={() => {
                        // Disable comment navigation for imported/curated content
                        if (isImportedContentCheck) return;
                        navigation.navigate('PostDetail', { postId: baseId });
                      }}
                    >
                      <Ionicons color={isImportedContentCheck ? colors.textTertiary : colors.textSecondary} name="chatbubble-outline" size={20} />
                      <Text
                        style={[
                          styles.actionText,
                          { color: isImportedContentCheck ? colors.textTertiary : colors.textSecondary },
                          largeText && styles.actionTextLarge,
                          boldText && styles.actionTextBold,
                        ]}
                      >
                        {original.comments}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleShare(item)}
                    >
                      <Ionicons color={colors.textSecondary} name="share-outline" size={22} />
                      <Text
                        style={[
                          styles.actionText,
                          { color: colors.textSecondary },
                          largeText && styles.actionTextLarge,
                          boldText && styles.actionTextBold,
                        ]}
                      >
                        {original.shares}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleBookmark(baseId)}
                    >
                      <Ionicons
                        color={isBookmarked ? colors.primary : colors.textSecondary}
                        name="bookmark-outline"
                        size={20}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()
        )}
      </View>
    );
  }, [
    bookmarks,
    expandedPosts,
    likedPosts,
    navigation,
    colors,
    largeText,
    boldText,
    settings,
    user,
    handleLike,
    handleShare,
    toggleBookmark,
    toggleExpanded,
    getBaseId,
    getPreviewContent,
    visiblePostIds,
    isFocused,
    t,
    userType,
    displayPosts,
  ]);

  const handleScroll = useCallback(({ nativeEvent }) => {
    const currentPos = nativeEvent.contentOffset.y;
    lastScrollPosRef.current = currentPos;
  }, []);

  const renderStoriesHeader = () => (
    <View style={[styles.storiesHeaderContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.storiesRow}
        showsHorizontalScrollIndicator={false}
      >
        {groupedStories.map((storyGroup) => (
          <TouchableOpacity
            key={`${storyGroup.actorId}-${storyGroup.actorType}`}
            style={styles.storyCard}
            onPress={() =>
              navigation.navigate('StoryViewer', {
                actorId: storyGroup.actorId,
                actorType: storyGroup.actorType,
                disableAds: false,
              })
            }
          >
            <View style={[styles.storyImageWrapper, !storyGroup.isViewed && styles.storyUnviewed]}>
              <Image source={{ uri: storyGroup.image }} style={styles.storyImage} />
              {storyGroup.storyCount > 1 && (
                <View style={styles.storyCountBadge}>
                  <Text style={styles.storyCountText}>{storyGroup.storyCount}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={[styles.storyName, { color: colors.text }]}>
              {storyGroup.user?.name?.split(' ')[0] || 'User'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => {
              // If already on home feed, refresh and scroll to top
              if (isFocused) {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                refreshFeed();
              } else {
                navigation.navigate('Home');
              }
            }}
          >
            <Text
              style={[
                styles.headerTitle,
                styles.headerTitleXora,
                largeText && styles.headerTitleLarge,
                boldText && styles.headerTitleBold,
              ]}
            >
              XoRa{' '}
            </Text>
            <Text
              style={[
                styles.headerTitle,
                styles.headerTitleSocial,
                largeText && styles.headerTitleLarge,
                boldText && styles.headerTitleBold,
              ]}
            >
              SoCiAl
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons color={colors.text} name="add-circle-outline" size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons
              color={unreadNotificationCount > 0 ? colors.primary : colors.text}
              name={unreadNotificationCount > 0 ? 'notifications' : 'notifications-outline'}
              size={26}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts Feed (stories in header) */}
      <FlatList
        ref={flatListRef}
        contentContainerStyle={styles.feedContainer}
        data={displayPosts}
        keyExtractor={(item) => `${item.id}-${item.isAd ? 'ad' : 'post'}`}
        ListHeaderComponent={renderStoriesHeader}
        ListFooterComponent={renderListFooter}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={onRefresh}
          />
        )}
        renderItem={renderPostOrAd}
        scrollEventThrottle={100}
        onScroll={handleScroll}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      {/* Post Menu */}
      <PostMenu
        post={selectedPost}
        visible={showPostMenu}
        onClose={() => {
          setShowPostMenu(false);
          setSelectedPost(null);
        }}
        onDelete={(postId) => {
          if (removePost) removePost(postId);
        }}
        onEdit={(post) => {
          if (!post) return;
          navigation.navigate('CreatePost', { post });
        }}
        onReport={() => {
          // Report handled in PostMenu
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitleXora: {
    color: '#FF0080',
  },
  headerTitleSocial: {
    color: '#40E0D0',
  },
  headerTitleLarge: {
    fontSize: 22,
  },
  headerTitleBold: {
    fontWeight: '800',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexShrink: 0,
  },
  headerIcon: {
    padding: 5,
    alignItems: 'center',
  },
  feedContainer: {
    paddingTop: 8,
  },
  readMoreText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  storiesHeaderContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  storiesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  storyCard: {
    width: 110,
    marginRight: 10,
  },
  storyImageWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  storyUnviewed: {
    borderColor: '#FF0080',
    borderWidth: 3,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF0080',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storyName: {
    marginTop: 6,
    fontSize: 12,
  },
  postContainer: {
    marginBottom: 8,
    padding: 15,
  },
  sharedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharedCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  userNameLarge: {
    fontSize: 18,
  },
  userNameBold: {
    fontWeight: '800',
  },
  userUsername: {
    fontSize: 14,
  },
  userUsernameLarge: {
    fontSize: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    minWidth: 80,
  },
  timestamp: {
    fontSize: 12,
    flexShrink: 0,
    minWidth: 50,
  },
  contentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  contentLarge: {
    fontSize: 17,
    lineHeight: 24,
  },
  contentBold: {
    fontWeight: '600',
  },
  readMoreBold: {
    fontWeight: '700',
  },
  disabledProfile: {
    opacity: 0.7,
  },
  userInfoText: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  postImage: {
    width: '100%',
    height: 440,
    borderRadius: 12,
    marginTop: 8,
  },
  mediaWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 480,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionTextLarge: {
    fontSize: 16,
  },
  actionTextBold: {
    fontWeight: '700',
  },
});
