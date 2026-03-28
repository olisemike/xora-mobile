import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { useAppData } from '../contexts/AppDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStories } from '../contexts/StoriesContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import CoverPlaceholder from '../components/CoverPlaceholder';
import HashtagText from '../components/HashtagText';
import PostMedia from '../components/PostMedia';
import api from '../services/api';

const UserProfileScreen = ({ route, navigation }) => {
  const { user: paramUser, username: paramUsername } = route.params || {};
  const { _posts, followingUsers, toggleFollowUser, blocked, toggleBlock, _conversations, setConversations, bookmarks, toggleBookmark, sharePost, refreshFeed, latestEngagementUpdate, updatePostLikeState, updatePostShareCount } = useAppData();
  const { settings } = useSettings();
  const { user: authUser, token } = useAuth();
  const { colors } = useTheme();
  const { stories } = useStories();
  const largeText = settings.textSizeLarge;
  const isFocused = useIsFocused();

  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userBookmarks, setUserBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Posts');
  const [likedPosts, setLikedPosts] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(Dimensions.get('window').height);
  const postLayoutMapRef = useRef(new Map());

  const MAX_PREVIEW_CHARS = 220;
  const profileStories = React.useMemo(() => {
    if (!profile?.id) return [];
    return (stories || []).filter((s) => s.user?.id === profile.id && (!s.user?.type || s.user?.type === 'user') && !s.isAd);
  }, [stories, profile?.id]);

  const handlePostLayout = useCallback((postId, event) => {
    const { y, height } = event.nativeEvent.layout || {};
    if (postId === undefined || postId === null) return;
    postLayoutMapRef.current.set(String(postId), { y, height });
  }, []);

  const isPostVisible = useCallback((postId) => {
    if (postId === undefined || postId === null) return true;
    const layout = postLayoutMapRef.current.get(String(postId));
    if (!layout) return true;
    if (!layout.height || layout.height <= 0) return true;
    const visibilityBuffer = Math.max(120, Math.round(viewportHeight * 0.3));
    const top = Math.max(0, scrollY - visibilityBuffer);
    const bottom = scrollY + viewportHeight + visibilityBuffer;
    const itemTop = layout.y;
    const itemBottom = layout.y + layout.height;
    return itemBottom > top && itemTop < bottom;
  }, [scrollY, viewportHeight]);

  useEffect(() => {
    const sourcePosts = [...(userPosts || []), ...(userBookmarks || [])];
    if (sourcePosts.length === 0) return;
    const likedState = {};
    sourcePosts.forEach((post) => {
      const original = post.kind === 'share' && post.original ? post.original : post;
      const likedFlag = original.isLiked ?? original.liked_by_me ?? original.is_liked;
      if (likedFlag !== undefined) {
        likedState[original.id || post.id] = Boolean(likedFlag);
      }
    });
    setLikedPosts((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      Object.entries(likedState).forEach(([key, value]) => {
        if (next[key] !== value) {
          next[key] = value;
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  }, [userPosts, userBookmarks]);

  useEffect(() => {
    if (!latestEngagementUpdate) return;
    const { postId, engagementType, counts } = latestEngagementUpdate;
    if (!postId) return;

    if (engagementType === 'deleted') {
      setUserPosts((prev) => (prev || []).filter((p) => String(p.id) !== String(postId) && String(p.original?.id) !== String(postId)));
      return;
    }

    setUserPosts((prev) => (prev || []).map((p) => {
      const isTarget = String(p.id) === String(postId) || (p.original && String(p.original.id) === String(postId));
      if (!isTarget) return p;

      const next = {
        ...p,
        likes: counts?.likesCount ?? p.likes,
        comments: counts?.commentsCount ?? p.comments,
        shares: counts?.sharesCount ?? p.shares,
      };

      if (p.original && String(p.original.id) === String(postId)) {
        next.original = {
          ...p.original,
          likes: counts?.likesCount ?? p.original.likes,
          comments: counts?.commentsCount ?? p.original.comments,
          shares: counts?.sharesCount ?? p.original.shares,
        };
      }

      return next;
    }));
  }, [latestEngagementUpdate]);

  // Prefer explicit username passed via route, then user object, then fall back to authed user
  const username = paramUsername || paramUser?.username || authUser?.username;

  useEffect(() => {
    const load = async () => {
      if (!token || !username) {
        setLoading(false);
        return;
      }
      try {
        const [p, feed] = await Promise.all([
          api.getUserProfile(token, username),
          api.getUserFeed(token, username, null, null),
        ]);
        setProfile(p);
        setUserPosts(feed);
      } catch (_e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, username]);

  useEffect(() => {
    if (activeTab !== 'Bookmarks') return;
    if (!token || !username) {
      setUserBookmarks([]);
      return;
    }

    let isMounted = true;
    const loadBookmarks = async () => {
      setBookmarksLoading(true);
      try {
        const data = await api.getUserBookmarks(token, username);
        if (!isMounted) return;
        setUserBookmarks(data);
      } catch (e) {
        if (__DEV__) console.error('Failed to load user bookmarks:', e);
        if (isMounted) setUserBookmarks([]);
      } finally {
        if (isMounted) setBookmarksLoading(false);
      }
    };

    loadBookmarks();

    return () => {
      isMounted = false;
    };
  }, [activeTab, token, username]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyCenter}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Text style={[styles.emptyText, { color: colors.text }]}>User not found</Text>
        </View>
      </View>
    );
  }

  const isFollowing =
    followingUsers && followingUsers.has && profile && followingUsers.has(profile.id);
  const isBlocked = profile && blocked.some((b) => b.id === profile.id && b.type === 'user');
  const coverUrl =
    profile?.coverUrl ||
    profile?.cover_url ||
    profile?.coverImage ||
    profile?.cover_image ||
    profile?.coverPhoto ||
    profile?.cover_photo ||
    profile?.bannerUrl ||
    profile?.banner_url;
  const avatarUrl = profile?.avatarUrl || profile?.avatar || profile?.avatar_url;

  const handleFollowToggle = () => {
    if (!profile) return;
    toggleFollowUser(profile.id);
  };

  const getPreviewContent = (content, postId) => {
    if (!content) return '';
    if (content.length <= MAX_PREVIEW_CHARS || expandedPosts[postId]) return content;
    return `${content.slice(0, MAX_PREVIEW_CHARS).trimEnd()}...`;
  };

  const toggleExpanded = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleLike = async (postId, wasLiked) => {
    const nextLiked = !wasLiked;
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: nextLiked,
    }));

    const applyLikeUpdate = (list, likedValue) => (list || []).map((p) => {
      const isTarget = p.id === postId || (p.original && p.original.id === postId);
      if (!isTarget) return p;

      const delta = likedValue ? 1 : -1;
      if (p.original && p.original.id === postId) {
        return {
          ...p,
          original: {
            ...p.original,
            likes: Math.max(0, Number(p.original.likes || 0) + delta),
            is_liked: likedValue,
            isLiked: likedValue,
          },
        };
      }

      return {
        ...p,
        likes: Math.max(0, Number(p.likes || 0) + delta),
        is_liked: likedValue,
        isLiked: likedValue,
      };
    });

    setUserPosts((prevPosts) => applyLikeUpdate(prevPosts, nextLiked));
    setUserBookmarks((prevPosts) => applyLikeUpdate(prevPosts, nextLiked));

    if (updatePostLikeState) {
      updatePostLikeState(postId, nextLiked);
    }

    if (!token) return;
    const actorType = 'user';
    const actorId = authUser?.id;
    if (!actorId) return;

    try {
      await api.togglePostLike(token, postId, nextLiked, actorType, actorId);
    } catch (e) {
      if (__DEV__) console.error('Failed to toggle like:', e);
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !nextLiked,
      }));
      setUserPosts((prevPosts) => applyLikeUpdate(prevPosts, wasLiked));
      setUserBookmarks((prevPosts) => applyLikeUpdate(prevPosts, wasLiked));
      if (updatePostLikeState) {
        updatePostLikeState(postId, wasLiked);
      }
    }
  };

  const handleShare = async (item) => {
    if (!token) return;

    const actorType = 'user';
    const actorId = authUser?.id;
    if (!actorId) return;

    const applyShareUpdate = (list) => (list || []).map((p) => {
      const isTarget = p.id === item.id || (p.original && p.original.id === item.id);
      if (!isTarget) return p;

      if (p.original && p.original.id === item.id) {
        return {
          ...p,
          original: {
            ...p.original,
            shares: Math.max(0, Number(p.original.shares || 0) + 1),
          },
        };
      }

      return {
        ...p,
        shares: Math.max(0, Number(p.shares || 0) + 1),
      };
    });

    try {
      await api.sharePost(token, item.id, actorType, actorId);
      if (updatePostShareCount) {
        updatePostShareCount(item.id, 1);
      }
      setUserPosts((prevPosts) => applyShareUpdate(prevPosts));
      setUserBookmarks((prevPosts) => applyShareUpdate(prevPosts));
      if (sharePost) sharePost(item, { type: 'user', id: authUser?.id, name: authUser?.name, username: authUser?.username, avatar: authUser?.avatar });
      if (refreshFeed) setTimeout(() => refreshFeed(), 1500);
    } catch (e) {
      if (__DEV__) console.error('Failed to share post:', e);
    }
  };

  const renderPostCard = (item, options = {}) => {
    const { showActions = true } = options;
    const original = item.kind === 'share' && item.original ? item.original : item;
    const baseId = original?.id || item.id;
    const visibilityKey = item.id ?? baseId;
    const isBookmarked = bookmarks?.has ? bookmarks.has(baseId) : false;
    const previewText = getPreviewContent(original.content, item.id);
    const isTruncated = original.content && original.content.length > MAX_PREVIEW_CHARS && !expandedPosts[item.id];
    const isVisible = isPostVisible(visibilityKey);
    const isSensitive = Boolean(original.isSensitive ?? original.is_sensitive);
    const isOwnSensitivePost = String(original.actor_id || original.author?.id || '') === String(authUser?.id || '');
    const canViewSensitive = Boolean(settings.sensitiveContentVisibility && settings.sensitiveContentSuggestion);
    const shouldBlurSensitive = isSensitive && !isOwnSensitivePost && (Boolean(original.isBlurred) || !canViewSensitive);

    const mediaArray = Array.isArray(original.media) ? original.media : [];

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.postContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onLayout={(event) => handlePostLayout(visibilityKey, event)}
        onPress={() => navigation.navigate('PostDetail', { postId: baseId })}
      >
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <View style={styles.postAvatar}>
              <AvatarPlaceholder size={40} avatarUrl={original.author?.avatar} />
            </View>
            <View>
              <Text style={[styles.postUserName, { color: colors.text }, largeText && styles.postUserNameLarge]}>
                {original.author?.name || profile?.name || 'User'}
              </Text>
              <Text style={[styles.postUserUsername, { color: colors.textSecondary }, largeText && styles.postUserUsernameLarge]}>
                @{original.author?.username || profile?.username || 'user'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{original.timestamp}</Text>
          </View>
        </View>

        {original.content ? (
          <View>
            <HashtagText
              style={[styles.postContent, { color: colors.text }, largeText && styles.postContentLarge]}
              text={previewText}
              onPressHashtag={(tag) => navigation.navigate('Hashtag', { tag })}
              onPressMention={(mentionUsername) => navigation.navigate('UserProfile', { username: mentionUsername })}
            />
            {original.content.length > MAX_PREVIEW_CHARS ? (
              <Text
                style={[styles.readMoreText, { color: colors.primary }]}
                onPress={() => toggleExpanded(item.id)}
              >
                {isTruncated ? 'Read more' : 'Show less'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {mediaArray.length > 0 && (
          <PostMedia
            media={mediaArray}
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
              if (mediaType === 'video') {
                navigation.navigate('Reels', { postId: baseId, mediaIndex });
              }
            }}
          />
        )}

        {showActions ? (
          <View style={[styles.actions, { borderTopColor: colors.border }] }>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(baseId, Boolean(likedPosts[baseId]))}>
              <Ionicons
                color={likedPosts[baseId] ? colors.primary : colors.textSecondary}
                name={likedPosts[baseId] ? 'heart' : 'heart-outline'}
                size={22}
              />
              <Text style={[styles.actionText, { color: likedPosts[baseId] ? colors.primary : colors.textSecondary }]}>
                {original.likes || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PostDetail', { postId: baseId })}>
              <Ionicons color={colors.textSecondary} name="chatbubble-outline" size={20} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                {original.comments}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
              <Ionicons color={colors.textSecondary} name="share-outline" size={22} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                {original.shares || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => toggleBookmark(baseId)}>
              <Ionicons
                color={isBookmarked ? colors.primary : colors.textSecondary}
                name="bookmark-outline"
                size={20}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const handleMessage = async () => {
    if (!profile || !token) {
      navigation.navigate('Messages');
      return;
    }
    try {
      // Create or reuse a 1:1 conversation with this user
      const convMeta = await api.createConversation(token, [profile.id], false);
      const conv = {
        id: convMeta.id,
        user: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
        },
        lastMessage: '',
        timestamp: '',
        unread: false,
        messages: [],
      };
      setConversations((prev = []) => {
        const filtered = prev.filter((c) => c.id !== conv.id);
        return [conv, ...filtered];
      });
      navigation.navigate('Chat', { conversation: conv });
    } catch (_e) {
      navigation.navigate('Messages');
    }
  };

  const handleToggleBlock = () => {
    if (!profile) return;
    toggleBlock({
      id: profile.id,
      type: 'user',
      name: profile.name,
      username: profile.username || '',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>{profile.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.coverWrapper}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
          ) : (
            <CoverPlaceholder />
          )}
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <AvatarPlaceholder size={90} />
            )}
          </View>
          <Text style={[styles.name, largeText && styles.nameLarge, { color: colors.text }]}>{profile.name}</Text>
          <Text style={[styles.username, largeText && styles.usernameLarge, { color: colors.textSecondary }]}>@{profile.username}</Text>
          {profile.bio ? <Text style={[styles.bio, largeText && styles.bioLarge, { color: colors.text }]}>{profile.bio}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            disabled={!authUser || authUser.id !== profile.id}
            style={styles.statItem}
            onPress={() => {
              if (authUser && authUser.id === profile.id) {
                navigation.navigate('Followers');
              }
            }}
          >
            <Text style={[styles.statValue, largeText && styles.statValueLarge, { color: colors.text }]}>
              {profile.followers?.toLocaleString?.() || profile.followers || '—'}
            </Text>
            <Text style={[styles.statLabel, largeText && styles.statLabelLarge, { color: colors.textSecondary }]}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!authUser || authUser.id !== profile.id}
            style={styles.statItem}
            onPress={() => {
              if (authUser && authUser.id === profile.id) {
                navigation.navigate('Following');
              }
            }}
          >
            <Text style={[styles.statValue, largeText && styles.statValueLarge, { color: colors.text }]}>
              {profile.following?.toLocaleString?.() || profile.following || '—'}
            </Text>
            <Text style={[styles.statLabel, largeText && styles.statLabelLarge, { color: colors.textSecondary }]}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, isFollowing && styles.primaryBtnSecondary]}
            onPress={handleFollowToggle}
          >
            <Text
              style={[
                styles.primaryBtnText,
                largeText && styles.primaryBtnTextLarge,
                isFollowing && styles.primaryBtnTextSecondary,
              ]}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.primary }] } onPress={handleMessage}>
            <Text style={[styles.secondaryBtnText, largeText && styles.secondaryBtnTextLarge, { color: colors.onPrimary || '#fff' }]}>
              Message
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: colors.border }, isBlocked && [styles.smallBtnDanger, { backgroundColor: colors.primary }]]}
            onPress={handleToggleBlock}
          >
            <Ionicons
              color={isBlocked ? (colors.onPrimary || '#fff') : colors.primary}
              name="ban-outline"
              size={18}
            />
            <Text
              style={[
                styles.smallBtnText,
                largeText && styles.smallBtnTextLarge,
                { color: isBlocked ? (colors.onPrimary || '#fff') : colors.primary },
              ]}
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: colors.border }]}
            onPress={() =>
              navigation.navigate('Report', {
                entityType: 'user',
                entityId: profile.id,
                summary: profile.bio,
              })
            }
          >
            <Ionicons color={colors.primary} name="flag-outline" size={18} />
            <Text
              style={[
                styles.smallBtnText,
                largeText && styles.smallBtnTextLarge,
                { color: colors.primary },
              ]}
            >
              Report user
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {['Posts', 'Stories', 'Bookmarks'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, largeText && styles.tabTextLarge, { color: colors.text }, activeTab === tab && [styles.tabTextActive, { color: colors.primary }]]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* User posts list */}
        {activeTab === 'Posts' ? (
          <View style={[styles.postsSection, { backgroundColor: colors.surface }] }>
            <Text style={[styles.sectionTitle, largeText && styles.sectionTitleLarge, { color: colors.text }]}>
              Posts
            </Text>
            {userPosts.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Ionicons color={colors.border} name="images-outline" size={60} />
                <Text style={[styles.emptyText, largeText && styles.emptyTextLarge, { color: colors.textSecondary }]}>No posts from this user yet</Text>
              </View>
            ) : (
              userPosts.map(renderPostCard)
            )}
          </View>
        ) : null}

        {/* Bookmarks Tab */}
        {activeTab === 'Bookmarks' ? (
          <View style={[styles.postsSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, largeText && styles.sectionTitleLarge, { color: colors.text }]}>
              Bookmarks
            </Text>
            {bookmarksLoading ? (
              <View style={styles.emptyPosts}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.emptyText, largeText && styles.emptyTextLarge, { color: colors.textSecondary }]}>Loading bookmarks...</Text>
              </View>
            ) : userBookmarks.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Ionicons color={colors.border} name="bookmark-outline" size={60} />
                <Text style={[styles.emptyText, largeText && styles.emptyTextLarge, { color: colors.textSecondary }]}>No bookmarks yet</Text>
              </View>
            ) : (
              userBookmarks.map((item) => renderPostCard(item, { showActions: false }))
            )}
          </View>
        ) : null}

        {/* Stories Tab */}
        {activeTab === 'Stories' ? (
          <View style={styles.postsSection}>
            {profileStories.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons color={colors.textSecondary} name="film-outline" size={60} />
                <Text style={[styles.emptyText, largeText && { fontSize: 16 }]}>No stories yet</Text>
              </View>
            ) : (
              profileStories.map((story) => (
                <TouchableOpacity
                  key={story.id}
                  style={[styles.storyRow, { borderBottomColor: colors.border }]}
                  onPress={() => navigation.navigate('StoryViewer', { storyId: story.id, actorId: profile.id, actorType: 'user', disableAds: true })}
                >
                  <View style={[styles.storyThumb, { backgroundColor: colors.surface }]}>
                    {story.image ? (
                      <Image source={{ uri: story.image }} style={styles.storyThumbImage} />
                    ) : (
                      <Ionicons color={colors.textSecondary} name="film-outline" size={20} />
                    )}
                  </View>
                  <View style={styles.storyMeta}>
                    <Text style={[styles.storyTitle, { color: colors.text }]}>
                      {story.content || 'Story'}
                    </Text>
                    <Text style={[styles.storySubtitle, { color: colors.textSecondary }]}>
                      {story.timestamp || 'Just now'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 32,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerTitleLarge: { fontSize: 22 },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  storyThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  storyThumbImage: {
    width: '100%',
    height: '100%',
  },
  storyMeta: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  storySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: { padding: 0, paddingBottom: 32 },
  coverWrapper: {
    height: 150,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  avatarSection: { alignItems: 'center', marginTop: -50, marginBottom: 16 },
  avatarOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  name: { fontSize: 20, fontWeight: 'bold' },
  nameLarge: { fontSize: 22 },
  username: { fontSize: 14, marginTop: 4 },
  usernameLarge: { fontSize: 16 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  bioLarge: { fontSize: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 16,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statValueLarge: { fontSize: 20 },
  statLabel: { fontSize: 13, color: '#666' },
  statLabelLarge: { fontSize: 15 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryBtnSecondary: {
    borderWidth: 1,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtnTextSecondary: {},
  primaryBtnTextLarge: { fontSize: 16 },
  secondaryBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  secondaryBtnTextLarge: { fontSize: 16 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  smallBtnText: { fontSize: 13 },
  smallBtnTextLarge: { fontSize: 15 },
  smallBtnDanger: {},
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextLarge: {
    fontSize: 16,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  postsSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionTitleLarge: {
    fontSize: 20,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  postUserNameLarge: {
    fontSize: 17,
  },
  postUserUsername: {
    fontSize: 13,
  },
  postUserUsernameLarge: {
    fontSize: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postContentLarge: {
    fontSize: 16,
    lineHeight: 22,
  },
  readMoreText: {
    fontSize: 14,
    marginTop: 4,
  },
  mediaWrapper: {
    position: 'relative',
    marginVertical: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoThumb: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbText: {
    fontSize: 14,
    marginTop: 4,
  },
  multiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  postsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Legacy grid styles kept for possible reuse
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  postTile: {
    width: '31%',
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postTileImage: {
    width: '100%',
    height: '100%',
  },
  postTilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // New vertical list styles for user posts
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  postRowImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 10,
  },
  postRowPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postRowBody: {
    flex: 1,
    position: 'relative',
  },
  postRowText: {
    fontSize: 14,
  },
  postRowBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  // Full post card styles (matching ProfileScreen)
  postCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postCardUserInfo: {
    flex: 1,
  },
  postCardUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  postCardUsername: {
    fontSize: 13,
  },
  postCardTimestamp: {
    fontSize: 12,
  },
  postCardContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  postCardMedia: {
    position: 'relative',
    marginBottom: 10,
  },
  postCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  postCardVideoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 20,
  },
  postCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postCardStatText: {
    fontSize: 14,
  },
  infoBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
  },
  infoText: { fontSize: 13 },
});

export default UserProfileScreen;
