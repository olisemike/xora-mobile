import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppData } from '../contexts/AppDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStories } from '../contexts/StoriesContext';
import api from '../services/api';

export default function CreatePostScreen({ navigation, route }) {
  const { t } = useTranslation();
  const tf = (key, fallback) => {
    const v = t(key);
    return v === key ? (fallback || key) : v;
  };
  const { addPost } = useAppData();
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { token, user, logout } = useAuth();
  const { colors } = useTheme();
  const { refreshStories } = useStories();
  const largeText = settings.textSizeLarge;
  const editingPost = route?.params?.post || null;
  const [content, setContent] = useState(editingPost?.content || '');
  const [media, setMedia] = useState([]); // { uri, type: 'image' | 'video', name }
  const [isSensitive, setIsSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState('POST'); // 'POST' or 'STORY'
  const [deletingMediaIndex, setDeletingMediaIndex] = useState(null);

  // Helper to map our own mediaType flag to expo-image-picker options
  // Note: MediaTypeOptions enum is deprecated in SDK 50+, use string literals
  const resolvePickerMediaType = (kind) => {
    if (kind === 'image') return 'images';
    if (kind === 'video') return 'videos';
    return 'images'; // Default to images (safer than 'all' which may not exist)
  };

  const pickFromLibrary = async (kind = 'all') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow access to your media to attach it to a post.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: resolvePickerMediaType(kind),
      allowsMultipleSelection: postType !== 'STORY',
      quality: 0.8,
    });

    if (!result.canceled) {
      const assets = result.assets || [];
      const mapped = assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        name:
          asset.fileName ||
          asset.filename ||
          (asset.uri ? asset.uri.split('/').pop() : '') ||
          (asset.type === 'video' ? 'Video' : 'Image'),
      }));
      if (postType === 'STORY') {
        const first = mapped[0] ? [mapped[0]] : [];
        if (mapped.length > 1) {
          Alert.alert('Story media limit', 'Stories can only include one photo or video.');
        }
        setMedia(first);
      } else {
        // For posts, append new media to existing selections
        setMedia((prev) => [...prev, ...mapped]);
      }
    }
  };

  const pickFromCamera = async (kind = 'all') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow camera access to capture media for your post.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: resolvePickerMediaType(kind),
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length) {
      const asset = result.assets[0];
      const item = {
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        name:
          asset.fileName ||
          asset.filename ||
          (asset.uri ? asset.uri.split('/').pop() : '') ||
          (asset.type === 'video' ? 'Captured video' : 'Captured image'),
      };
      if (postType === 'STORY') {
        // For stories, replace with single item
        setMedia([item]);
      } else {
        // For posts, append to existing selections
        setMedia((prev) => [...prev, item]);
      }
    }
  };

  const handlePickMedia = () => {
    Alert.alert('Attach media', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => {
          Alert.alert('Camera', 'Capture as', [
            { text: 'Photo', onPress: () => pickFromCamera('image') },
            { text: 'Video', onPress: () => pickFromCamera('video') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          Alert.alert('Gallery', 'Pick from', [
            { text: 'Photos', onPress: () => pickFromLibrary('image') },
            { text: 'Videos', onPress: () => pickFromLibrary('video') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();

    // Story validation: must have media, content is optional (for description)
    if (postType === 'STORY') {
      if (media.length === 0) {
        Alert.alert('Media Required', 'Stories require at least one image or video');
        return;
      }
      // Content is allowed but limited for stories (caption/description)
      if (trimmed.length > 200) {
        Alert.alert('Description Too Long', 'Story descriptions must be under 200 characters');
        return;
      }
    } else {
      // Post validation: must have content or media
      if (!trimmed && media.length === 0) {
        return;
      }
      if (trimmed.length > 5000) {
        Alert.alert('Post too long', 'Posts must be under 5000 characters');
        return;
      }
    }

    if (!isOnline) {
      registerError(
        t('common.offline') || 'You are offline. Please reconnect to publish this post.',
      );
      return;
    }

    setSubmitting(true);
    try {
      // If editing an existing post, call backend update instead of creating new
      if (editingPost && token) {
        try {
          await api.updatePost(token, editingPost.id, {
            content: trimmed,
            isSensitive,
          });
          navigation.goBack();
          return;
        } catch (err) {
          if (__DEV__) console.error('Failed to update post:', err);
          Alert.alert('Post failed', 'Could not update your post. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const mediaForSubmit = postType === 'STORY' ? media.slice(0, 1) : media;
      await addPost(
        trimmed,
        mediaForSubmit,
        {
          id: user?.id,
          name: user?.name,
          username: user?.username,
          avatar: user?.avatar,
          type: 'user',
        },
        { sensitive: isSensitive, postType },
      );

      // Refresh stories if this was a story
      if (postType === 'STORY') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for backend to process
        await refreshStories();
      }

      navigation.goBack();
    } catch (e) {
      if (__DEV__) console.error('Failed to publish post:', e);

      // Handle authentication errors
      if (e.message && (e.message.includes('Invalid or expired token') || e.message.includes('401') || e.message.includes('Unauthorized'))) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [
            {
              text: 'Sign In',
              onPress: async () => {
                // Clear auth state completely before navigating to login
                await logout();
                navigation.replace('Login');
              },
            },
          ],
        );
      } else {
        Alert.alert('Post failed', 'Could not publish your post. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="close" size={24} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            largeText && styles.headerTitleLarge,
            { color: colors.text },
          ]}
        >
          {editingPost
            ? 'Edit Post'
            : postType === 'STORY'
              ? 'Create Story'
              : tf('post.createPost', 'Create Post')}
        </Text>
        <TouchableOpacity disabled={submitting} onPress={handleSubmit}>
          <Text
            style={[
              styles.postButton,
              largeText && styles.postButtonLarge,
              { color: colors.primary },
              submitting && { opacity: 0.6 },
            ]}
          >
            {submitting
              ? tf('common.loading', 'Loading...')
              : editingPost
                ? 'Update'
                : tf('post.publish', 'Post')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Type Toggle */}
        <View
          style={[
            styles.postTypeToggle,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: colors.surface },
              postType === 'POST' && [styles.toggleButtonActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setPostType('POST')}
          >
            <Ionicons
              color={postType === 'POST' ? colors.onPrimary : colors.textSecondary}
              name="newspaper-outline"
              size={18}
            />
            <Text
              style={[
                styles.toggleText,
                postType === 'POST' && styles.toggleTextActive,
                largeText && styles.toggleTextLarge,
                { color: postType === 'POST' ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              Post
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: colors.surface },
              postType === 'STORY' && [styles.toggleButtonActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setPostType('STORY')}
          >
            <Ionicons
              color={postType === 'STORY' ? colors.onPrimary : colors.textSecondary}
              name="time-outline"
              size={18}
            />
            <Text
              style={[
                styles.toggleText,
                postType === 'STORY' && styles.toggleTextActive,
                largeText && styles.toggleTextLarge,
                { color: postType === 'STORY' ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              Story
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          multiline
          maxLength={postType === 'STORY' ? 200 : 5000}
          placeholder={
            postType === 'STORY'
              ? 'Add a description (optional, max 200 chars)'
              : tf('home.whatsOnMind', "What's on your mind?")
          }
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            largeText && styles.inputLarge,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={content}
          onChangeText={setContent}
        />

        {postType === 'STORY' ? (
          <Text style={[styles.storyHint, { color: colors.textSecondary }]}>
            {content.length}/200 characters
            {media.length === 0 ? ' • Stories require at least one image or video' : null}
          </Text>
        ) : null}

        <View
          style={[
            styles.inlineToolbar,
            { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
          ]}
        >
          <TouchableOpacity
            style={styles.inlineMediaButton}
            onPress={handlePickMedia}
          >
            <Ionicons color={colors.primary} name="cloud-upload-outline" size={22} />
            <Text
              style={[
                styles.inlineMediaText,
                largeText && styles.inlineMediaTextLarge,
                { color: colors.text },
              ]}
            >
              {tf('post.addMedia', 'Upload media')}
            </Text>
          </TouchableOpacity>
        </View>

        {media.length > 0 ? (
          <View style={styles.mediaPreview}>
            {media.map((item, index) => {
              const isDeleting = deletingMediaIndex === index;
              return (
                <View key={`media-${item.uri || index}`} style={[styles.mediaListRow, isDeleting && styles.mediaListRowDeleting]}>
                  <Ionicons
                    color={colors.primary}
                    name={
                      item.type === 'video'
                        ? 'videocam-outline'
                        : 'image-outline'
                    }
                    size={22}
                    style={styles.mediaListIcon}
                  />
                  <View style={styles.mediaListInfo}>
                    <Text numberOfLines={1} style={[styles.mediaName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.mediaMeta, { color: colors.textSecondary }]}>
                      {item.type === 'video' ? 'Video' : 'Image'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mediaRemove}
                    onPress={async () => {
                      setDeletingMediaIndex(index);
                      await new Promise(resolve => setTimeout(resolve, 300));
                      setMedia((prev) => prev.filter((_, i) => i !== index));
                      setDeletingMediaIndex(null);
                    }}
                    disabled={submitting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons color={colors.primary} name="close-circle" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        <View
          style={[
            styles.sensitiveRow,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Ionicons
            color={colors.primary}
            name="warning-outline"
            size={18}
            style={styles.sensitiveIcon}
          />
          <View style={styles.sensitiveTextContainer}>
            <Text
              style={[
                styles.sensitiveLabel,
                largeText && styles.sensitiveLabelLarge,
                { color: colors.text },
              ]}
            >
              Mark this post as sensitive content
            </Text>
            <Text style={[styles.sensitiveHelp, { color: colors.textSecondary }]}>
              Use for nudity, violence, or other content that should be blurred
              or hidden.
            </Text>
          </View>
          <Switch
            ios_backgroundColor={colors.border}
            thumbColor={
              Platform.OS === 'android'
                ? isSensitive
                  ? '#FFFFFF'
                  : colors.textTertiary || '#888888'
                : undefined
            }
            trackColor={{ false: colors.border, true: colors.primary }}
            value={isSensitive}
            onValueChange={setIsSensitive}
          />
        </View>
      </ScrollView>

      {/* Loading modal while post is being sent to backend */}
      <Modal
        transparent
        visible={submitting}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>
              Publishing your post...
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.textSecondary, marginTop: 8 }]}>
              Please wait while we upload your media
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

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
  },
  headerTitleLarge: {
    fontSize: 20,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  postButtonLarge: {
    fontSize: 18,
  },
  content: {
    padding: 15,
  },
  postTypeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  toggleButtonActive: {
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '600',
  },
  toggleTextLarge: {
    fontSize: 16,
  },
  storyHint: {
    fontSize: 13,
    marginTop: 5,
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  inputLarge: {
    fontSize: 18,
  },
  mediaPreview: {
    marginTop: 12,
  },
  mediaListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  mediaListRowDeleting: {
    opacity: 0.6,
  },
  mediaListIcon: {
    marginRight: 8,
  },
  mediaListInfo: {
    flex: 1,
  },
  mediaName: {
    fontSize: 14,
  },
  mediaMeta: {
    fontSize: 12,
  },
  mediaRemove: {
    padding: 4,
  },
  inlineToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  inlineMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineMediaText: {
    fontSize: 14,
  },
  inlineMediaTextLarge: {
    fontSize: 16,
  },
  sensitiveRow: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensitiveIcon: {
    marginRight: 8,
  },
  sensitiveTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  sensitiveLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sensitiveLabelLarge: {
    fontSize: 16,
  },
  sensitiveHelp: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
