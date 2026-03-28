import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAppData } from '../contexts/AppDataContext';
import api, { WEB_APP_BASE_URL } from '../services/api';

const PostMenu = ({ visible, onClose, post, onDelete, onReport, onEdit }) => {
  const { token, user } = useAuth();
  const { settings } = useSettings();
  const { blocked, toggleBlock } = useAppData();
  const { reduceMotion } = settings;
  const [deletingPost, setDeletingPost] = useState(false);

  // Determine if the current user owns this post
  const isOwnPost = () => {
    if (!post || !user) return false;
    return post.actor_type === 'user' && post.actor_id === user.id;
  };

  const getBasePostId = () => {
    if (!post) return null;
    if (post.kind === 'share' && post.original) {
      return post.original.id;
    }
    return post.id;
  };

  const isAuthorBlocked = Boolean(post) && Boolean(blocked.find(
    (b) => String(b.id) === String(post.actor_id) && b.type === post.actor_type,
  ));

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const basePostId = getBasePostId();
            if (!basePostId) {
              Alert.alert('Error', 'Could not determine post to delete');
              return;
            }
            try {
              setDeletingPost(true);
              await api.deletePost(token, basePostId);
              Alert.alert('Success', 'Post deleted successfully');
              setDeletingPost(false);
              onClose();
              if (onDelete) onDelete(basePostId);
            } catch (error) {
              if (__DEV__) console.error('Failed to delete post:', error);
              Alert.alert('Error', error.message || 'Failed to delete post');
              setDeletingPost(false);
            }
          },
        },
      ],
    );
  };

  const handleReport = () => {
    onClose();

    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment'),
        },
        {
          text: 'Hate Speech',
          onPress: () => submitReport('hate_speech'),
        },
        {
          text: 'Violence',
          onPress: () => submitReport('violence'),
        },
        {
          text: 'False Information',
          onPress: () => submitReport('false_information'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('other'),
        },
      ],
    );
  };

  const submitReport = async (category) => {
    const basePostId = getBasePostId();
    if (!basePostId) {
      Alert.alert('Error', 'Could not determine post to report');
      return;
    }
    try {
      await api.reportPost(token, 'post', basePostId, category, '');
      Alert.alert('Success', 'Report submitted. Our moderation team will review it soon.');
      if (onReport) onReport();
    } catch (error) {
      if (__DEV__) console.error('Failed to report post:', error);
      Alert.alert('Error', error.message || 'Failed to submit report');
    }
  };

  const handleCopyLink = async () => {
    const basePostId = getBasePostId();
    if (!basePostId) {
      Alert.alert('Error', 'Could not determine link to copy');
      return;
    }

    try {
      // Point to the web app post route using a shared base URL
      const link = `${WEB_APP_BASE_URL.replace(/\/$/, '')}/post/${basePostId}`;
      await Clipboard.setStringAsync(link);
      Alert.alert('Link Copied', 'Post link copied to clipboard');
    } catch (e) {
      if (__DEV__) console.error('Failed to copy link', e);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleBlockAuthor = () => {
    if (!post) return;

    const authorName = post?.author?.name || post?.actor_name || 'this user';
    const entity = {
      id: post?.actor_id,
      type: post?.actor_type,
      name: authorName,
      username: post?.author?.username || post?.actor_username,
      avatar: post?.author?.avatar || null,
    };

    Alert.alert(
      isAuthorBlocked ? 'Unblock User' : 'Block User',
      `${isAuthorBlocked ? 'Unblock' : 'Block'} ${authorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAuthorBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await toggleBlock(entity);
              Alert.alert(
                'Success',
                isAuthorBlocked ? 'User unblocked' : 'User blocked successfully',
              );
              onClose();
            } catch (error) {
              if (__DEV__) console.error('Failed to toggle block user:', error);
              Alert.alert('Error', error.message || 'Failed to update block status');
            }
          },
        },
      ],
    );
  };

  const ownPost = isOwnPost();

  return (
    <Modal
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.menu}>
          <View style={styles.header}>
            <Text style={styles.title}>Post Options</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons color="#333" name="close" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            {ownPost ? (
              <>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    if (onEdit) {
                      onClose();
                      onEdit(post);
                    }
                  }}
                  disabled={deletingPost}
                >
                  <Ionicons color="#333" name="create-outline" size={22} />
                  <Text style={styles.optionText}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.option, deletingPost && styles.optionDisabled]}
                  onPress={handleDelete}
                  disabled={deletingPost}
                >
                  {deletingPost ? (
                    <>
                      <ActivityIndicator size="small" color="#E91E63" />
                      <Text style={[styles.optionText, styles.dangerText]}>Deleting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons color="#E91E63" name="trash-outline" size={22} />
                      <Text style={[styles.optionText, styles.dangerText]}>Delete Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {!ownPost ? (
              <>
                <TouchableOpacity style={styles.option} onPress={handleReport}>
                  <Ionicons color="#666" name="flag-outline" size={22} />
                  <Text style={styles.optionText}>Report Post</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={handleBlockAuthor}>
                  <Ionicons color="#666" name="ban-outline" size={22} />
                  <Text style={styles.optionText}>
                    {isAuthorBlocked ? 'Unblock ' : 'Block '}
                    {post?.author?.name || post?.actor_name || 'User'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
              <Ionicons color="#666" name="link-outline" size={22} />
              <Text style={styles.optionText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={onClose}>
              <Ionicons color="#666" name="close-circle-outline" size={22} />
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  options: {
    paddingTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  dangerText: {
    color: '#E91E63',
  },
});

export default PostMenu;
