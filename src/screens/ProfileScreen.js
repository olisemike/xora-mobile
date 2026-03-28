import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../contexts/SettingsContext';
import { useAppData } from '../contexts/AppDataContext';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStories } from '../contexts/StoriesContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import CoverPlaceholder from '../components/CoverPlaceholder';
import HashtagText from '../components/HashtagText';
import PostMenu from '../components/PostMenu';
import PostMedia from '../components/PostMedia';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { posts, followingUsers, bookmarks, toggleBookmark, sharePost, removePost, refreshFeed, updatePostLikeState, updatePostShareCount } = useAppData();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const { token, user: authUser } = useAuth();
  const { registerError } = useNetwork();
  const { stories } = useStories();
  const isFocused = useIsFocused();

  const displayName = authUser?.name || profile.name;
  const displayUsername = authUser?.username || profile.username || '';
  const displayAvatar = authUser?.avatarUrl || authUser?.avatar_url || profile.avatar;
  const displayCover = authUser?.coverUrl || authUser?.cover_url || profile.coverImage;
  const largeText = settings.textSizeLarge;
  const { boldText } = settings;
  const { privateAccount } = settings;
  const { muteNotifications } = settings;
  const totalFollowing = followingUsers?.size || 0;

  const [previewImage, setPreviewImage] = useState(null); // { uri, label }
  const [likedPosts, setLikedPosts] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [activeTab, setActiveTab] = useState('Posts');
  const [followersCount, setFollowersCount] = useState(0);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(Dimensions.get('window').height);
  const postLayoutMapRef = useRef(new Map());

  const followersDisplay = followersCount;
  const followingDisplay = totalFollowing;

  const currentAuthorId = authUser?.id || 'me';
  const userPosts = useMemo(() => {
    return (posts || []).filter((p) => {
      if (p.kind === 'share') {
        return p.sharedBy?.id === currentAuthorId;
      }
      const original = p.kind === 'share' && p.original ? p.original : p;
      return original.author && original.author.id === currentAuthorId;
    });
  }, [posts, currentAuthorId]);

  const MAX_PREVIEW_CHARS = 220;

  const storyActorId = authUser?.id || profile?.id || null;
  const storyActorType = 'user';
  const profileStories = useMemo(() => {
    if (!storyActorId) return [];
    return (stories || []).filter((s) => s.user?.id === storyActorId && (!storyActorType || s.user?.type === storyActorType) && !s.isAd);
  }, [stories, storyActorId, storyActorType]);

  useEffect(() => {
    const sourcePosts = [...(userPosts || []), ...(bookmarkedPosts || [])];
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
  }, [userPosts, bookmarkedPosts]);

  useEffect(() => {
    if (activeTab !== 'Bookmarks') return;
    if (!token) {
      setBookmarkedPosts([]);
      return;
    }

    let isMounted = true;
    const loadBookmarks = async () => {
      setBookmarksLoading(true);
      try {
        const data = await api.getBookmarks(token);
        if (!isMounted) return;
        setBookmarkedPosts(data);
      } catch (e) {
        if (__DEV__) console.error('Failed to load bookmarks:', e);
        registerError('Failed to load bookmarks.');
        if (isMounted) setBookmarkedPosts([]);
      } finally {
        if (isMounted) setBookmarksLoading(false);
      }
    };

    loadBookmarks();

    return () => {
      isMounted = false;
    };
  }, [activeTab, token, bookmarks, registerError]);

  // Load followers/following counts
  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (!token) return;

        if (authUser?.username) {
          // Load stats for the user
          const p = await api.getUserProfile(token, authUser.username);
          setFollowersCount(p.followers ?? 0);
        }
      } catch (e) {
        if (__DEV__) console.error('Failed to load followers/following count for profile:', e);
      }
    };

    loadCounts();
  }, [token, authUser?.username]);

  // Ensure profile display updates when screen comes into focus
  // This handles cases where the native Image component might cache old avatars
  useFocusEffect(
    useCallback(() => {
      // Just having this effect will ensure displayAvatar is recalculated
      // when the screen comes into focus after EditProfileScreen updates authUser
      return () => {
        // Cleanup if needed
      };
    }, []),
  );

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
    const top = scrollY;
    const bottom = scrollY + viewportHeight;
    const itemTop = layout.y;
    const itemBottom = layout.y + layout.height;
    return itemBottom > top && itemTop < bottom;
  }, [scrollY, viewportHeight]);

  const handleLike = async (postId, wasLiked) => {
    const nextLiked = !wasLiked;
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: nextLiked,
    }));

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
        [postId]: wasLiked,
      }));
      if (updatePostLikeState) {
        updatePostLikeState(postId, wasLiked);
      }
    }
  };

  const handleShare = async (item) => {
    if (!token) {
      registerError('You must be logged in to share posts.');
      return;
    }

    const actorType = 'user';
    const actorId = authUser?.id;
    if (!actorId) {
      registerError('Could not determine who is sharing this post.');
      return;
    }

    try {
      await api.sharePost(token, item.id, actorType, actorId);
      if (updatePostShareCount) {
        updatePostShareCount(item.id, 1);
      }
      if (sharePost) sharePost(item, authUser);
      setTimeout(() => refreshFeed(), 1500);
      registerError('Post shared.');
    } catch (e) {
      if (__DEV__) console.error('Failed to share post:', e);
      registerError('Could not share this post.');
    }
  };

  const renderPostCard = (item, options = {}) => {
    const { showMenu = false, showActions = true } = options;
    const original = item.kind === 'share' && item.original ? item.original : item;
    const baseId = original?.id || item.id;
    const isBookmarked = bookmarks?.has ? bookmarks.has(baseId) : false;
    const previewText = getPreviewContent(original.content, item.id);
    const isTruncated = original.content && original.content.length > MAX_PREVIEW_CHARS && !expandedPosts[item.id];
    const isVisible = isPostVisible(baseId);
    const isSensitive = Boolean(original.isSensitive ?? original.is_sensitive);
    const isOwnSensitivePost = String(original.actor_id || original.author?.id || '') === String(authUser?.id || '');
    const canViewSensitive = Boolean(settings.sensitiveContentVisibility && settings.sensitiveContentSuggestion);
    const shouldBlurSensitive = isSensitive && !isOwnSensitivePost && (Boolean(original.isBlurred) || !canViewSensitive);

    const mediaArray = Array.isArray(original.media) ? original.media : [];

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.postContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onLayout={(event) => handlePostLayout(baseId, event)}
        onPress={() => navigation.navigate('PostDetail', { postId: baseId })}
      >
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <View style={styles.postAvatar}>
              <AvatarPlaceholder size={40} avatarUrl={original.author?.avatar} />
            </View>
            <View>
              <Text style={[styles.postUserName, { color: colors.text }, largeText && styles.postUserNameLarge]}>
                {original.author?.name || displayName || 'User'}
              </Text>
              <Text style={[styles.postUserUsername, { color: colors.textSecondary }, largeText && styles.postUserUsernameLarge]}>
                @{original.author?.username || displayUsername || 'user'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{original.timestamp}</Text>
            {showMenu ? (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  setSelectedPost(item);
                  setShowPostMenu(true);
                }}
              >
                <Ionicons color={colors.textSecondary} name="ellipsis-horizontal" size={20} />
              </TouchableOpacity>
            ) : null}
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

        {/* Media - using PostMedia for proper rendering of all media types */}
        {Array.isArray(mediaArray) && mediaArray.length > 0 ? (
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
          />
        ) : null}

        {showActions ? (
          <View style={[styles.actions, { borderTopColor: colors.border }] }>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(baseId, Boolean(likedPosts[baseId]))}>
              <Ionicons
                color={likedPosts[baseId] ? colors.primary : colors.textSecondary}
                name={likedPosts[baseId] ? 'heart' : 'heart-outline'}
                size={22}
              />
              <Text style={[styles.actionText, { color: likedPosts[baseId] ? colors.primary : colors.textSecondary }] }>
                {original.likes}
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
                {original.shares}
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      scrollEventThrottle={16}
      onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text
          style={[
            styles.headerTitle,
            largeText && styles.headerTitleLarge,
            boldText && styles.headerTitleBold,
            { color: colors.text },
          ]}
        >
          Profile
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons color={colors.text} name="settings-outline" size={26} />
        </TouchableOpacity>
      </View>

      {/* Cover Photo */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.coverPhoto, { backgroundColor: colors.surface }]}
        onPress={() => {
          if (displayCover) {
            setPreviewImage({ uri: displayCover, label: 'Cover photo' });
          }
        }}
      >
        {displayCover ? (
          <Image source={{ uri: displayCover }} style={styles.coverImage} />
        ) : (
          <CoverPlaceholder />
        )}
      </TouchableOpacity>

      {/* Profile Info */}
      <View style={[styles.profileInfo, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (displayAvatar) {
                setPreviewImage({ uri: displayAvatar, label: 'Profile photo' });
              }
            }}
          >
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <AvatarPlaceholder size={100} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: colors.primary }]}>
            <Ionicons color={colors.onPrimary} name="camera" size={16} />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.name,
            largeText && styles.nameLarge,
            boldText && styles.nameBold,
            { color: colors.text },
          ]}
        >
          {displayName}
        </Text>
        <Text
          style={[
            styles.username,
            largeText && styles.usernameLarge,
            { color: colors.textSecondary },
          ]}
        >
          @{displayUsername || 'username'}
        </Text>
        {privateAccount ? (
          <View style={styles.badgeRow}>
            <Ionicons color={colors.textSecondary} name="lock-closed" size={14} />
            <Text
              style={[
                styles.badgeText,
                largeText && styles.badgeTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              {t('settings.accountVisibility') || 'Account Visibility: Followers Only'}
            </Text>
          </View>
        ) : null}
        {muteNotifications ? (
          <View style={styles.badgeRow}>
            <Ionicons color={colors.textSecondary} name="notifications-off-outline" size={14} />
            <Text
              style={[
                styles.badgeText,
                largeText && styles.badgeTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              {t('settings.muteNotifications') || 'Notifications muted'}
            </Text>
          </View>
        ) : null}
        {profile.bio ? (
          <Text
            style={[
              styles.bio,
              largeText && styles.bioLarge,
              { color: colors.text },
            ]}
          >
            {profile.bio}
          </Text>
        ) : null}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statNumber,
                largeText && styles.statNumberLarge,
                { color: colors.text },
              ]}
            >
              {userPosts.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                largeText && styles.statLabelLarge,
                { color: colors.textSecondary },
              ]}
            >
              Posts
            </Text>
          </View>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => {
              navigation.navigate('Followers');
            }}
          >
            <Text
              style={[
                styles.statNumber,
                largeText && styles.statNumberLarge,
                { color: colors.text },
              ]}
            >
              {followersDisplay}
            </Text>
            <Text
              style={[
                styles.statLabel,
                largeText && styles.statLabelLarge,
                { color: colors.textSecondary },
              ]}
            >
              Followers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => {
              navigation.navigate('Following');
            }}
          >
            <Text
              style={[
                styles.statNumber,
                largeText && styles.statNumberLarge,
                { color: colors.text },
              ]}
            >
              {followingDisplay}
            </Text>
            <Text
              style={[
                styles.statLabel,
                largeText && styles.statLabelLarge,
                { color: colors.textSecondary },
              ]}
            >
              Following
            </Text>
          </TouchableOpacity>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text
            style={[
              styles.editButtonText,
              largeText && styles.editButtonTextLarge,
              { color: colors.onPrimary },
            ]}
          >
            Edit Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }] }>
        {['Posts', 'Stories', 'Bookmarks'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
                largeText && styles.tabTextLarge,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Posts Feed */}
      {activeTab === 'Posts' ? (
        <View style={[styles.postsSection, { backgroundColor: colors.surface }]}>
          <Text
            style={[
              styles.sectionTitle,
              largeText && styles.sectionTitleLarge,
              { color: colors.text },
            ]}
          >
          Your Posts
          </Text>
          {userPosts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons color={colors.border} name="images-outline" size={60} />
              <Text
                style={[
                  styles.emptyText,
                  largeText && styles.emptyTextLarge,
                  { color: colors.textSecondary },
                ]}
              >
              No posts yet
              </Text>
            </View>
          ) : (
            userPosts.map((item) => renderPostCard(item, { showMenu: true }))
          )}
        </View>
      ) : null}

      {/* Stories Tab */}
      {activeTab === 'Stories' ? (
        <View style={[styles.postsSection, { backgroundColor: colors.surface }]}>
          {profileStories.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons color={colors.border} name="film-outline" size={60} />
              <Text
                style={[
                  styles.emptyText,
                  largeText && styles.emptyTextLarge,
                  { color: colors.textSecondary },
                ]}
              >
                No stories yet
              </Text>
            </View>
          ) : (
            profileStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={[styles.storyRow, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('StoryViewer', { storyId: story.id, actorId: storyActorId, actorType: storyActorType, disableAds: true })}
              >
                <View style={[styles.storyThumb, { backgroundColor: colors.surface }]}>
                  {story.image ? (
                    <>
                      <Image source={{ uri: story.image }} style={styles.storyThumbImage} />
                      {story.mediaType === 'video' && (
                        <View style={styles.videoOverlay}>
                          <Ionicons color="#FFF" name="play" size={24} />
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.noMediaPlaceholder}>
                      <Ionicons color={colors.textSecondary} name="film-outline" size={32} />
                    </View>
                  )}
                </View>
                <View style={styles.storyMeta}>
                  <Text numberOfLines={1} style={[styles.storyTitle, { color: colors.text }]}>
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

      {/* Bookmarks Tab */}
      {activeTab === 'Bookmarks' ? (
        <View style={[styles.postsSection, { backgroundColor: colors.surface }]}>
          {bookmarksLoading ? (
            <View style={styles.emptyPosts}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text
                style={[
                  styles.emptyText,
                  largeText && styles.emptyTextLarge,
                  { color: colors.textSecondary },
                ]}
              >
                Loading bookmarks...
              </Text>
            </View>
          ) : bookmarkedPosts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons color={colors.border} name="bookmark-outline" size={60} />
              <Text
                style={[
                  styles.emptyText,
                  largeText && styles.emptyTextLarge,
                  { color: colors.textSecondary },
                ]}
              >
                No bookmarks yet
              </Text>
            </View>
          ) : (
            bookmarkedPosts.map((item) => renderPostCard(item, { showMenu: false, showActions: false }))
          )}
        </View>
      ) : null}

      {previewImage ? (
        <Modal transparent visible animationType={settings.reduceMotion ? 'none' : 'fade'}>
          <View style={styles.previewOverlay}>
            <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={styles.previewClose}
                onPress={() => setPreviewImage(null)}
              >
                <Ionicons color={colors.text} name="close" size={22} />
              </TouchableOpacity>
              {previewImage.uri ? <Image source={{ uri: previewImage.uri }} style={styles.previewImage} /> : null}
              {previewImage.label ? <Text style={[styles.previewLabel, { color: colors.text }]}>{previewImage.label}</Text> : null}
            </View>
          </View>
        </Modal>
      ) : null}

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
    </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleLarge: {
    fontSize: 26,
  },
  headerTitleBold: {
    fontWeight: '800',
  },
  coverPhoto: {
    height: 150,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  avatarTextLarge: {
    fontSize: 44,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nameLarge: {
    fontSize: 24,
  },
  nameBold: {
    fontWeight: '800',
  },
  username: {
    fontSize: 16,
    marginBottom: 8,
  },
  usernameLarge: {
    fontSize: 18,
  },
  bio: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  bioLarge: {
    fontSize: 17,
  },
  stats: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statNumberLarge: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 14,
  },
  statLabelLarge: {
    fontSize: 16,
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButtonTextLarge: {
    fontSize: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextLarge: {
    fontSize: 17,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  postsSection: {
    marginTop: 0,
    padding: 12,
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
  postUserNameBold: {
    fontWeight: '800',
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
  menuButton: {
    padding: 4,
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
  emptyText: {
    fontSize: 16,
    marginTop: 15,
  },
  emptyTextLarge: {
    fontSize: 18,
  },
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
  videoOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  noMediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 13,
    marginLeft: 4,
  },
  badgeTextLarge: {
    fontSize: 15,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    width: 280,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  previewLabel: {
    marginTop: 8,
    fontSize: 14,
  },
  previewClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
});
