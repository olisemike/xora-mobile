import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import api from '../services/api';

const FollowingScreen = ({ navigation }) => {
  const { settings } = useSettings();
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;

  const [followedUsers, setFollowedUsers] = useState([]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!user || !token || !user.username) {
        setFollowedUsers([]);
        return;
      }
      try {
        const rows = await api.getUserFollowing(token, user.username);
        setFollowedUsers(rows.filter((r) => r.type === 'user'));
      } catch (e) {
        if (__DEV__) console.error('Failed to load following list:', e);
        setFollowedUsers([]);
      }
    };

    loadFollowing();
  }, [user, token]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>Following</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, largeText && styles.sectionTitleLarge, { color: colors.textSecondary }]}>People you follow</Text>
        {followedUsers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You are not following any accounts yet.</Text>
        ) : (
          followedUsers.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.row, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('UserProfile', { user: u })}
            >
              <View style={styles.avatarWrapper}>
                {u.avatarUrl ? (
                  <Image source={{ uri: u.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <AvatarPlaceholder size={36} />
                )}
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, largeText && styles.rowTitleLarge, { color: colors.text }]}>{u.name}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>@{u.username}</Text>
              </View>
              <Ionicons color={colors.textSecondary} name="chevron-forward" size={18} />
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  sectionTitleLarge: { fontSize: 16 },
  emptyText: { fontSize: 13, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  avatarWrapper: {
    marginRight: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowTitleLarge: { fontSize: 17 },
  rowSubtitle: { fontSize: 13 },
});

export default FollowingScreen;
