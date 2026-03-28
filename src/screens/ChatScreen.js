import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppData } from '../contexts/AppDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api, { getCloudflareImageUrl } from '../services/api';
import { validateFileSize, getMediaType } from '../services/mediaUploadService';

// Helper: Get file size in bytes
const getFileSize = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    return fileInfo.size || 0;
  } catch (err) {
    if (__DEV__) console.error('Error getting file size:', err);
    return 0;
  }
};

// Helper: Get MIME type for upload
const getMimeType = (mediaType, filename) => {
  if (mediaType === 'video') {
    return 'video/mp4';
  }

  // Determine image MIME type from filename extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
    case 'png':

      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
    }
  }

  return 'image/jpeg'; // default fallback
};

// Media Viewer Modal Component
const MediaViewerModal = React.memo(({
  visible,
  media,
  onClose,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const videoRef = React.useRef(null);
  const isVideo = media && (media.type === 'video' || (media.url || media.uri || '').includes('.mp4'));

  // Ensure video plays when modal opens
  React.useEffect(() => {
    if (visible && isVideo && videoRef.current) {
      videoRef.current.playAsync?.();
    }
  }, [visible, isVideo]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.mediaViewerOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
        {isVideo ? (
          <View style={{ width: screenWidth, height: screenHeight }}>
            <Video
              ref={videoRef}
              source={{ uri: media?.url || media?.uri }}
              style={{ width: '100%', height: '100%' }}
              useNativeControls
              isLooping
              shouldPlay
              resizeMode="contain"
              progressUpdateIntervalMillis={500}
              onError={(error) => {
                if (__DEV__) console.error('Video playback error:', error);
              }}
            />
          </View>
        ) : (
          <Image
            source={{ uri: media?.url || media?.uri }}
            style={{ width: screenWidth, height: screenHeight, resizeMode: 'contain' }}
          />
        )}
        <TouchableOpacity
          style={styles.mediaViewerClose}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const MessageItem = React.memo(({
  item,
  isMe,
  avatarInitial,
  bubbleColors,
  textColors,
  largeText,
  onDeleteMessage,
  onMediaPress,
  deletingMessageId,
  _uploadProgress,
}) => {
  const isDeleting = deletingMessageId === item.id;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[
        styles.messageRow,
        isMe ? styles.messageRowMe : styles.messageRowThem,
      ]}
      onLongPress={() => onDeleteMessage(item.id, isMe)}
      delayLongPress={300}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {!isMe ? (
        <View style={[styles.avatarSmall, { backgroundColor: bubbleColors.primary }]}>
          <Text style={styles.avatarTextSmall}>{avatarInitial}</Text>
        </View>
      ) : null}
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
            isMe
              ? { backgroundColor: bubbleColors.primary, borderBottomRightRadius: 2 }
              : { backgroundColor: bubbleColors.surfaceAlt || bubbleColors.card || '#2a2f3a', borderBottomLeftRadius: 2 },
          ]}
        >
          {item.text ? (
            <Text
              style={[
                styles.bubbleText,
                largeText && styles.bubbleTextLarge,
                {
                  color: isMe ? (textColors.onPrimary || '#fff') : '#fff',
                  textAlign: isMe ? 'right' : 'left',
                },
              ]}
            >
              {item.text}
            </Text>
          ) : null}

          {Array.isArray(item.media) && item.media.length > 0 ? (
            <View
              style={[
                styles.bubbleMediaRow,
                isMe ? styles.bubbleMediaRowMe : styles.bubbleMediaRowThem,
              ]}
            >
              {item.media
                .filter((m) => m && (m.type === 'image' || m.type === 'video'))
                .map((m, idx) => {
                  const isVideo = m.type === 'video';
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.bubbleMediaWrapper}
                      onPress={() => onMediaPress(m)}
                      activeOpacity={0.7}
                    >
                      {isVideo ? (
                        <View style={styles.bubbleVideoContainer}>
                          <Image
                            source={{ uri: m.url || m.uri }}
                            style={styles.bubbleMedia}
                            resizeMode="cover"
                          />
                          <View style={styles.videoPlayIcon}>
                            <Ionicons name="play" size={28} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: m.url || m.uri }}
                          style={styles.bubbleMedia}
                          resizeMode="cover"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          ) : null}

          {isDeleting && (
            <View style={styles.deletingOverlay}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  if (prev.isMe !== next.isMe) return false;
  if (prev.largeText !== next.largeText) return false;
  if (prev.item?.id !== next.item?.id) return false;
  if (prev.item?.text !== next.item?.text) return false;
  if ((prev.item?.media?.length || 0) !== (next.item?.media?.length || 0)) return false;
  if (prev.avatarInitial !== next.avatarInitial) return false;
  if (prev.bubbleColors !== next.bubbleColors) return false;
  if (prev.textColors !== next.textColors) return false;
  if (prev.deletingMessageId !== next.deletingMessageId) return false;
  return true;
});

const ChatScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { setConversations, latestMessageAction } = useAppData();
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const largeText = settings.textSizeLarge;
  const { reduceMotion: _reduceMotion } = settings;
  const { conversation } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [_loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]); // { uri, name, type, size, progress }
  const [uploadProgress, setUploadProgress] = useState({}); // { index: percentage }
  const [selectedMediaForViewer, setSelectedMediaForViewer] = useState(null);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);

  const bubbleColors = useMemo(() => ({
    primary: colors.primary,
    surfaceAlt: colors.surfaceAlt,
    card: colors.card,
  }), [colors.primary, colors.surfaceAlt, colors.card]);

  const textColors = useMemo(() => ({
    text: colors.text,
    onPrimary: colors.onPrimary,
  }), [colors.text, colors.onPrimary]);

  const normalizeIsSenderSelf = (value) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return null;
  };

  // Real-time updates handled via notifications stream (no chat WebSocket)

  useEffect(() => {
    if (!conversation || !token) return;

    let cancelled = false;
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const apiMessages = await api.getConversationMessages(token, conversation.id);
        if (cancelled) return;
        setMessages((prev) => {
          const prevMap = new Map(prev.map((p) => [String(p.id), p]));
          const sorted = [...apiMessages].sort((a, b) => {
            const aTime = typeof a.time === 'number' ? a.time * 1000 : new Date(a.time || 0).getTime();
            const bTime = typeof b.time === 'number' ? b.time * 1000 : new Date(b.time || 0).getTime();
            return (aTime || 0) - (bTime || 0);
          });

          const processedMessages = sorted.map((m) => {
            const createdAtMs = typeof m.time === 'number' ? m.time * 1000 : new Date(m.time || 0).getTime();
            const hasSnakeSenderSelf = typeof m.is_sender_self === 'boolean';
            const resolvedIsSenderSelf = typeof m.isSenderSelf === 'boolean'
              ? m.isSenderSelf
              : (hasSnakeSenderSelf ? m.is_sender_self : normalizeIsSenderSelf(m.is_sender_self));
            const hasSenderSelf = typeof resolvedIsSenderSelf === 'boolean';

            if (hasSenderSelf) {
              return {
                id: m.id,
                from: resolvedIsSenderSelf ? 'me' : 'them',
                text: m.text,
                time: m.time || 'now',
                media: m.mediaUrls || m.media_urls || m.media || [],
                isSenderSelf: resolvedIsSenderSelf,
                senderName: m.senderName,
                senderUsername: m.senderUsername,
                senderAvatar: m.senderAvatar,
                createdAtMs,
              };
            }
            const hasUser = Boolean(user?.id);
            const rawSenderId = m.fromUserId ?? m.from_user_id ?? m.senderId ?? m.sender_id;
            const rawSenderType = m.senderType ?? m.sender_type;
            const hasSender = Boolean(rawSenderId);
            const isMeUser = hasUser && (m.senderType === 'user' || !m.senderType) && String(m.fromUserId) === String(user.id);
            const isIdMatch = hasUser && String(rawSenderId) === String(user.id);
            const canDetermine = hasUser && hasSender;
            const isSentByMe = canDetermine
              ? (isMeUser || (isIdMatch && rawSenderType !== 'page'))
              : null;

            const prevMsg = prevMap.get(String(m.id));
            const resolvedFrom = isSentByMe === null
              ? (prevMsg?.from || 'them')
              : (isSentByMe ? 'me' : 'them');

            return {
              id: m.id,
              from: resolvedFrom,
              text: m.text,
              time: m.time || 'now',
              media: m.mediaUrls || m.media_urls || m.media || [],
              isSenderSelf: hasSenderSelf ? resolvedIsSenderSelf : null,
              senderId: rawSenderId,
              senderType: rawSenderType,
              senderName: m.senderName,
              senderUsername: m.senderUsername,
              senderAvatar: m.senderAvatar,
              createdAtMs,
            };
          });

          if (__DEV__) console.log('[ChatScreen] Loaded messages from backend. Sample:', processedMessages[0]?.media ? `Media: ${JSON.stringify(processedMessages[0].media)}` : 'No media in first message');

          return processedMessages;
        });
      } catch (e) {
        if (__DEV__) console.error('Failed to load conversation messages:', e);
        registerError('Failed to load messages.');
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [conversation, token, user, registerError]);

  useEffect(() => {
    if (!latestMessageAction || !conversation?.id) return;

    const { action, message, conversationId } = latestMessageAction;
    if (action !== 'sent' || conversationId !== conversation.id || !message) return;

    const resolvedSenderType = message.senderType || message.sender_type || 'user';
    const isSenderSelf = typeof message.isSenderSelf === 'boolean'
      ? message.isSenderSelf
      : normalizeIsSenderSelf(message.is_sender_self);
    const hasSenderSelf = typeof isSenderSelf === 'boolean';

    const isMeUser = Boolean(user) && (resolvedSenderType === 'user' || !resolvedSenderType) && String(message.senderId) === String(user.id);
    const isIdMatch = Boolean(user) && String(message.senderId) === String(user.id);
    const isSentByMe = hasSenderSelf
      ? isSenderSelf
      : (isMeUser || (isIdMatch && resolvedSenderType !== 'page'));

    const createdAtMs = message.time ? new Date(message.time).getTime() : Date.now();
    const formattedMessage = {
      id: message.id,
      from: isSentByMe ? 'me' : 'them',
      text: message.text ?? message.body ?? message.content ?? '',
      time: message.time ? new Date(message.time).toLocaleString() : 'now',
      media: message.media || message.mediaUrls || [],
      isSenderSelf: hasSenderSelf ? isSenderSelf : null,
      senderId: message.senderId,
      senderType: resolvedSenderType,
      createdAtMs,
    };

    setMessages(prevMessages => {
      const exists = prevMessages.some(msg => msg.id === formattedMessage.id);
      if (exists) return prevMessages;
      return [...prevMessages, formattedMessage]
        .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    });
  }, [latestMessageAction, conversation?.id, user]);

  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const resolveIsMe = useCallback((item) => {
    const normalizedSelf = normalizeIsSenderSelf(item?.isSenderSelf);
    if (typeof normalizedSelf === 'boolean') {
      return normalizedSelf;
    }

    const senderId = item.senderId ?? item.fromUserId ?? item.sender_id ?? item.from_user_id;
    const senderType = item.senderType ?? item.sender_type ?? item.senderType;

    const isMeUser = Boolean(user?.id)
      && (senderType === 'user' || !senderType)
      && String(senderId) === String(user.id);
    const isIdMatch = Boolean(user?.id) && String(senderId) === String(user.id);

    if (senderId != null) {
      return isMeUser || (isIdMatch && senderType !== 'page');
    }

    if (item?.from === 'me' || item?.from === 'them') {
      return item.from === 'me';
    }

    return false;
  }, [user?.id]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isSending) {
      return; // Prevent duplicate submission
    }
    if (!token) {
      registerError('You must be logged in to send messages.');
      return;
    }
    if (!isOnline) {
      registerError(t('common.offline') || 'You are offline. Some actions may not work.');
      return;
    }
    setIsSending(true);

    try {
      const actorType = 'user';
      const actorId = user?.id;

      // Upload media attachments concurrently with progress tracking
      const uploadPromises = attachments.map(async (item, attachmentIndex) => {
        try {
          const mediaType = item.type || 'image';

          // Use separate upload endpoints for images vs videos
          const uploadEndpoint = mediaType === 'video'
            ? api.getVideoUploadURL(token)
            : api.getImageUploadURL(token);
          const { uploadURL, id, deliveryUrl, playbackUrl, streamSubdomain } = await uploadEndpoint;

          const formData = new FormData();

          const fileName = item.name || `attachment-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
          formData.append('file', {
            uri: item.uri,
            name: fileName,
            type: getMimeType(mediaType, fileName),
          });

          const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
            onUploadProgress: (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress((prev) => ({
                  ...prev,
                  [attachmentIndex]: percentComplete,
                }));
              }
            },
          });

          if (!uploadResponse.ok) {
            if (__DEV__) console.error('Failed to upload media:', await uploadResponse.text());
            return null;
          }

          const uploadResult = await uploadResponse.json().catch(() => null);

          let finalUrl;
          if (mediaType === 'video') {
            // For videos, use the playback URL which is pre-constructed by backend
            // or construct it ourselves from the Stream subdomain and video ID
            if (playbackUrl) {
              finalUrl = playbackUrl;
            } else if (streamSubdomain && id) {
              // Construct Stream URL using subdomain and video ID
              // Note: streamSubdomain is already a full domain like "customer-xxxx.cloudflarestream.com"
              finalUrl = `https://${streamSubdomain}/${id}/manifest/video.m3u8`;
            } else if (id) {
              // Fallback: construct without subdomain (less reliable)
              finalUrl = `https://customer-${id}.cloudflarestream.com/${id}`;
            }
          } else {
            // For images, use the standard image delivery
            finalUrl =
              uploadResult?.result?.variants?.[0] ||
              uploadResult?.result?.url ||
              deliveryUrl ||
              getCloudflareImageUrl(id);
          }

          return {
            type: mediaType,
            url: finalUrl,
            name: item.name,
            cloudflareId: id,
          };
        } catch (err) {
          if (__DEV__) console.error('Media upload error:', err);
          return null;
        }
      });

      const uploadResults = await Promise.allSettled(uploadPromises);
      const uploadedMedia = uploadResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      const sent = await api.sendMessage(
        token,
        conversation.id,
        trimmed,
        actorType,
        actorId,
        uploadedMedia,
      );

      const createdAtMs = typeof sent.time === 'number'
        ? sent.time * 1000
        : new Date(sent.time || Date.now()).getTime();
      const newMsg = {
        id: sent.id,
        from: 'me',
        text: sent.text,
        time: sent.time || 'now',
        media: sent.media || uploadedMedia || [],
        createdAtMs,
      };
      setMessages((prev) => [...prev, newMsg]
        .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)));
      setText('');
      setIsSending(false);
      setAttachments([]);
      setUploadProgress({});

    } catch (e) {
      if (__DEV__) console.error('Failed to send message:', e);
      registerError('Failed to send message. Please try again.');
      setIsSending(false);
    }
  };

  const handleDeleteConversation = () => {
    Alert.alert('Delete conversation', 'Delete this conversation and all messages?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteConversation(token, conversation.id);
            setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
            navigation.goBack();
          } catch (err) {
            if (__DEV__) console.error('Failed to delete conversation:', err);
            registerError('Failed to delete conversation.');
          }
        },
      },
    ]);
  };

  const handleDeleteMessage = useCallback((id, isMe) => {
    if (!isMe) {
      Alert.alert('Message', 'You can only delete your own messages.');
      return;
    }
    Alert.alert('Delete message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingMessageId(id);
            await api.deleteMessage(token, id);
            setMessages((prev) => prev.filter((m) => m.id !== id));
            setDeletingMessageId(null);
          } catch (err) {
            setDeletingMessageId(null);
            if (__DEV__) console.error('Failed to delete message:', err);
            registerError('Failed to delete message.');
          }
        },
      },
    ]);
  }, [registerError, token]);

  const renderItem = useCallback(({ item }) => {
    const isMe = resolveIsMe(item);
    const avatarInitial = (item.senderName || item.senderUsername || conversation.user?.name || conversation.user?.username || '?')
      .trim()
      .charAt(0)
      .toUpperCase();
    return (
      <MessageItem
        item={item}
        isMe={isMe}
        avatarInitial={avatarInitial}
        bubbleColors={bubbleColors}
        textColors={textColors}
        largeText={largeText}
        onDeleteMessage={handleDeleteMessage}
        onMediaPress={(media) => {
          setSelectedMediaForViewer(media);
          setMediaViewerVisible(true);
        }}
        deletingMessageId={deletingMessageId}
        uploadProgress={uploadProgress}
      />
    );
  }, [
    bubbleColors,
    textColors,
    largeText,
    conversation?.user?.name,
    conversation?.user?.username,
    handleDeleteMessage,
    resolveIsMe,
    deletingMessageId,
    uploadProgress,
  ]);

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <>
      <MediaViewerModal
        visible={mediaViewerVisible}
        media={selectedMediaForViewer}
        onClose={() => {
          setMediaViewerVisible(false);
          setSelectedMediaForViewer(null);
        }}
        colors={colors}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.text} name="arrow-back" size={24} />
          </TouchableOpacity>
          <View>
            <Text
              style={[
                styles.headerTitle,
                largeText && styles.headerTitleLarge,
                { color: colors.text },
              ]}
            >
              {conversation.user?.name || 'User'}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                largeText && styles.headerSubtitleLarge,
                { color: colors.textSecondary },
              ]}
            >
              @{conversation.user?.username || 'user'}
            </Text>
            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: colors.success || '#4CAF50' },
                ]}
              />
              <Text
                style={[
                  styles.connectionText,
                  { color: colors.textSecondary },
                ]}
              >
                Live
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleDeleteConversation}>
              <Ionicons color={colors.textSecondary} name="trash-outline" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={listRef}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          data={messages}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          style={styles.messagesList}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* Pending media attachments (thumbnails with progress) */}
        {attachments.length > 0 ? (
          <View style={[styles.attachmentsRow, { backgroundColor: colors.surface }]}>
            {attachments.map((att, index) => {
              const progress = uploadProgress[index] || 0;
              const isVideo = att.type === 'video';
              return (
                <View key={index} style={styles.attachmentThumb}>
                  <View style={styles.attachmentContent}>
                    {isVideo ? (
                      <Ionicons name="play-circle" size={24} color={colors.primary} />
                    ) : (
                      <Ionicons name="image" size={24} color={colors.primary} />
                    )}
                    <Text style={[styles.attachmentThumbLabel, { color: colors.text }]}>
                      {isVideo ? 'VID' : 'IMG'}
                    </Text>
                  </View>
                  {progress > 0 && progress < 100 && (
                    <View style={[styles.attachmentProgressOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                      <Text style={styles.progressText}>{progress}%</Text>
                      <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.attachmentRemove}
                    onPress={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Ionicons color={colors.onPrimary || '#fff'} name="close" size={14} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        <View
          style={[
            styles.inputRow,
            { paddingBottom: 12 + insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images', 'videos'],
                  allowsMultipleSelection: false,
                  quality: 0.8,
                  videoMaxDuration: 300, // 5 minutes max
                });
                if (result.canceled) return;

                const asset = result.assets?.[0];
                if (!asset) return;

                const assetPromises = [asset].map(async (assetItem) => {
                  try {
                    // Get file size for validation
                    const fileSize = await getFileSize(assetItem.uri);
                    const sizeValidation = validateFileSize(fileSize);

                    if (!sizeValidation.valid) {
                      registerError(sizeValidation.error);
                      return null;
                    }

                    const mediaType = getMediaType(assetItem.uri, assetItem.fileName);
                    return {
                      uri: assetItem.uri,
                      name: assetItem.fileName || `media-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
                      type: mediaType,
                      size: fileSize,
                    };
                  } catch (err) {
                    if (__DEV__) console.error('Error processing media:', err);
                    registerError('Failed to process one or more files.');
                    return null;
                  }
                });

                const results = await Promise.all(assetPromises);
                const validPicks = results.filter((p) => p !== null);
                if (validPicks.length > 0) {
                  setAttachments([validPicks[0]]);
                }
              } catch (err) {
                if (__DEV__) console.error('Media picker error in chat:', err);
                registerError('Failed to select media.');
              }
            }}
          >
            <Ionicons color={colors.textSecondary} name="add-circle-outline" size={24} />
          </TouchableOpacity>
          <TextInput
            multiline
            scrollEnabled
            placeholder={t('messages.typeMessage') || 'Type a message...'}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              largeText && styles.inputLarge,
              { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
            ]}
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: isSending ? 0.5 : 1 }]}
            onPress={sendMessage}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.onPrimary || '#fff'} />
            ) : (
              <Ionicons color={colors.onPrimary || '#fff'} name="send" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
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
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  headerTitleLarge: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    marginLeft: 12,
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  headerSubtitleLarge: {
    fontSize: 15,
  },
  messagesList: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    width: '100%',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
    paddingLeft: 48,
  },
  messageRowThem: {
    justifyContent: 'flex-start',
    paddingRight: 48,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    maxWidth: '80%',
    flexShrink: 1,
  },
  bubbleWrapperMe: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  bubbleWrapperThem: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    flexShrink: 1,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
  },
  bubbleThem: {
    alignSelf: 'flex-start',
  },
  bubbleMediaRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bubbleMediaRowMe: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  bubbleMediaRowThem: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  bubbleMediaWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  bubbleMedia: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  bubbleVideoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPlayIcon: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 14,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaViewerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaViewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  bubbleTextLarge: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  attachBtn: {
    marginRight: 6,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  attachmentThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  attachmentContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  attachmentThumbLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  attachmentProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
    maxHeight: 120,
  },
  inputLarge: {
    fontSize: 17,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default ChatScreen;
