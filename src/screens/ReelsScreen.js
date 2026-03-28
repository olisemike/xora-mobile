/**
 * Reels Screen - Comprehensive Refactor
 *
 * Features:
 * - Full-screen video vertical paging with infinite scroll
 * - Cursor-based pagination for efficient backend queries
 * - Proper back navigation (hardware back, gesture, header button)
 * - Deep linking support for direct reel access
 * - Engagement tracking (views, likes, shares)
 * - Sensitive content filtering
 * - Performance optimizations (memoization, lazy rendering)
 * - Proper error handling and loading states
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  CommonActions,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../contexts/SettingsContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import AdReel from '../components/AdReel';

const { height, width } = Dimensions.get('window');

const formatCount = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

/**
 * MEMOIZED REEL ITEM COMPONENT
 * Handles individual reel rendering with engagement tracking
 */
// eslint-disable-next-line complexity
const ReelItem = memo(({ reel, isActive, onNext, onPrev, onEngagement }) => {
  const videoRef = useRef(null);
  const autoPlayedRef = useRef(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { sharePost, followingUsers, toggleFollowUser, updatePostLikeState } = useAppData();
  const { token } = useAuth();
  const { colors } = useTheme();

  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);  // Videos autoplay by default; user can pause
  const [liked, setLiked] = useState(reel.liked_by_me > 0 || reel.likedByMe);
  const [liking, setLiking] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes || 0);
  const [showControls, setShowControls] = useState(false);

  const controlsTimerRef = useRef(null);

  const postId = reel.postId || reel.id;
  const userModel = reel.user;
  const isFollowing = userModel && followingUsers instanceof Set && followingUsers.has(userModel.id);

  // Track view when reel becomes active
  const viewTrackedRef = useRef(false);
  useEffect(() => {
    if (isActive && !viewTrackedRef.current && token && postId) {
      viewTrackedRef.current = true;
      api.viewReel(token, postId).catch(() => {});
    }
  }, [isActive, token, postId]);

  // Control video playback based on active state
  useEffect(() => {
    if (!videoRef.current) return;
    if (!isActive || paused) {
      videoRef.current.pauseAsync().catch(() => {});
    } else {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [isActive, paused]);

  // Ensure video is fully paused/unloaded when cell unmounts
  useEffect(() => () => {
    if (!videoRef.current) return;
    videoRef.current.pauseAsync().catch(() => {});
    videoRef.current.unloadAsync?.().catch(() => {});
  }, []);

  // Auto-play when reel becomes active (only once, respects user pauses)
  useEffect(() => {
    if (isActive && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      setPaused(false);
    }
    if (!isActive) {
      autoPlayedRef.current = false;
    }
  }, [isActive]);

  // Control skip controls visibility
  useEffect(() => {
    if (paused) {
      // Show controls immediately when paused
      setShowControls(true);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    } else {
      // When playing, show controls for 3 seconds then hide
      setShowControls(true);
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [paused]);

  const handleLikePress = useCallback(async () => {
    if (!token || liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => (wasLiked ? Math.max(0, c - 1) : c + 1));

    try {
      if (wasLiked) {
        await api.unlikePost(token, postId);
      } else {
        await api.likePost(token, postId, 'post', userModel.id);
      }
      // Sync like state across entire app
      updatePostLikeState(postId, !wasLiked);
      onEngagement?.('like', !wasLiked, postId);
    } catch (e) {
      setLiked(wasLiked);
      setLikeCount(c => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      if (__DEV__) console.error('Like error:', e);
    } finally {
      setLiking(false);
    }
  }, [token, liked, liking, postId, userModel.id, updatePostLikeState, onEngagement]);

  const handleFollowToggle = useCallback(() => {
    if (!userModel) {
      Alert.alert('Profile unavailable', 'User profile not available');
      return;
    }
    toggleFollowUser(userModel.id);
  }, [userModel, toggleFollowUser]);

  const skip = useCallback(async (seconds) => {
    if (!videoRef.current) return;

    try {
      const status = await videoRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      const next = status.positionMillis + seconds * 1000;
      await videoRef.current.setPositionAsync(Math.max(0, next));
    } catch (e) {
      if (__DEV__) console.error('Skip error:', e);
    }
  }, []);

  if (!reel.url) {
    return (
      <View style={styles.reelContainer}>
        <View style={[styles.videoTouchable, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle" size={40} color={colors.primary} />
          <Text style={{ color: colors.primary, marginTop: 8 }}>Video unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.reelContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.videoTouchable}
        onPress={() => setPaused(p => !p)}
      >
        <Video
          ref={videoRef}
          isLooping
          isMuted={muted}
          resizeMode="contain"
          shouldPlay={!paused && isActive}
          source={{ uri: reel.url }}
          posterResizeMode="cover"
          posterUrl={reel.thumbnail}
          style={styles.video}
          progressUpdateIntervalMillis={1000}
          onError={(e) => {
            if (__DEV__) console.error('Video error:', reel.url, e);
          }}
        />

        {/* Top-right video index indicator for multi-video posts */}
        {reel.totalVideos > 1 && (
          <View style={[styles.videoIndexBadge, { top: 8 + insets.top }]}>
            <Text style={styles.videoIndexText}>
              {(reel.videoIndex || 0) + 1}/{reel.totalVideos}
            </Text>
          </View>
        )}

        {/* Skip controls */}
        {showControls && (
          <View style={styles.skipControlsContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => skip(-5)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="play-back" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.skipText}>-5s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => skip(5)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="play-forward" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.skipText}>+5s</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom overlay - user info */}
        {!paused && userModel && (
          <View style={[styles.overlayBottom, { bottom: 60 + insets.bottom }]}>
            <View style={styles.userRow}>
              <Text style={[styles.userName, { color: colors.primary }]}>
                {userModel.name}
              </Text>
              <Text style={[styles.username, { color: colors.primary }]}>
                @{userModel.username}
              </Text>
            </View>

            {settings.captionsForVideos && reel.caption && (
              <Text style={[styles.caption, { color: colors.primary }]}>
                {reel.caption}
              </Text>
            )}

            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={handleFollowToggle}
              >
                <Text style={styles.followBtnText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserProfile', { user: userModel })}
              >
                <Ionicons color={colors.primary} name="person-circle-outline" size={26} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Right side engagement buttons */}
        <View style={[styles.actionsColumn, { bottom: 60 + insets.bottom, right: 12 }]}>
          <TouchableOpacity
            style={[styles.actionBtn, liked && { backgroundColor: 'rgba(255,0,0,0.3)' }]}
            onPress={handleLikePress}
            disabled={liking}
          >
            <Ionicons
              color={liked ? '#ff4458' : colors.primary}
              name={liked ? 'heart' : 'heart-outline'}
              size={26}
            />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {formatCount(likeCount)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('PostDetail', { postId })}
          >
            <Ionicons color={colors.primary} name="chatbubble-outline" size={26} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {formatCount(reel.comments || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (sharePost) {
                sharePost({ id: postId, content: reel.caption }).catch(e => {
                  if (__DEV__) console.error('Share error:', e);
                  Alert.alert('Share failed', e?.message || 'Could not share this post');
                });
              }
            }}
          >
            <Ionicons color={colors.primary} name="share-outline" size={26} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setMuted(m => !m)}
          >
            <Ionicons
              color={colors.primary}
              name={muted ? 'volume-mute-outline' : 'volume-high-outline'}
              size={24}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onPrev}>
            <Ionicons color={colors.primary} name="chevron-up" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onNext}>
            <Ionicons color={colors.primary} name="chevron-down" size={20} />
          </TouchableOpacity>
        </View>

        {/* Play indicator */}
        {paused && (
          <View style={styles.playOverlay}>
            <Ionicons color={colors.primary} name="play" size={40} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.reel.id === nextProps.reel.id &&
    prevProps.reel.likes === nextProps.reel.likes
  );
});

ReelItem.displayName = 'ReelItem';

/**
 * MAIN REELS SCREEN
 * Handles full-screen video feed with pagination, engagement tracking, and routing
 */
export default function ReelsScreen() {
  const flatListRef = useRef(null);
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // Auth & context
  const { token } = useAuth();
  const { colors } = useTheme();

  // State
  const [reelsWithAds, setReelsWithAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentReelId, setCurrentReelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPlayedNsfw, setHasPlayedNsfw] = useState(false);
  const [forceNonSensitive, setForceNonSensitive] = useState(false);

  // Route params
  const startPostId = route.params?.postId;

  // ============================================================
  // DATA FETCHING WITH PAGINATION & CURSOR
  // ============================================================
  // eslint-disable-next-line complexity
  const loadReels = useCallback(async (isRefresh = false, cursor = null) => {
    try {
      if (!token) {
        setReelsWithAds([]);
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
        setHasMore(true);
        setNextCursor(null);
      } else if (!cursor) {
        setLoading(true);
      } else if (cursor) {
        setIsLoadingMore(true);
      }

      // Fetch reels with pagination cursor
      const response = await api.getReelsFeed(token, forceNonSensitive, cursor);
      const { reels: feed, pagination } = response;

      if (!Array.isArray(feed) || feed.length === 0) {
        if (isRefresh) {
          setReelsWithAds([]);
          setCurrentIndex(0);
          setCurrentReelId(null);
        } else if (!cursor) {
          setReelsWithAds([]);
        }
        setHasMore(false);
        setNextCursor(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Update pagination info
      setHasMore(pagination?.hasMore ?? false);
      setNextCursor(pagination?.nextCursor ?? null);

      if (cursor) {
        // Append to existing reels (pagination)
        setReelsWithAds(prev => [...prev, ...feed]);
      } else {
        // Replace all reels (initial load or refresh)
        setReelsWithAds(feed);

        // Set starting index if deep linked
        if (startPostId && feed.length > 0) {
          const startIdx = feed.findIndex(r => !r.isAd && (r.id === startPostId || r.postId === startPostId));
          if (startIdx !== -1) {
            setCurrentIndex(startIdx);
            setCurrentReelId(feed[startIdx].id);
          }
        } else if (feed.length > 0) {
          const firstPlayable = feed.find(r => !r.isAd);
          if (firstPlayable) {
            setCurrentReelId(firstPlayable.id);
          }
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.error('Reels load error:', e.message);
      }
      if (!cursor) {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [token, forceNonSensitive, startPostId]);

  // ============================================================
  // BACK NAVIGATION HANDLING
  // ============================================================
  useEffect(() => {
    if (!isFocused) return;

    // Handle hardware back button (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.dispatch(CommonActions.goBack());
      return true;
    });

    return () => backHandler.remove();
  }, [isFocused, navigation]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    if (!cancelled) {
      loadReels(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token, forceNonSensitive, loadReels]);

  // ============================================================
  // NSFW MODE HANDLING
  // ============================================================
  useEffect(() => {
    if (reelsWithAds.length === 0) return;
    const currentReel = reelsWithAds[currentIndex];
    if (currentReel && !currentReel.isAd && (currentReel.is_sensitive === 1 || currentReel.is_sensitive === true)) {
      setHasPlayedNsfw(true);
    } else if (hasPlayedNsfw && currentReel && !currentReel.isAd && (currentReel.is_sensitive !== 1 && currentReel.is_sensitive !== true)) {
      setForceNonSensitive(true);
    }
  }, [currentIndex, reelsWithAds, hasPlayedNsfw]);

  // ============================================================
  // ACTIVE REEL SYNC (FOCUS + DATA CHANGES)
  // ============================================================
  useEffect(() => {
    if (!isFocused) {
      setCurrentReelId(null);
      return;
    }

    if (!Array.isArray(reelsWithAds) || reelsWithAds.length === 0) {
      setCurrentReelId(null);
      return;
    }

    const currentItem = reelsWithAds[currentIndex];
    if (currentItem && !currentItem.isAd) {
      setCurrentReelId(currentItem.id);
      return;
    }

    const nextPlayable = reelsWithAds.find((item, index) => index >= currentIndex && !item.isAd)
      || reelsWithAds.find(item => !item.isAd);

    setCurrentReelId(nextPlayable?.id || null);
  }, [isFocused, reelsWithAds, currentIndex]);

  // ============================================================
  // SCROLL & PAGINATION LOGIC
  // ============================================================
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const firstViewable = viewableItems[0];
      setCurrentIndex(firstViewable.index ?? 0);
      if (firstViewable.item && !firstViewable.item.isAd) {
        setCurrentReelId(firstViewable.item.id);
      }
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    // Use view area coverage so headers/safe area don't block active index updates.
    viewAreaCoveragePercentThreshold: 60,
    minimumViewTime: 100,
  }), []);

  // Pagination: load more when reaching end
  const onEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    if (__DEV__) console.warn('Loading more reels with cursor:', nextCursor);
    loadReels(false, nextCursor);
  }, [hasMore, loading, nextCursor, loadReels]);

  // All reels shown in chronological order - no filtering

  const goToIndex = useCallback((index) => {
    if (!flatListRef.current || index < 0 || index >= reelsWithAds.length) return;
    // Small delay ensures snap-to-interval can work properly
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    }, 0);
  }, [reelsWithAds.length]);

  const handleNext = useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex]);
  const handlePrev = useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex]);

  // ============================================================
  // ENGAGEMENT TRACKING
  // ============================================================
  const handleEngagement = useCallback((type, value, postId) => {
    if (__DEV__) console.warn(`Engagement: ${type}=${value} on post ${postId}`);
    // Could track analytics here
  }, []);

  // ============================================================
  // RENDER CALLBACKS
  // ============================================================
  const keyExtractor = useCallback((item) => `${item.id}-${item.isAd ? 'ad' : 'reel'}`, []);

  const renderItem = useCallback(({ item }) => {
    if (item.isAd) {
      return <AdReel adData={item} onNext={handleNext} onSkip={handleNext} />;
    }
    const isActive = isFocused && item.id === currentReelId;

    return (
      <ReelItem
        isActive={isActive}
        reel={item}
        onNext={handleNext}
        onPrev={handlePrev}
        onEngagement={handleEngagement}
      />
    );
  }, [isFocused, currentReelId, handleNext, handlePrev, handleEngagement]);

  // ============================================================
  // HEADER WITH BACK BUTTON
  // ============================================================
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ paddingLeft: 16 }}
          onPress={() => navigation.dispatch(CommonActions.goBack())}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
      ),
      headerTitle: 'Reels',
      headerTitleAlign: 'center',
    });
  }, [navigation, colors.primary]);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading && reelsWithAds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading reels...</Text>
      </View>
    );
  }

  if (reelsWithAds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40 }}>No reels available</Text>
      </View>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Reels FlatList - Unified infinite scroll */}
      <FlatList
        ref={flatListRef}
        pagingEnabled
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={height}
        disableIntervalMomentum
        data={reelsWithAds}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        initialNumToRender={2}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        refreshing={refreshing}
        onRefresh={() => loadReels(true)}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        ListFooterComponent={
          isLoadingMore && hasMore ? (
            <View style={{ paddingVertical: 12, alignItems: 'center', height }}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more reels...</Text>
            </View>
          ) : !hasMore && reelsWithAds.length > 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', height }}>
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                End of List
              </Text>
            </View>
          ) : reelsWithAds.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', height }}>
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                No reels available
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    height,
    width,
    backgroundColor: '#000',
  },
  videoTouchable: {
    flex: 1,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayBottom: {
    position: 'absolute',
    left: 12,
    right: 80,
  },
  userRow: {
    marginBottom: 6,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
  },
  username: {
    fontSize: 13,
  },
  caption: {
    fontSize: 14,
    marginVertical: 4,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  actionsColumn: {
    position: 'absolute',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndexBadge: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  videoIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  skipControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
  },
  skipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  loadingText: {
    fontSize: 14,
  },
  endOfListText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#000',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 3,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
