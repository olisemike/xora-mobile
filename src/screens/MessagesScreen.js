import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppData } from '../contexts/AppDataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';
import AvatarPlaceholder from '../components/AvatarPlaceholder';

export default function MessagesScreen({ navigation }) {
  const { t } = useTranslation();
  const { conversations } = useAppData();
  const [refreshing, setRefreshing] = React.useState(false);
  const { settings } = useSettings();
  const { isOnline, registerError } = useNetwork();
  const { colors } = useTheme();
  const largeText = settings.textSizeLarge;
  const { reduceMotion } = settings;
  const { muteNotifications } = settings;

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('Chat', { conversation: item })}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <AvatarPlaceholder size={50} avatarUrl={item.user?.avatar_url || item.user?.avatarUrl} />
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, largeText && styles.conversationNameLarge, { color: colors.text }]}>
            {item.user?.name || 'User'}
          </Text>
          <Text style={[styles.timestamp, largeText && styles.timestampLarge, { color: colors.textSecondary }]}>{item.timestamp}</Text>
        </View>
        <Text
          numberOfLines={reduceMotion ? 1 : 2}
          style={[
            styles.lastMessage,
            largeText && styles.lastMessageLarge,
            { color: item.unread ? colors.text : colors.textSecondary },
          ]}
        >
          {item.lastMessage}
        </Text>
      </View>
      {item.unread ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('nav.messages') || 'Messages'}</Text>
          {muteNotifications ? (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {t('settings.muteNotifications') || 'Notifications muted'}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Ionicons color={colors.text} name="create-outline" size={26} />
        </TouchableOpacity>
      </View>
      <FlatList
        contentContainerStyle={styles.listContainer}
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              if (!isOnline) {
                registerError(
                  t('common.offline') || 'You are offline. Some actions may not work.',
                );
                setTimeout(() => setRefreshing(false), 600);
                return;
              }
              // In a future iteration we can trigger a backend refresh here via AppDataContext.
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        )}
        renderItem={renderConversation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',

  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  listContainer: {
    paddingTop: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',

  },
  conversationNameLarge: {
    fontSize: 18,
  },
  timestamp: {
    fontSize: 12,

  },
  timestampLarge: {
    fontSize: 14,
  },
  lastMessage: {
    fontSize: 14,

  },
  lastMessageLarge: {
    fontSize: 16,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
});
