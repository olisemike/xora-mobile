import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../contexts/ThemeContext';

const TABS = [
  { key: 'Home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { key: 'Explore', icon: 'search-outline', iconActive: 'search', label: 'Explore' },
  { key: 'Reels', icon: 'play-circle-outline', iconActive: 'play-circle', label: 'Reels' },
  { key: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', label: 'Messages' },
  { key: 'Profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

export default function TopNavBar() {
  const navigation = useNavigation();
  const route = useRoute();
  const current = route.name;
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {TABS.map((tab) => {
        const active = current === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.key)}
          >
            <Ionicons
              color={active ? colors.primary : colors.textSecondary}
              name={active ? tab.iconActive : tab.icon}
              size={20}
            />
            <Text style={[styles.label, { color: colors.textSecondary }, active && { color: colors.primary, fontWeight: '600' }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 40,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tab: {
    alignItems: 'center',
  },
  label: {
    marginTop: 2,
    fontSize: 11,
  },
});
