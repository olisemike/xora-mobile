import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { useSettings } from '../contexts/SettingsContext';
import { useAppData } from '../contexts/AppDataContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { settings } = useSettings();
  const { users, followingUsers, toggleFollowUser } = useAppData();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;

  const suggestedUsers = users.filter((u) => !followingUsers.has(u.id)).slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, largeText && styles.headerTitleLarge, { color: colors.text }]}>
          {t('explore.title') || 'Explore'}
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons color={colors.textSecondary} name="search" size={20} style={styles.searchIcon} />
        <TextInput
          placeholder={t('explore.placeholder') || 'Search users, posts, hashtags...'}
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, largeText && styles.searchInputLarge, { color: colors.text }]}
          onFocus={() => navigation.navigate('Search')}
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.emptyText, largeText && styles.emptyTextLarge, { color: colors.textSecondary }]}>
          {t('explore.suggestions') || 'Suggested accounts to follow'}
        </Text>

        {/* Suggested users */}
        {suggestedUsers.map((u) => (
          <View key={u.id} style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.cardRow}
              onPress={() => navigation.navigate('UserProfile', { user: u })}
            >
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarInitial, { color: colors.onPrimary || '#fff' }]}>{u.name?.[0] || u.username?.[0] || 'U'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, largeText && styles.cardTitleLarge, { color: colors.text }]}>{u.name}</Text>
                <Text style={[styles.cardSubtitle, largeText && styles.cardSubtitleLarge, { color: colors.textSecondary }]}>@{u.username}</Text>
                {u.bio ? (
                  <Text style={[styles.cardBio, largeText && styles.cardBioLarge, { color: colors.textSecondary }]}>
                    {u.bio}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  { borderColor: colors.primary },
                  followingUsers.has(u.id) && [styles.followButtonActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => toggleFollowUser(u.id)}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    { color: colors.primary },
                    followingUsers.has(u.id) && [styles.followButtonTextActive, { color: colors.onPrimary || '#fff' }],
                  ]}
                >
                  {followingUsers.has(u.id)
                    ? 'Unfollow'
                    : 'Follow'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleLarge: {
    fontSize: 26,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchInputLarge: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyTextLarge: {
    fontSize: 18,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardTitleLarge: {
    fontSize: 17,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  cardSubtitleLarge: {
    fontSize: 15,
  },
  cardBio: {
    fontSize: 13,
    marginTop: 4,
  },
  cardBioLarge: {
    fontSize: 15,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  followButtonActive: {

  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  followButtonTextActive: {

  },
});
