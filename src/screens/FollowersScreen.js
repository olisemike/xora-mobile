import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';
import api from '../services/api';

const FollowersScreen = () => {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [error, setError] = useState(null);

  const loadFollowers = useCallback(async () => {
    if (!user || !token) return;
    setError(null);
    try {
      const result = await api.getUserFollowers(token, user.username);
      // Normalized backend shape should already be an array of users
      setFollowers(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      if (__DEV__) console.error('Failed to load followers', err);
      setError(err.message || 'Failed to load followers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFollowers();
  }, [loadFollowers]);

  const renderFollower = ({ item }) => {
    const follower = item.user || item;
    if (!follower) return null;

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.surface }]}
        onPress={() => {
          // Navigate to the follower's profile, not our own
          navigation.navigate('UserProfile', { user: follower });
        }}
      >
        <View style={styles.avatarWrapper}>
          {follower.avatarUrl ? (
            <Image source={{ uri: follower.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <AvatarPlaceholder size={40} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {follower.name || follower.username}
          </Text>
          <Text numberOfLines={1} style={[styles.username, { color: colors.textSecondary }]}>
            @{follower.username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user || !token) {
    return (
      <View style={styles.center}>
        <Text style={[styles.message, { color: '#777' }]}>You need to be logged in to see your followers.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>Followers</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error || 'red' }]}>{error}</Text>
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>You don’t have any followers yet.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={followers}
          keyExtractor={(item, index) => String(item.id || item.user?.id || index)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderFollower}
        />
      )}
    </View>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerTitleLarge: { fontSize: 22 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  avatarWrapper: {
    marginRight: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});

export default FollowersScreen;
