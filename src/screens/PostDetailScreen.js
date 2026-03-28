import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';

import { useAppData } from '../contexts/AppDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api, { getCloudflareImageUrl } from '../services/api';
import { validateFileSize, getMediaType, uploadMediaFile } from '../services/mediaUploadService';
import HashtagText from '../components/HashtagText';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import PostMedia from '../components/PostMedia';

// Fullscreen Video Modal Component with skip controls
const FullscreenVideoModal = ({ url, onClose }) => {
  const videoRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef(null);

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

  // Control skip controls visibility
  useEffect(() => {
    // Show controls initially
    setShowControls(true);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  const handleVideoPress = useCallback(() => {
    setShowControls(prev => !prev);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (!showControls) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [showControls]);

  return (
    <View style={styles.videoModalContainer}>
      {/* Close Button */}
      <TouchableOpacity style={styles.videoModalCloseBtn} onPress={onClose}>
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.videoModalVideoContainer}
        onPress={handleVideoPress}
      >
        <Video
          ref={videoRef}
          source={{ uri: url }}
          style={styles.videoModalVideo}
          resizeMode="contain"
          shouldPlay
          useNativeControls
        />
      </TouchableOpacity>

      {/* Skip controls */}
      {showControls && (
        <View style={styles.videoModalSkipControls}>
          <TouchableOpacity
            style={styles.videoModalSkipButton}
            onPress={() => skip(-5)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="play-back" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.videoModalSkipText}>-5s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.videoModalSkipButton}
            onPress={() => skip(5)}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="play-forward" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.videoModalSkipText}>+5s</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const PostDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { toggleBookmark, bookmarks, sharePost, refreshFeed, removePost, latestEngagementUpdate, updatePostLikeState, updatePostCommentCount, updatePostShareCount } = useAppData();
  const { postId } = route.params;
  const { settings } = useSettings();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const largeText = settings.textSizeLarge;
  const autoPlayVideo = settings.mediaAutoplayMobile;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [commentVideo, setCommentVideo] = useState(null);
  const [commentUploadProgress, setCommentUploadProgress] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewingCommentMedia, setViewingCommentMedia] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(-1);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const imageScrollRef = useRef(null);
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(Dimensions.get('window').height);
  const [mediaLayout, setMediaLayout] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [p, c] = await Promise.all([
          api.getPost(token, postId),
          api.getPostComments(token, postId),
        ]);
        setPost(p);

        // Initialize liked state from post data
        const original = p && p.kind === 'share' ? p.original : p;
        if (original) {
          const likedFlag = original.isLiked ?? original.liked_by_me ?? original.is_liked;
          if (likedFlag !== undefined) {
            setLiked(Boolean(likedFlag));
          }
        }

        setComments(
          c.map((cm) => ({
            id: cm.id,
            author: cm.authorName,
            text: cm.text,
            time: cm.createdAt,
            ownerId: cm.actorId ?? cm.actor_id ?? cm.userId ?? cm.user_id ?? cm.ownerId,
            media: cm.mediaUrls || cm.media || [],
            image: cm.image || null,
          })),
        );
      } catch (e) {
        if (__DEV__) console.error('Failed to load post detail:', e);
        // If post not found (404), remove it from the feed to prevent stale data
        if (e?.message?.includes('not found') || e?.message?.includes('404')) {
          removePost(postId);
        }
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, postId, removePost]);

  useEffect(() => {
    if (!latestEngagementUpdate) return;

    setPost((prev) => {
      if (!prev) return prev;

      const basePostId = prev.kind === 'share' && prev.original ? prev.original.id : prev.id;
      if (String(latestEngagementUpdate.postId) !== String(basePostId)) return prev;

      const { counts, engagementType } = latestEngagementUpdate;
      if (engagementType === 'deleted') {
        return null;
      }

      const applyCounts = (target) => {
        const next = {
          ...target,
          likes: counts?.likesCount ?? target.likes,
          comments: counts?.commentsCount ?? target.comments,
          shares: counts?.sharesCount ?? target.shares,
        };

        const unchanged =
          next.likes === target.likes &&
          next.comments === target.comments &&
          next.shares === target.shares;

        return unchanged ? target : next;
      };

      if (prev.kind === 'share' && prev.original) {
        const updatedOriginal = applyCounts(prev.original);
        if (updatedOriginal === prev.original) return prev;
        return {
          ...prev,
          original: updatedOriginal,
        };
      }

      return applyCounts(prev);
    });
  }, [latestEngagementUpdate]);

  const handlePickCommentImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow media access to attach images or videos to comments.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets.length) return;

    const asset = result.assets[0];
    const mediaType = getMediaType(asset.fileName || asset.uri);

    // File size validation
    if (asset.fileSize && asset.fileSize > 0) {
      try {
        validateFileSize(asset.fileSize);
      } catch (error) {
        Alert.alert('File too large', error.message || 'Maximum file size is 100MB');
        return;
      }
    }

    if (mediaType === 'video') {
      setCommentVideo(asset.uri);
      setCommentImage(null);
    } else {
      setCommentImage(asset.uri);
      setCommentVideo(null);
    }
  };

  const handleAddComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed && !commentImage && !commentVideo) {
      Alert.alert('Error', 'Please enter a comment or select media');
      return;
    }
    if (submittingComment) {
      return; // Prevent duplicate submission
    }
    if (trimmed.length > 500) {
      Alert.alert('Comment too long', 'Comments must be under 500 characters');
      return;
    }
    if (!token) {
      Alert.alert('Not signed in', 'You must be logged in to comment.');
      return;
    }
    setSubmittingComment(true);
    const actorType = 'user';
    const actorId = user?.id;
    if (!actorId) {
      Alert.alert('Error', 'Unable to determine your identity for commenting.');
      return;
    }

    try {
      // Upload comment media if present (image or video)
      let uploadedMediaUrls = null;
      if (commentImage) {
        try {
          // Get signed upload URL using the correct API method
          const { uploadURL, id, deliveryUrl } = await api.getImageUploadURL(token);

          if (!uploadURL) {
            throw new Error('Failed to get upload URL');
          }

          // Upload image
          const formData = new FormData();
          formData.append('file', {
            uri: commentImage,
            type: 'image/jpeg',
            name: `comment-${Date.now()}.jpg`,
          });
          const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
          });
          const uploadResult = await uploadResponse.json().catch(() => null);
          const finalUrl =
            uploadResult?.result?.variants?.[0] ||
            uploadResult?.result?.url ||
            deliveryUrl ||
            getCloudflareImageUrl(id);

          if (!finalUrl) {
            throw new Error('Failed to get uploaded image URL');
          }

          uploadedMediaUrls = [{ type: 'image', url: finalUrl, name: `comment-${Date.now()}.jpg`, cloudflareId: id }];
        } catch (err) {
          if (__DEV__) console.error('Image upload failed:', err);
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
      } else if (commentVideo) {
        try {
          const commentId = `comment-${Date.now()}`;
          setCommentUploadProgress((prev) => ({ ...prev, [commentId]: 0 }));

          // Get video upload URL from API (with playback URL support)
          const { uploadURL, id, playbackUrl, streamSubdomain } = await api.getVideoUploadURL(token);

          const file = {
            uri: commentVideo,
            type: 'video/mp4',
            name: `comment-${Date.now()}.mp4`,
          };

          const uploadResult = await uploadMediaFile(uploadURL, file, (progress) => {
            setCommentUploadProgress((prev) => ({ ...prev, [commentId]: progress }));
          });

          if (!uploadResult) {
            throw new Error('Failed to upload video');
          }

          // Use proper Stream URL for video playback (not image delivery)
          // playbackUrl is pre-calculated by backend and includes the video ID
          let finalVideoUrl = playbackUrl;
          if (!finalVideoUrl && streamSubdomain && id) {
            // Construct Stream URL if playbackUrl not available
            finalVideoUrl = `https://${streamSubdomain}/${id}/manifest/video.m3u8`;
          }
          if (!finalVideoUrl) {
            throw new Error('Failed to get video playback URL');
          }

          uploadedMediaUrls = [{ type: 'video', url: finalVideoUrl, name: `comment-${Date.now()}.mp4`, cloudflareId: id }];
          setCommentUploadProgress((prev) => {
            const next = { ...prev };
            delete next[commentId];
            return next;
          });
        } catch (err) {
          if (__DEV__) console.error('Video upload failed:', err);
          Alert.alert('Error', 'Failed to upload video');
          setCommentUploadProgress({});
          return;
        }
      }

      const created = await api.addComment(token, postId, trimmed, actorType, actorId, uploadedMediaUrls);
      const comment = {
        id: created.id,
        author: created.authorName,
        text: created.text,
        time: created.createdAt,
        media: uploadedMediaUrls,
        image: uploadedMediaUrls?.[0]?.url || null,
        ownerId: created.actorId,
      };
      setComments((prev) => [...prev, comment]);
      // Keep feed comment count in sync
      const basePostId =
        post && post.kind === 'share' && post.original ? post.original.id : post?.id;
      if (basePostId) {
        if (updatePostCommentCount) {
          updatePostCommentCount(String(basePostId), 1);
        }
        setPost((prevPost) => {
          if (!prevPost) return prevPost;
          if (prevPost.kind === 'share' && prevPost.original) {
            return {
              ...prevPost,
              original: {
                ...prevPost.original,
                comments: Math.max(0, (prevPost.original.comments || 0) + 1),
              },
            };
          }
          return {
            ...prevPost,
            comments: Math.max(0, (prevPost.comments || 0) + 1),
          };
        });
      }
      setNewComment('');
      setCommentImage(null);
      setCommentVideo(null);
      setCommentUploadProgress({});
    } catch (e) {
      if (__DEV__) console.error('Failed to add comment:', e);
      Alert.alert('Comment failed', 'Could not add your comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              largeText && styles.headerTitleLarge,
              { color: colors.text },
            ]}
          >
            {t('post.title') || 'Post'}
          </Text>
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              largeText && styles.headerTitleLarge,
              { color: colors.text },
            ]}
          >
            {t('post.title') || 'Post'}
          </Text>
        </View>
        <Text
          style={[
            styles.emptyText,
            largeText && styles.emptyTextLarge,
            { color: colors.textSecondary },
          ]}
        >
          {t('post.notFound') || 'Post not found'}
        </Text>
      </View>
    );
  }

  const isShared = post?.kind === 'share';
  const original = isShared ? post.original : post;

  const isOwnPost =
    post &&
    user &&
    post.actor_type === 'user' &&
    String(post.actor_id) === String(user.id);

  const baseId = original.id;
  const isBookmarked = bookmarks?.has ? bookmarks.has(baseId) : false;

  const handleShare = async () => {
    if (!token) {
      Alert.alert('Not signed in', 'You must be logged in to share posts.');
      return;
    }

    const actorType = 'user';
    const actorId = user?.id;
    if (!actorId) {
      Alert.alert('Error', 'Unable to determine your identity for sharing.');
      return;
    }

    try {
      await api.sharePost(token, baseId, actorType, actorId);
      setPost((prevPost) => {
        if (!prevPost) return prevPost;
        if (prevPost.kind === 'share' && prevPost.original) {
          return {
            ...prevPost,
            original: {
              ...prevPost.original,
              shares: (prevPost.original.shares || 0) + 1,
            },
          };
        }
        return {
          ...prevPost,
          shares: (prevPost.shares || 0) + 1,
        };
      });
      if (updatePostShareCount) {
        updatePostShareCount(baseId, 1);
      }
      // Show the shared post in the in-app feed immediately
      sharePost(post, { type: 'user', id: user?.id, name: user?.name, username: user?.username, avatar: user?.avatar });
      refreshFeed && setTimeout(() => refreshFeed(), 1500);
      Alert.alert('Post shared', 'Your share has been recorded.');
    } catch (e) {
      if (__DEV__) console.error('Failed to share post:', e);
      Alert.alert('Share failed', 'Could not share this post.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            largeText && styles.headerTitleLarge,
            { color: colors.text },
          ]}
        >
          {t('post.title') || 'Post'}
        </Text>
        <View style={{ width: 24, alignItems: 'flex-end' }}>
          {!isShared && isOwnPost ? (
            <TouchableOpacity onPress={() => navigation.navigate('CreatePost', { post: original })}>
              <Ionicons color={colors.textSecondary} name="create-outline" size={20} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
        {isShared ? (
          <View style={styles.sharedHeader}>
            <Ionicons color={colors.textSecondary} name="repeat-outline" size={18} />
            <Text
              style={[
                styles.sharedText,
                largeText && styles.sharedTextLarge,
                { color: colors.text },
              ]}
            >
              {`${original.author?.name || 'User'}’s post shared by ${post.sharedBy?.name || 'User'}`}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => {
            navigation.navigate('UserProfile', { user: original.author });
          }}
        >
          <View style={styles.avatar}>
            <AvatarPlaceholder size={48} avatarUrl={original.author?.avatar} />
          </View>
          <View>
            <Text
              style={[
                styles.userName,
                largeText && styles.userNameLarge,
                { color: colors.text },
              ]}
            >
              {original.author.name}
            </Text>
            <Text
              style={[
                styles.username,
                largeText && styles.usernameLarge,
                { color: colors.textSecondary },
              ]}
            >
              @{original.author.username}
            </Text>
          </View>
        </TouchableOpacity>

        <HashtagText
          style={[
            styles.content,
            largeText && styles.contentLarge,
            { color: colors.text },
          ]}
          text={original.content}
          onPressHashtag={(tag) => navigation.navigate('Hashtag', { tag })}
          onPressMention={(username) => navigation.navigate('UserProfile', { username })}
        />

        {Array.isArray(original.media) && original.media.length > 0 && (
          <View onLayout={(event) => setMediaLayout(event.nativeEvent.layout)}>
            <PostMedia
              media={original.media}
              style={styles.mediaContainer}
              imageStyle={styles.mediaImage}
              showVideoControls
              autoPlayVideo={autoPlayVideo}
              allowInlineVideoPlayback={false}
              isVisible={(() => {
                if (!mediaLayout) return true;
                if (!mediaLayout.height || mediaLayout.height <= 0) return true;
                const top = scrollY;
                const bottom = scrollY + viewportHeight;
                const itemTop = mediaLayout.y;
                const itemBottom = mediaLayout.y + mediaLayout.height;
                return itemBottom > top && itemTop < bottom;
              })()}
              isScreenFocused={isFocused}
              onMediaPress={(index, mediaItem) => {
                // Handle individual media item taps
                const videoUrl = mediaItem.url || mediaItem.uri;
                const mediaType = mediaItem.type || (videoUrl?.includes('.mp4') ? 'video' : 'image');
                const postIdForNav = postId || original?.id;

                if (!postIdForNav) {
                  if (__DEV__) console.error('Cannot navigate to Reels: post ID is undefined', { postId, originalId: original?.id });
                  return;
                }

                // Regular video player only
                if (mediaType === 'video') {
                  // Tap regular video → show full-screen video modal
                  setSelectedVideoUrl(videoUrl);
                  setShowVideoModal(true);
                } else if (mediaType === 'image') {
                  // Tap image → show full-screen modal with scrollable images
                  // Find the index among images only (filter out videos)
                  const imageOnlyIndex = original.media
                    .filter((m) => {
                      const mType = m.type || (m.uri?.includes('.mp4') ? 'video' : 'image');
                      return mType === 'image';
                    })
                    .findIndex((m) => m === mediaItem);

                  if (imageOnlyIndex >= 0) {
                    setSelectedImageIndex(imageOnlyIndex);
                    setShowImageModal(true);
                    // Scroll to the selected image
                    setTimeout(() => {
                      imageScrollRef.current?.scrollTo({
                        x: imageOnlyIndex * Dimensions.get('window').width,
                        animated: false,
                      });
                    }, 100);
                  }
                }
              }}
            />
          </View>
        )}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => {
              if (!token) {
                Alert.alert('Not signed in', 'You must be logged in to like posts.');
                return;
              }

              const actorType = 'user';
              const actorId = user?.id;
              if (!actorId) {
                Alert.alert('Error', 'Unable to determine your identity for likes.');
                return;
              }

              try {
                const nextLiked = !liked;
                setLiked(nextLiked);
                if (updatePostLikeState) {
                  updatePostLikeState(baseId, nextLiked);
                }

                // Update local post like count immediately for better UX
                setPost((prevPost) => {
                  if (!prevPost) return prevPost;
                  const updatedPost = { ...prevPost };
                  if (updatedPost.kind === 'share' && updatedPost.original) {
                    updatedPost.original = {
                      ...updatedPost.original,
                      likes: Math.max(0, (updatedPost.original.likes || 0) + (nextLiked ? 1 : -1)),
                      is_liked: nextLiked,
                    };
                  } else {
                    updatedPost.likes = Math.max(0, (updatedPost.likes || 0) + (nextLiked ? 1 : -1));
                    updatedPost.is_liked = nextLiked;
                  }
                  return updatedPost;
                });

                await api.togglePostLike(token, baseId, nextLiked, actorType, actorId);
              } catch (e) {
                if (__DEV__) console.error('Failed to toggle like:', e);
                // Revert on error
                setLiked(!liked);
              }
            }}
          >
            <Ionicons
              color={liked ? colors.primary : colors.textSecondary}
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
            />
            <Text
              style={[
                styles.actionText,
                largeText && styles.actionTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              {original.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons color={colors.textSecondary} name="chatbubble-outline" size={20} />
            <Text
              style={[
                styles.actionText,
                largeText && styles.actionTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              {original.comments}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons color={colors.textSecondary} name="share-outline" size={20} />
            <Text
              style={[
                styles.actionText,
                largeText && styles.actionTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              {original.shares}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleBookmark(baseId)}>
            <Ionicons
              color={isBookmarked ? colors.primary : colors.textSecondary}
              name="bookmark-outline"
              size={20}
            />
            <Text
              style={[
                styles.actionText,
                largeText && styles.actionTextLarge,
                { color: colors.textSecondary },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.commentsSection}>
          <Text
            style={[
              styles.commentsTitle,
              largeText && styles.commentsTitleLarge,
              { color: colors.text },
            ]}
          >
            Comments ({comments.length})
          </Text>
          {comments.map((c) => {
            const canDelete =
              user &&
              c.ownerId &&
              String(user.id) === String(c.ownerId);

            const handleDelete = () => {
              if (!token) {
                Alert.alert('Not signed in', 'You must be logged in to delete comments.');
                return;
              }
              Alert.alert(
                'Delete comment',
                'Are you sure you want to delete this comment?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setDeletingCommentId(c.id);
                        await api.deleteComment(token, c.id);
                        setComments((prev) => prev.filter((cm) => cm.id !== c.id));
                        const basePostId =
                          post && post.kind === 'share' && post.original
                            ? post.original.id
                            : post?.id;
                        if (basePostId) {
                          if (updatePostCommentCount) {
                            updatePostCommentCount(String(basePostId), -1);
                          }
                          setPost((prevPost) => {
                            if (!prevPost) return prevPost;
                            if (prevPost.kind === 'share' && prevPost.original) {
                              return {
                                ...prevPost,
                                original: {
                                  ...prevPost.original,
                                  comments: Math.max(0, (prevPost.original.comments || 0) - 1),
                                },
                              };
                            }
                            return {
                              ...prevPost,
                              comments: Math.max(0, (prevPost.comments || 0) - 1),
                            };
                          });
                        }
                        setDeletingCommentId(null);
                      } catch (e) {
                        if (__DEV__) console.error('Failed to delete comment:', e);
                        Alert.alert('Error', 'Could not delete comment.');
                        setDeletingCommentId(null);
                      }
                    },
                  },
                ],
              );
            };

            return (
              <View key={c.id} style={styles.commentRow}>
                <View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.commentAvatarText}>{(c.author || 'U')[0]}</Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text
                      style={[
                        styles.commentAuthor,
                        largeText && styles.commentAuthorLarge,
                        { color: colors.text },
                      ]}
                    >
                      {c.author}
                    </Text>
                    <View style={styles.commentHeaderRight}>
                      <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{c.time}</Text>
                      {canDelete ? (
                        <TouchableOpacity
                          style={styles.commentDeleteButton}
                          onPress={handleDelete}
                        >
                          <Ionicons color="#E91E63" name="trash-outline" size={16} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <HashtagText
                    style={[
                      styles.commentText,
                      largeText && styles.commentTextLarge,
                      { color: colors.text },
                    ]}
                    text={c.text}
                    onPressHashtag={(tag) => navigation.navigate('Hashtag', { tag })}
                    onPressMention={(username) => navigation.navigate('UserProfile', { username })}
                  />
                  {Array.isArray(c.media) && c.media.length > 0 ? (
                    <View style={styles.commentMediaContainer}>
                      {c.media.map((m, idx) => {
                        const mediaType = m.type || (m.url?.includes('.mp4') ? 'video' : 'image');
                        const isDeleting = deletingCommentId === c.id;

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setViewingCommentMedia({ type: mediaType, url: m.url })}
                            style={styles.commentMediaWrapper}
                          >
                            {mediaType === 'video' ? (
                              <>
                                <Video
                                  source={{ uri: m.url || m.uri }}
                                  style={styles.commentVideo}
                                  resizeMode="cover"
                                  shouldPlay={false}
                                />
                                <View style={styles.commentVideoPlayOverlay}>
                                  <Ionicons name="play-circle" size={40} color="rgba(255, 255, 255, 0.8)" />
                                </View>
                              </>
                            ) : (
                              <Image
                                source={{ uri: m.url || m.uri }}
                                style={styles.commentImage}
                                resizeMode="cover"
                              />
                            )}
                            {isDeleting && (
                              <View style={styles.commentDeleteOverlay}>
                                <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : c.image ? (
                    <TouchableOpacity
                      onPress={() => setViewingCommentMedia({ type: 'image', url: c.image })}
                      style={styles.commentMediaWrapper}
                    >
                      <Image source={{ uri: c.image }} style={styles.commentImage} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
          <View style={styles.addCommentRow}>
            <TouchableOpacity
              style={styles.addCommentMediaButton}
              onPress={handlePickCommentImage}
            >
              <Ionicons color={colors.primary} name="image-outline" size={20} />
            </TouchableOpacity>
            <TextInput
              multiline
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              scrollEnabled={false}
              style={[
                styles.addCommentInput,
                largeText && styles.addCommentInputLarge,
                { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
              ]}
              value={newComment}
              onChangeText={setNewComment}
              onContentSizeChange={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollToEnd({ animated: true });
                }
              }}
              onFocus={() => {
                // When focusing into the input in a long thread, jump to the bottom
                // so the composer stays visible above the keyboard.
                setTimeout(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollToEnd({ animated: true });
                  }
                }, 50);
              }}
            />
            <TouchableOpacity
              style={[styles.addCommentButton, { backgroundColor: colors.primary, opacity: submittingComment ? 0.5 : 1 }]}
              onPress={handleAddComment}
              disabled={submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color={colors.onPrimary || '#fff'} />
              ) : (
                <Ionicons color={colors.onPrimary || '#fff'} name="send" size={18} />
              )}
            </TouchableOpacity>
          </View>
          {commentImage || commentVideo ? (
            <View style={styles.commentImagePreview}>
              {commentVideo ? (
                <>
                  <Video
                    source={{ uri: commentVideo }}
                    style={styles.commentImagePreviewImage}
                    resizeMode="cover"
                    shouldPlay={false}
                  />
                  <View style={styles.commentVideoPlayOverlay}>
                    <Ionicons name="play-circle" size={40} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  {Object.keys(commentUploadProgress).length > 0 && Object.values(commentUploadProgress).some(p => p < 100) && (
                    <View style={[styles.commentUploadProgressOverlay]}>
                      <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                      <Text style={styles.commentUploadProgressText}>
                        {Math.round(Object.values(commentUploadProgress)[0] || 0)}%
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Image source={{ uri: commentImage }} style={styles.commentImagePreviewImage} />
              )}
              <TouchableOpacity
                style={styles.commentImageRemove}
                onPress={() => {
                  setCommentImage(null);
                  setCommentVideo(null);
                }}
              >
                <Ionicons color={colors.primary} name="close-circle" size={20} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() =>
            navigation.navigate('Report', {
              entityType: 'post',
              entityId: baseId,
              summary: original.content,
            })
          }
        >
          <Ionicons color={colors.primary} name="flag-outline" size={18} />
          <Text style={[styles.reportButtonText, { color: colors.primary }]}>
            {t('report.titlePost') || 'Report post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fullscreen Image Modal - Images only, scrollable */}
      {post && (
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          {(() => {
            const images = (original.media || []).filter((m) => {
              const mType = m.type || (m.uri?.includes('.mp4') ? 'video' : 'image');
              return mType === 'image';
            });

            return (
              <View style={styles.modalOverlay}>
                <ScrollView
                  ref={imageScrollRef}
                  horizontal
                  pagingEnabled
                  scrollEventThrottle={16}
                  onScroll={(event) => {
                    const contentOffsetX = event.nativeEvent.contentOffset.x;
                    const screenWidth = Dimensions.get('window').width;
                    const index = Math.round(contentOffsetX / screenWidth);
                    setSelectedImageIndex(index);
                  }}
                  style={styles.modalImageScroll}
                >
                  {images.map((item, index) => {
                    const imageUrl = item.url || item.uri;
                    return (
                      <View
                        key={index}
                        style={{
                          width: Dimensions.get('window').width,
                          height: Dimensions.get('window').height,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {imageUrl && (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.modalImage}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Image counter */}
                {images.length > 1 && (
                  <View style={styles.modalImageCounter}>
                    <Text style={styles.modalImageCounterText}>
                      {selectedImageIndex + 1} / {images.length}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowImageModal(false)}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            );
          })()}
        </Modal>
      )}

      {/* Comment Media Viewer Modal */}
      <Modal
        visible={viewingCommentMedia !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingCommentMedia(null)}
      >
        <View style={styles.modalOverlay}>
          {viewingCommentMedia?.type === 'video' ? (
            <Video
              source={{ uri: viewingCommentMedia.url }}
              style={styles.modalVideo}
              resizeMode="contain"
              controls
              shouldPlay
            />
          ) : (
            <Image
              source={{ uri: viewingCommentMedia?.url }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setViewingCommentMedia(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
      {/* Fullscreen Video Modal */}
      <Modal
        visible={showVideoModal}
        animationType="fade"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <FullscreenVideoModal
          url={selectedVideoUrl}
          onClose={() => setShowVideoModal(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
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
  contentContainer: {
    padding: 15,
  },
  sharedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  shareButton: {
    backgroundColor: 'transparent',
  },
  sharedTextLarge: {
    fontSize: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  avatarTextLarge: {
    fontSize: 22,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',

  },
  userNameLarge: {
    fontSize: 20,
  },
  username: {
    fontSize: 14,

  },
  usernameLarge: {
    fontSize: 16,
  },
  content: {
    fontSize: 15,

    marginBottom: 10,
  },
  contentLarge: {
    fontSize: 17,
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    marginBottom: 12,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
  },
  mediaImage: {
    height: 300,
  },
  mediaItem: {
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',

    marginBottom: 8,
  },
  commentsTitleLarge: {
    fontSize: 18,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',

  },
  commentAuthorLarge: {
    fontSize: 16,
  },
  commentTime: {
    fontSize: 11,

  },
  commentDeleteButton: {
    paddingLeft: 4,
    paddingVertical: 2,
  },
  commentText: {
    fontSize: 14,

  },
  commentTextLarge: {
    fontSize: 15,
  },
  commentMediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  commentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 4,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addCommentMediaButton: {
    marginRight: 8,
  },
  addCommentInput: {
    flex: 1,
    borderWidth: 1,

    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,

    marginRight: 8,
    textAlignVertical: 'top',
  },
  addCommentInputLarge: {
    fontSize: 16,
  },
  addCommentButton: {
    marginLeft: 8,
    width: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    marginTop: 16,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  reportButtonText: {
    marginLeft: 6,

    fontSize: 14,
  },
  commentImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentImagePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  commentImageRemove: {
    padding: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  actionTextLarge: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptyTextLarge: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageScroll: {
    flex: 1,
  },
  modalImage: {
    flex: 1,
    width: '100%',
  },
  modalImageCounter: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modalImageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    padding: 8,
  },
  modalVideo: {
    flex: 1,
    width: '100%',
  },
  commentMediaWrapper: {
    position: 'relative',
    marginRight: 4,
  },
  commentVideo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 4,
  },
  commentVideoPlayOverlay: {
    position: 'absolute',
    top: 4,
    left: 0,
    height: 100,
    width: 100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  commentDeleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 100,
    width: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentUploadProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 60,
    width: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  commentUploadProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Video Modal Styles
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoModalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  videoModalVideoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  videoModalVideo: {
    width: '100%',
    height: '100%',
  },
  videoModalSkipControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: Dimensions.get('window').height * 0.25,
  },
  videoModalSkipButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
  },
  videoModalSkipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
});

export default PostDetailScreen;
