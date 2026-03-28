import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api, { getCloudflareImageUrl } from '../services/api';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useMobilePushNotifications } from '../hooks/useMobilePushNotifications';

import { useAuth } from './AuthContext';

const STORAGE_FOLLOW_USERS = 'xora_follow_users_v1';

// File size limits (matching backend config in wrangler.toml)
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

// Helper to format file size for display
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Helper to detect MIME type from file URI or name
const getMimeType = (uri, fallback = 'application/octet-stream') => {
  const ext = (uri || '').split('.').pop()?.toLowerCase();
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    heif: 'image/heif', bmp: 'image/bmp',
    // Videos
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm', wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv', mpeg: 'video/mpeg', mpg: 'video/mpeg',
  };
  return mimeTypes[ext] || fallback;
};

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  const { user, token, refreshAccessToken } = useAuth();

  // Memoize refreshAccessToken to use in dependency arrays
  const refreshTokenStable = useCallback(() => refreshAccessToken(), [refreshAccessToken]);

  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [latestMessageAction, setLatestMessageAction] = useState(null);
  const [latestEngagementUpdate, setLatestEngagementUpdate] = useState(null);

  const updatePostLikeState = useCallback((postId, nextLiked) => {
    if (!postId) return;
    const targetId = String(postId);
    const delta = nextLiked ? 1 : -1;

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        const isTarget = String(p.id) === targetId || (p.original && String(p.original.id) === targetId);
        if (!isTarget) return p;

        const updated = {
          ...p,
          likes: Math.max(0, Number(p.likes || 0) + delta),
          isLiked: nextLiked,
          liked_by_me: nextLiked,
          is_liked: nextLiked,
        };

        if (p.original && String(p.original.id) === targetId) {
          updated.original = {
            ...p.original,
            likes: Math.max(0, Number(p.original.likes || 0) + delta),
            isLiked: nextLiked,
            liked_by_me: nextLiked,
            is_liked: nextLiked,
          };
        }

        return updated;
      }),
    );
  }, []);

  const updatePostCommentCount = useCallback((postId, delta) => {
    if (!postId || !delta) return;
    const targetId = String(postId);

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        const isTarget = String(p.id) === targetId || (p.original && String(p.original.id) === targetId);
        if (!isTarget) return p;

        const updated = {
          ...p,
          comments: Math.max(0, Number(p.comments || 0) + delta),
        };

        if (p.original && String(p.original.id) === targetId) {
          updated.original = {
            ...p.original,
            comments: Math.max(0, Number(p.original.comments || 0) + delta),
          };
        }

        return updated;
      }),
    );
  }, []);

  const updatePostShareCount = useCallback((postId, delta) => {
    if (!postId || !delta) return;
    const targetId = String(postId);

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        const isTarget = String(p.id) === targetId || (p.original && String(p.original.id) === targetId);
        if (!isTarget) return p;

        const updated = {
          ...p,
          shares: Math.max(0, Number(p.shares || 0) + delta),
        };

        if (p.original && String(p.original.id) === targetId) {
          updated.original = {
            ...p.original,
            shares: Math.max(0, Number(p.original.shares || 0) + delta),
          };
        }

        return updated;
      }),
    );
  }, []);

  // Push notifications registration
  useMobilePushNotifications(user?.id, token);

  // Memoize WebSocket callbacks to prevent reconnects on every render
  const wsCallbacks = useMemo(() => ({
    onPostAction: (_action, post) => {
      const normalizedPost = api.normalizePostForRealtime ? api.normalizePostForRealtime(post) : post;
      const targetPost = normalizedPost || post;
      const targetPostId = String(targetPost?.id || post?.id || '');

      if (!targetPost || !targetPostId) return;

      setPosts(prevPosts => {
        if (_action === 'deleted') {
          return prevPosts.filter(p => String(p.id) !== targetPostId);
        }
        const idx = prevPosts.findIndex(p => String(p.id) === targetPostId);
        if (idx >= 0) {
          const updated = [...prevPosts];
          updated[idx] = { ...updated[idx], ...targetPost };
          return updated;
        }
        // New post - append to END (users discover it while scrolling down, not interrupting their view)
        return [...prevPosts, targetPost];
      });
    },
    onCommentAction: (_action, _comment) => {
      // Counts are driven by engagement_update events to avoid double updates.
    },
    onLikeAction: (_action, _like) => {
      // Counts are driven by engagement_update events to avoid double updates.
    },
    onBookmarkAction: (_action, bookmark) => {
      if (_action === 'bookmarked') {
        setBookmarks(prev => new Set([...prev, bookmark.postId]));
      } else {
        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(bookmark.postId);
          return next;
        });
      }
    },
    onShareAction: (_action, _share, _postOwnerId) => {
      // Counts are driven by engagement_update events to avoid double updates.
    },
    onReelAction: (_action, _reel) => {
      // Handle reel updates if you have reels state
    },
    onStoryAction: (_action, _story) => {
      // Handle story updates if you have stories state
    },
    onFollowAction: (_action, follow) => {
      if (_action === 'followed') {
        setFollowingUsers(prev => new Set([...prev, follow.targetUserId]));
      } else {
        setFollowingUsers(prev => {
          const next = new Set(prev);
          next.delete(follow.targetUserId);
          return next;
        });
      }
    },
    onProfileUpdate: (_userId, _updatedFields) => {
      // Profile updates are handled by AuthContext
    },
    onMessageAction: (_action, message, conversationId) => {
      const normalizedConversationId = String(conversationId || message?.conversationId || message?.conversation_id || '');
      const senderId = String(message?.senderId || message?.sender_id || message?.fromUserId || message?.from_user_id || '');
      const isIncoming = Boolean(user?.id) && Boolean(senderId) && senderId !== String(user.id);

      // Update conversation with new message
      setLatestMessageAction({
        action: _action,
        message,
        conversationId: normalizedConversationId,
        receivedAt: Date.now(),
      });

      if (_action === 'sent' && isIncoming) {
        setUnreadNotificationCount(prev => prev + 1);
      }

      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (String(conv.id) === normalizedConversationId) {
            return {
              ...conv,
              lastMessage: message.text || 'New message',
              timestamp: message.time || 'now',
              unread: _action === 'sent' && isIncoming ? true : conv.unread,
            };
          }
          return conv;
        });
      });
    },
    onFeedRefresh: (_feedType) => {
      // Optionally refresh the feed
    },
    onNotification: (_notification) => {
      setUnreadNotificationCount(prev => prev + 1);
    },
    onEngagementUpdate: (postId, engagementType, counts) => {
      if (__DEV__) {
        console.info('[Realtime] engagement_update', { postId, engagementType, counts });
      }
      setLatestEngagementUpdate({ postId, engagementType, counts, receivedAt: Date.now() });
      // Handle post deletion broadcast
      if (engagementType === 'deleted') {
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postId && p.original?.id !== postId));
        return;
      }

      // Update engagement counts for the post in real-time
      // Note: normalized posts use 'likes', 'comments', 'shares' (not likeCount, commentCount, shareCount)
      setPosts(prevPosts =>
        prevPosts.map(p => {
          // Check both the post ID and original post ID for shared posts
          const isTargetPost = p.id === postId || (p.original && p.original.id === postId);
          if (!isTargetPost) return p;

          // Update the main post counts
          const updatedPost = {
            ...p,
            likes: counts.likesCount ?? p.likes,
            comments: counts.commentsCount ?? p.comments,
            shares: counts.sharesCount ?? p.shares,
          };

          // Also update original post if this is a share
          if (p.original && p.original.id === postId) {
            updatedPost.original = {
              ...p.original,
              likes: counts.likesCount ?? p.original.likes,
              comments: counts.commentsCount ?? p.original.comments,
              shares: counts.sharesCount ?? p.original.shares,
            };
          }

          return updatedPost;
        }),
      );
    },
  }), [user?.id]);

  // Single WebSocket connection for all real-time updates
  const { isConnected: _wsConnected } = useRealtimeUpdates(
    user?.id,
    token,
    wsCallbacks,
  );

  // Load core app data (feed, conversations) from backend when auth token changes
  useEffect(() => {
    if (!token) {
      setPosts([]);
      setConversations([]);
      setBlocked([]);
      setUsers([]);
      setFollowingUsers(new Set());
      setBookmarks(new Set());
      setUnreadNotificationCount(0);
      return;
    }

    let cancelled = false;

    const loadAll = async () => {
      try {
        const username = user?.username;
        const feedResult = await api.getFeed(token);

        // Handle new pagination response format
        let feedPosts = [];
        let feedCursor = null;
        let feedHasMore = false;
        if (feedResult && typeof feedResult === 'object' && 'posts' in feedResult && 'pagination' in feedResult) {
          feedPosts = feedResult.posts || [];
          feedCursor = feedResult.pagination?.nextCursor || null;
          feedHasMore = feedResult.pagination?.hasMore || false;
        } else if (Array.isArray(feedResult)) {
          feedPosts = feedResult;
        }

        const [apiConversations, apiBlocks, apiUsers, apiFollowing, bookmarkData] = await Promise.all([
          api.getConversations(token),
          api.getBlocks(token),
          api.getSuggestedUsers(token),
          username ? api.getUserFollowing(token, username) : Promise.resolve([]),
          api.getBookmarks(token),
        ]);
        if (cancelled) return;
        setPosts(feedPosts);
        setNextCursor(feedCursor);
        setHasMorePosts(feedHasMore);
        setConversations(apiConversations);
        setBlocked(apiBlocks);
        setUsers(apiUsers || []);

        if (Array.isArray(apiFollowing) && apiFollowing.length > 0) {
          const userIds = apiFollowing
            .filter((item) => (item.type || 'user') === 'user')
            .map((item) => String(item.id));
          setFollowingUsers(new Set(userIds));
        }

        setBookmarks(new Set(bookmarkData.map(b => b.id)));
      } catch (e) {
        if (!cancelled) {
          const errorMessage = e?.message || String(e);
          if (errorMessage.includes('Invalid or expired token') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            // Try to refresh the token
            const newToken = await refreshTokenStable();
            if (newToken && !cancelled) {
              // Retry loading data with new token
              try {
                const username = user?.username;
                const feedResult = await api.getFeed(newToken);

                // Handle new pagination response format
                let feedPosts = [];
                let feedCursor = null;
                let feedHasMore = false;
                if (feedResult && typeof feedResult === 'object' && 'posts' in feedResult && 'pagination' in feedResult) {
                  feedPosts = feedResult.posts || [];
                  feedCursor = feedResult.pagination?.nextCursor || null;
                  feedHasMore = feedResult.pagination?.hasMore || false;
                } else if (Array.isArray(feedResult)) {
                  feedPosts = feedResult;
                }

                const [apiConversations, apiBlocks, apiUsers, apiFollowing, bookmarkData] = await Promise.all([
                  api.getConversations(newToken),
                  api.getBlocks(newToken),
                  api.getSuggestedUsers(newToken),
                  username ? api.getUserFollowing(newToken, username) : Promise.resolve([]),
                  api.getBookmarks(newToken),
                ]);
                if (!cancelled) {
                  setPosts(feedPosts);
                  setNextCursor(feedCursor);
                  setHasMorePosts(feedHasMore);
                  setConversations(apiConversations);
                  setBlocked(apiBlocks);
                  setUsers(apiUsers || []);

                  if (Array.isArray(apiFollowing) && apiFollowing.length > 0) {
                    const userIds = apiFollowing
                      .filter((item) => (item.type || 'user') === 'user')
                      .map((item) => String(item.id));
                    setFollowingUsers(new Set(userIds));
                  }

                  setBookmarks(new Set(bookmarkData.map(b => b.id)));
                }
              } catch (retryError) {
                if (__DEV__) console.error('Failed to load app data after token refresh:', retryError);
              }
            } else {
              // Refresh failed, user will be logged out by AuthContext
              setPosts([]);
              setConversations([]);
              setBlocked([]);
              setUsers([]);
            }
          } else {
            if (__DEV__) console.error('Failed to load app data from backend:', e);
          }
        }
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [token, user?.username, refreshTokenStable]);

  // Load unread notification count on mount (WebSocket will handle real-time updates)
  useEffect(() => {
    if (!token) return;

    const loadUnreadCount = async () => {
      try {
        const { notifications = [] } = await api.getNotifications(token);
        if (Array.isArray(notifications)) {
          const unreadCount = notifications.filter((n) => n.read === false || n.read === 0 || !n.read).length;
          setUnreadNotificationCount(unreadCount);
        }
      } catch (_e) {
        // Silently handle notification count loading errors
      }
    };

    loadUnreadCount();
  }, [token]);

  // Foreground catch-up: recover notifications/messages after offline or background gaps.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' || !token) return;

      try {
        const [unreadCount, apiConversations] = await Promise.all([
          api.getUnreadNotificationCount(token),
          api.getConversations(token),
        ]);

        if (typeof unreadCount === 'number') {
          setUnreadNotificationCount(unreadCount);
        }

        if (Array.isArray(apiConversations)) {
          setConversations(apiConversations);
        }
      } catch (error) {
        if (__DEV__) console.error('Foreground catch-up sync failed:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  const addPost = useCallback(async (content, media = [], identity, metadata = {}) => {
    const trimmed = (content || '').trim();
    if (!trimmed && (!media || media.length === 0)) return;
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      // Upload media first (if any) using pre-signed URLs from backend
      const imageUrls = [];
      const videoUrls = [];

      const failedUploads = [];

      // Process media uploads concurrently using Promise.allSettled
      const uploadPromises = (media || []).map(async (item) => {
        if (!item?.uri) return null;

        // Validate file size before upload
        const fileSize = item.fileSize || item.size || 0;
        const isVideo = item.type === 'video';
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        const maxSizeLabel = isVideo ? '1GB' : '100MB';

        if (fileSize > maxSize) {
          const fileName = item.name || item.fileName || (isVideo ? 'Video' : 'Image');
          failedUploads.push(`${fileName} exceeds ${maxSizeLabel} limit (${formatFileSize(fileSize)})`);
          return null;
        }

        if (isVideo) {
          try {
            const { uploadURL, id, playbackUrl, streamSubdomain } = await api.getVideoUploadURL(token, 3600);
            const formData = new FormData();
            const fileName = item.name || `video_${Date.now()}.mp4`;
            formData.append('file', {
              uri: item.uri,
              name: fileName,
              type: getMimeType(item.uri || fileName, 'video/mp4'),
            });
            const uploadResp = await fetch(uploadURL, {
              method: 'POST',
              body: formData,
            });
            if (!uploadResp.ok) {
              throw new Error(`Upload failed (${uploadResp.status})`);
            }

            // Cloudflare Stream direct upload returns empty body on success
            // Use the playbackUrl we got from backend (pre-calculated)
            const finalUrl = playbackUrl;
            if (!finalUrl) {
              throw new Error('No playback URL returned from backend');
            }

            // Extract video ID from playback URL for thumbnail generation
            // Format: https://customer-xxx.cloudflarestream.com/{videoId}/manifest/video.m3u8
            let videoId = id; // Fallback to ID from upload URL endpoint
            const videoIdMatch = finalUrl.match(/cloudflarestream\.com\/([^/]+)\/(manifest|thumbnails)/);
            if (videoIdMatch) {
              videoId = videoIdMatch[1];
            }

            // Generate thumbnail URL from video ID using subdomain from backend
            const CLOUDFLARE_STREAM_SUBDOMAIN = streamSubdomain || 'customer-virwr1ukt49zj3yu.cloudflarestream.com';
            const thumbnailUrl = `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${videoId}/thumbnails/thumbnail.jpg`;

            return { type: 'video', url: finalUrl, thumbnail: thumbnailUrl, videoId };
          } catch (uploadError) {
            if (__DEV__) console.error('Video upload failed:', uploadError);
            failedUploads.push(`${item.name || 'Video'}: Upload failed`);
            return null;
          }
        } else {
          try {
            const { uploadURL, id, deliveryUrl } = await api.getImageUploadURL(token);
            const formData = new FormData();
            const fileName = item.name || `image_${Date.now()}.jpg`;
            formData.append('file', {
              uri: item.uri,
              name: fileName,
              type: getMimeType(item.uri || fileName, 'image/jpeg'),
            });
            const uploadResp = await fetch(uploadURL, {
              method: 'POST',
              body: formData,
            });
            if (!uploadResp.ok) {
              throw new Error(`Upload failed (${uploadResp.status})`);
            }
            let finalUrl = null;

            // Try to extract URL from Cloudflare response
            try {
              const uploadJson = await uploadResp.json();
              if (__DEV__) console.log('[Upload] Cloudflare image response:', uploadJson);
              // Cloudflare returns variants array for direct uploads
              finalUrl =
                uploadJson?.result?.variants?.[0] ||
                uploadJson?.result?.url ||
                uploadJson?.url ||
                null;
            } catch (parseErr) {
              if (__DEV__) console.warn('[Upload] Could not parse Cloudflare response:', parseErr);
            }

            // Use the deliveryUrl we got from backend (pre-calculated)
            // This is the authoritative source
            if (!finalUrl) {
              finalUrl = deliveryUrl;
            }

            // Last resort: construct URL from ID
            if (!finalUrl) {
              finalUrl = getCloudflareImageUrl(id);
            }
            if (!finalUrl) {
              throw new Error('No image URL returned from upload');
            }
            return { type: 'image', url: finalUrl, cloudflareId: id };
          } catch (uploadError) {
            if (__DEV__) console.error('Image upload failed:', uploadError);
            failedUploads.push(`${item.name || 'Image'}: Upload failed`);
            return null;
          }
        }
      });

      const uploadResults = await Promise.allSettled(uploadPromises);

      // IMPORTANT: Preserve original upload order by mapping results back to media array positions
      // This ensures video indices match the carousel display order
      const cloudflareImageIds = [];
      const cloudflareVideoIds = [];
      const mediaUrls = [];

      uploadResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.type === 'video') {
            // Push full video object to preserve thumbnail and metadata
            mediaUrls.push({
              type: 'video',
              url: result.value.url,
              thumbnail: result.value.thumbnail,
              videoId: result.value.videoId,
            });
            // Track videos for mediaType determination
            videoUrls.push(result.value.url);
            // Collect Cloudflare Stream video IDs for cleanup on deletion
            if (result.value.videoId) {
              cloudflareVideoIds.push(result.value.videoId);
            }
          } else if (result.value.type === 'image') {
            // Push full image object
            mediaUrls.push({
              type: 'image',
              url: result.value.url,
              cloudflareId: result.value.cloudflareId,
            });
            // Track images for mediaType determination
            imageUrls.push(result.value.url);
            // Collect Cloudflare image IDs for cleanup on deletion
            if (result.value.cloudflareId) {
              cloudflareImageIds.push(result.value.cloudflareId);
            }
          }
        }
      });

      // If all uploads failed, throw an error
      if (failedUploads.length > 0 && mediaUrls.length === 0 && media.length > 0) {
        throw new Error(`Upload failed: ${failedUploads.join('; ')}`);
      }

      // If some uploads failed but some succeeded, log warning (post will still be created)
      if (failedUploads.length > 0 && mediaUrls.length > 0) {
        if (__DEV__) console.warn('Some media files were skipped:', failedUploads);
      }

      let mediaType = null;
      if (mediaUrls.length > 0) {
        const hasImages = imageUrls.length > 0;
        const hasVideos = videoUrls.length > 0;
        if (hasImages && hasVideos) mediaType = 'mixed';
        else if (hasVideos) mediaType = 'video';
        else mediaType = 'image';
      }

      const created = await api.createPost({
        token,
        content: trimmed,
        isSensitive: metadata.sensitive || false,
        actorType: 'user',
        actorId: user?.id,
        mediaUrls,
        cloudflareImageIds,
        cloudflareVideoIds: cloudflareVideoIds.length > 0 ? cloudflareVideoIds : undefined,
        mediaType,
        postType: metadata.postType || 'POST',
      });
      // Only add to posts feed if it's a regular post (not a story)
      if (metadata.postType !== 'STORY') {
        setPosts((prev) => [created, ...prev]);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to create post from mobile:', e);
      throw e;
    }
  }, [token, user]);

  const sharePost = useCallback(async (basePost) => {
    if (!basePost || !token) {
      if (__DEV__ && !token) console.warn('sharePost: no auth token');
      return;
    }

    try {
      const original = basePost.kind === 'share' ? basePost.original : basePost;
      const postIdToShare = original?.id || basePost?.id;
      if (!postIdToShare) {
        throw new Error('Invalid post for sharing');
      }

      // Call backend to persist the share
      await api.sharePost(token, postIdToShare, 'user', user?.id, '');

      // Increment share count on the original post
      updatePostShareCount(postIdToShare, 1);

      // After successful backend persist, update local state optimistically
      const sharer = {
        type: 'user',
        id: user?.id,
        name: user?.name,
        username: user?.username,
        avatar: user?.avatar,
      };

      const shared = {
        id: `share-${Date.now().toString()}`,
        kind: 'share',
        sharedBy: {
          id: sharer.id,
          name: sharer.name,
          username: sharer.username,
          avatar: sharer.avatar,
          type: sharer.type,
        },
        timestamp: 'now',
        original,
      };

      setPosts((prev) => [shared, ...prev]);
    } catch (e) {
      if (__DEV__) console.error('Failed to share post:', e);
      throw e;
    }
  }, [token, user, updatePostShareCount]);

  const toggleBookmark = useCallback(async (postId) => {
    if (!postId) return;
    if (!token) {
      if (__DEV__) console.warn('toggleBookmark: no auth token');
      return;
    }

    // Capture current state BEFORE updating
    const wasBookmarked = bookmarks.has(postId);

    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });

    try {
      if (wasBookmarked) {
        await api.removeBookmark(token, postId);
      } else {
        await api.addBookmark(token, postId);
      }
    } catch (e) {
      const message = e?.message || String(e);
      const alreadyBookmarked = message.includes('Already bookmarked');
      const notBookmarked = message.includes('Not bookmarked');

      if ((!wasBookmarked && alreadyBookmarked) || (wasBookmarked && notBookmarked)) {
        return;
      }

      if (__DEV__) console.error('Failed to toggle bookmark on backend:', e);
      // On failure we keep local state; user can retry.
    }
  }, [token, bookmarks]);

  const toggleBlock = useCallback(async (entity) => {
    if (!entity || !entity.id || !entity.type) return;
    if (!token) {
      if (__DEV__) console.warn('toggleBlock: no auth token');
      return;
    }

    const exists = blocked.find((b) => b.id === entity.id && b.type === entity.type);

    // Optimistic local update
    setBlocked((prev) => {
      if (exists) {
        return prev.filter((b) => !(b.id === entity.id && b.type === entity.type));
      }
      return [...prev, entity];
    });

    try {
      if (exists) {
        await api.unblockEntity(token, entity);
      } else {
        await api.blockEntity(token, entity);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to toggle block on backend:', e);
      // We are not reverting optimistic state here; user can refresh from server later.
    }
  }, [blocked, token]);

  const toggleFollowUser = useCallback(async (userId) => {
    if (!userId) return;
    if (!token) {
      if (__DEV__) console.warn('toggleFollowUser: no auth token');
      return;
    }

    const isFollowing = followingUsers instanceof Set && followingUsers.has(userId);

    // Optimistic update
    setFollowingUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      if (isFollowing) {
        await api.unfollowUser(token, userId);
      } else {
        await api.followUser(token, userId);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to toggle user follow on backend:', e);
      // We keep optimistic state; can be refreshed from server later.
    }
  }, [followingUsers, token]);

  const removePost = useCallback((postId) => {
    if (!postId) return;
    setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
  }, [setPosts]);

  const refreshFeed = useCallback(async () => {
    if (!token) return;
    try {
      // Skip cache on manual refresh to get fresh data
      const result = await api.getFeed(token, null, { skipCache: true });
      // Handle new pagination response format { posts, pagination: { hasMore, nextCursor } }
      if (result && typeof result === 'object' && 'posts' in result && 'pagination' in result) {
        setPosts(result.posts || []);
        setNextCursor(result.pagination?.nextCursor || null);
        setHasMorePosts(result.pagination?.hasMore || false);
      } else {
        // Fallback for old response format (array of posts)
        setPosts(Array.isArray(result) ? result : []);
        setNextCursor(null);
        setHasMorePosts(false);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to refresh feed:', e);
      setNextCursor(null);
      setHasMorePosts(false);
    }
  }, [token]);

  const loadMorePosts = useCallback(async () => {
    // Guard conditions
    if (!nextCursor || isLoadingMorePosts || !hasMorePosts) return;
    if (!token) return;

    setIsLoadingMorePosts(true);
    try {
      const result = await api.getFeed(token, nextCursor);
      // Handle pagination response
      if (result && typeof result === 'object' && 'posts' in result && 'pagination' in result) {
        const newPosts = result.posts || [];

        // Deduplicate: create Set of existing post IDs
        const existingIds = new Set(posts.map(p => p.id));

        // Filter out posts that already exist
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));

        // Only add posts that aren't already in the array
        if (uniqueNewPosts.length > 0) {
          setPosts((prev) => [...prev, ...uniqueNewPosts]);
        }
        // eslint-disable-next-line no-trailing-spaces
        
        setNextCursor(result.pagination?.nextCursor || null);
        setHasMorePosts(result.pagination?.hasMore || false);
      } else if (Array.isArray(result)) {
        // Fallback for old response format
        const existingIds = new Set(posts.map(p => p.id));
        const uniqueNewPosts = result.filter(p => !existingIds.has(p.id));
        if (uniqueNewPosts.length > 0) {
          setPosts((prev) => [...prev, ...uniqueNewPosts]);
        }
        setNextCursor(null);
        setHasMorePosts(false);
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to load more posts:', e);
      // Keep current state on error - user can retry
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [token, nextCursor, isLoadingMorePosts, hasMorePosts, posts]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rawUsers = await AsyncStorage.getItem(STORAGE_FOLLOW_USERS);
        if (!cancelled && rawUsers) {
          try {
            const arr = JSON.parse(rawUsers);
            setFollowingUsers(new Set(arr));
          } catch (parseError) {
            if (__DEV__) console.error('Failed to parse following users:', parseError);
            await AsyncStorage.removeItem(STORAGE_FOLLOW_USERS);
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (__DEV__) console.error('Failed to load following data:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const arr = Array.from(followingUsers);
    AsyncStorage.setItem(STORAGE_FOLLOW_USERS, JSON.stringify(arr)).catch((e) => {
      if (__DEV__) {
        console.error('Failed to save following users:', e);
      }
    });
  }, [followingUsers]);

  const value = useMemo(
    () => ({
      posts,
      setPosts,
      removePost,
      refreshFeed,
      loadMorePosts,
      nextCursor,
      hasMorePosts,
      isLoadingMorePosts,
      bookmarks,
      toggleBookmark,
      addPost,
      sharePost,
      users,
      blocked,
      toggleBlock,
      conversations,
      setConversations,
      followingUsers,
      toggleFollowUser,
      unreadNotificationCount,
      setUnreadNotificationCount,
      latestMessageAction,
      latestEngagementUpdate,
      updatePostLikeState,
      updatePostCommentCount,
      updatePostShareCount,
    }),
    [
      posts,
      bookmarks,
      blocked,
      conversations,
      followingUsers,
      users,
      unreadNotificationCount,
      latestMessageAction,
      latestEngagementUpdate,
      nextCursor,
      hasMorePosts,
      isLoadingMorePosts,
      updatePostLikeState,
      updatePostCommentCount,
      updatePostShareCount,
      addPost,
      refreshFeed,
      loadMorePosts,
      toggleBlock,
      toggleBookmark,
      toggleFollowUser,
      removePost,
      sharePost,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
};
