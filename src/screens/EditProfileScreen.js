import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppData } from '../contexts/AppDataContext';
import { uploadMediaFile } from '../services/mediaUploadService';
import api, { getCloudflareImageUrl } from '../services/api';

const EditProfileScreen = ({ navigation }) => {
  const { profile, updateProfile } = useProfile();
  const { token, user: authUser, setUser } = useAuth();
  const { refreshFeed } = useAppData();
  const { colors } = useTheme();
  const [name, setName] = useState(authUser?.name || profile.name || '');
  const [username, setUsername] = useState(authUser?.username || profile.username || '');
  const [bio, setBio] = useState(authUser?.bio || profile.bio || '');
  const [avatar, setAvatar] = useState(authUser?.avatarUrl || authUser?.avatar_url || profile.avatar || null);
  const [coverImage, setCoverImage] = useState(authUser?.coverUrl || authUser?.cover_url || profile.coverImage || null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const pickFromLibrary = async (kind) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your profile images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets.length) return;
    const { uri } = result.assets[0];
    if (kind === 'avatar') {
      setAvatar(uri);
      setRemoveAvatar(false);
    } else {
      setCoverImage(uri);
      setRemoveCover(false);
    }
  };

  const pickFromCamera = async (kind) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a new photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !result.assets || !result.assets.length) return;
    const { uri } = result.assets[0];
    if (kind === 'avatar') {
      setAvatar(uri);
      setRemoveAvatar(false);
    } else {
      setCoverImage(uri);
      setRemoveCover(false);
    }
  };

  const pickImage = (kind) => {
    Alert.alert('Change photo', 'Choose image source', [
      { text: 'Camera', onPress: () => pickFromCamera(kind) },
      { text: 'Gallery', onPress: () => pickFromLibrary(kind) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Not logged in', 'You must be logged in to update your profile.');
      return;
    }

    const safeName = name.trim() || 'User';
    const safeUsername = (username || safeName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'user';

    const isRemoteUri = (uri) => typeof uri === 'string' && /^https?:\/\//i.test(uri);

    try {
      setSaving(true);

      const updates = {
        name: safeName,
        bio,
      };

      // If user manually cleared avatar and did not pick a new one, clear it on backend
      if (removeAvatar && !avatar) {
        updates.avatarUrl = null;
      }

      // If user manually cleared cover and did not pick a new one, clear it on backend
      if (removeCover && !coverImage) {
        updates.coverUrl = null;
      }

      // Upload avatar image if set and it's a local URI (not already hosted)
      if (!removeAvatar && avatar && !isRemoteUri(avatar)) {
        try {
          setAvatarUploadProgress(0);
          const { uploadURL, id, deliveryUrl } = await api.getImageUploadURL(token);

          const file = {
            uri: avatar,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          };

          const uploadResult = await uploadMediaFile(uploadURL, file, (progress) => {
            setAvatarUploadProgress(progress);
          });

          let finalUrl = uploadResult?.url || deliveryUrl;
          if (!finalUrl && id) {
            // Construct from delivery hash if needed
            finalUrl = getCloudflareImageUrl(id);
          }

          if (finalUrl) {
            updates.avatarUrl = finalUrl;
            if (uploadResult?.cloudflareId) {
              updates.cloudflareAvatarId = uploadResult.cloudflareId;
            } else if (id) {
              updates.cloudflareAvatarId = id;
            }
          } else {
            throw new Error('No image URL returned from upload');
          }
          setAvatarUploadProgress(0);
        } catch (e) {
          if (__DEV__) console.error('[Mobile] Avatar upload error:', e);
          Alert.alert('Upload failed', `Failed to upload avatar: ${e?.message || 'Unknown error'}`);
          setAvatarUploadProgress(0);
          return;
        }
      }

      // Upload cover image if set and it's a local URI (not already hosted)
      if (!removeCover && coverImage && !isRemoteUri(coverImage)) {
        try {
          setCoverUploadProgress(0);
          const { uploadURL, id, deliveryUrl } = await api.getImageUploadURL(token);

          const file = {
            uri: coverImage,
            type: 'image/jpeg',
            name: 'cover.jpg',
          };

          const uploadResult = await uploadMediaFile(uploadURL, file, (progress) => {
            setCoverUploadProgress(progress);
          });

          let finalUrl = uploadResult?.url || deliveryUrl;
          if (!finalUrl && id) {
            // Construct from delivery hash if needed
            finalUrl = getCloudflareImageUrl(id);
          }

          if (finalUrl) {
            updates.coverUrl = finalUrl;
            if (uploadResult?.cloudflareId) {
              updates.cloudflareCoverId = uploadResult.cloudflareId;
            } else if (id) {
              updates.cloudflareCoverId = id;
            }
          } else {
            throw new Error('No image URL returned from upload');
          }
          setCoverUploadProgress(0);
        } catch (e) {
          if (__DEV__) console.error('[Mobile] Cover upload error:', e);
          Alert.alert('Upload failed', `Failed to upload cover: ${e?.message || 'Unknown error'}`);
          setCoverUploadProgress(0);
          return;
        }
      }

      const updatedUser = await api.updateUserProfile(token, updates);

      // Update global auth user so ProfileScreen reflects changes
      if (updatedUser) {
        setUser(updatedUser);
      }

      // Keep local ProfileContext in sync for any components still using it
      // Note: Backend returns camelCase field names (avatarUrl, coverUrl)
      updateProfile({
        name: safeName,
        username: safeUsername,
        bio,
        avatar: updatedUser?.avatarUrl || updatedUser?.avatar_url || null,
        coverImage: updatedUser?.coverUrl || updatedUser?.cover_url || null,
      });

      // Refresh feed to update all user's posts with new avatar
      if (updatedUser?.avatarUrl || updatedUser?.avatar_url) {
        try {
          await refreshFeed();
        } catch (e) {
          if (__DEV__) console.error('Failed to refresh feed after profile update:', e);
        }
      }

      navigation.goBack();
    } catch (err) {
      if (__DEV__) console.error('Failed to update profile:', err);
      Alert.alert('Update failed', `Could not update your profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      setAvatarUploadProgress(0);
      setCoverUploadProgress(0);
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
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          {avatar ? (
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              {avatarUploadProgress > 0 && avatarUploadProgress < 100 && (
                <View style={styles.uploadProgressOverlay}>
                  <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.uploadProgressText}>{Math.round(avatarUploadProgress)}%</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons color={colors.textSecondary} name="person" size={32} />
            </View>
          )}
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: colors.surface }]}
              onPress={() => pickImage('avatar')}
              disabled={saving}
            >
              <Text style={[styles.smallButtonText, { color: colors.primary }]}>Change photo</Text>
            </TouchableOpacity>
            {(avatar || authUser?.avatar_url) ? (
              <TouchableOpacity
                style={[styles.smallButton, styles.smallButtonDanger]}
                onPress={() => {
                  setAvatar(null);
                  setRemoveAvatar(true);
                }}
                disabled={saving}
              >
                <Text style={[styles.smallButtonText, { color: colors.onPrimary }]}>{' '}
                  Remove
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Cover preview */}
        <View style={styles.coverSection}>
          {coverImage ? (
            <View style={styles.coverContainer}>
              <Image source={{ uri: coverImage }} style={styles.coverPreview} />
              {coverUploadProgress > 0 && coverUploadProgress < 100 && (
                <View style={styles.uploadProgressOverlay}>
                  <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.uploadProgressText}>{Math.round(coverUploadProgress)}%</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons color={colors.textSecondary} name="image-outline" size={28} />
            </View>
          )}
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: colors.surface }]}
              onPress={() => pickImage('cover')}
              disabled={saving}
            >
              <Text style={[styles.smallButtonText, { color: colors.primary }]}>Change cover</Text>
            </TouchableOpacity>
            {(coverImage || authUser?.cover_url) ? (
              <TouchableOpacity
                style={[styles.smallButton, styles.smallButtonDanger]}
                onPress={() => {
                  setCoverImage(null);
                  setRemoveCover(true);
                }}
                disabled={saving}
              >
                <Text style={[styles.smallButtonText, { color: colors.onPrimary }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Name</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Username</Text>
        <TextInput
          autoCapitalize="none"
          placeholder="username"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={username}
          onChangeText={setUsername}
        />

        <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
        <TextInput
          multiline
          placeholder="Tell people about yourself"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.bioInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={bio}
          onChangeText={setBio}
        />

        <TouchableOpacity disabled={saving} style={[styles.saveButton, { backgroundColor: colors.surface }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: colors.primary }]}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 100 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverSection: {
    marginBottom: 16,
  },
  coverContainer: {
    position: 'relative',
  },
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  smallButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,

  },
  smallButtonDanger: {
    backgroundColor: '#dc3545',
  },
  smallButtonText: {

    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
  uploadProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
