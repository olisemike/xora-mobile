import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppData } from '../contexts/AppDataContext';
import { useTheme } from '../contexts/ThemeContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';

const BlockedListScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { blocked, toggleBlock } = useAppData();
  const { colors } = useTheme();

  const renderItem = ({ item }) => (
    <View style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AvatarPlaceholder size={40} avatarUrl={item.avatar_url || item.avatarUrl} />
        </View>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            {item.type === 'page' ? 'Page' : 'Profile'} • @{item.username}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockBtn, { borderColor: colors.primary }]}
        onPress={() => toggleBlock(item)}
      >
        <Text style={[styles.unblockText, { color: colors.primary }]}>{t('blocked.unblock') || 'Unblock'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('blocked.title') || 'Blocked accounts'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {blocked.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons color={colors.textSecondary} name="ban-outline" size={48} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('blocked.empty') || 'You have not blocked anyone yet'}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={blocked}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  avatarText: {
    fontWeight: 'bold',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 13,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default BlockedListScreen;
