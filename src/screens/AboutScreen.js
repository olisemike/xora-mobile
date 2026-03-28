import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

const AboutScreen = ({ navigation }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About Xora Social</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>App Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Name:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Xora Social</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Release Date:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>December 2025</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Developer / Company:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Xora Social</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Mission</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          Xora Social is a community-driven social media platform enabling users to share posts, videos, and
          stories while connecting with friends and communities worldwide.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>What We Offer</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          • Share posts, photos, and videos with your network{'\n'}
          • Connect with friends and discover new communities{'\n'}
          • Share temporary stories that disappear after 24 hours{'\n'}
          • Watch and create short-form video content (Reels){'\n'}
          • Private messaging with friends and groups{'\n'}
          • Explore trending topics and discover new content
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Commitment</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>
          We are committed to providing a safe, inclusive, and engaging platform where users can express themselves
          freely while respecting the rights and dignity of others.
        </Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  paragraph: { fontSize: 15, marginBottom: 12, lineHeight: 20 },
  infoGrid: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '600',
    marginRight: 6,
  },
  infoValue: {
  },
});

export default AboutScreen;
