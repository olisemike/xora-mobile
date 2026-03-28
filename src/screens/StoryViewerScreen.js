import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import { useStories } from '../contexts/StoriesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AdStory from '../components/AdStory';

const StoryViewerScreen = ({ route, navigation }) => {
  const { stories } = useStories();
  const { settings } = useSettings();
  const { token } = useAuth();
  const largeText = settings.textSizeLarge;
  const { captionsForVideos } = settings;
  const { storyId, actorId, actorType, disableAds } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const viewedStoriesRef = useRef(new Set());
  const { colors } = useTheme();

  const baseStories = useMemo(() => {
    let list = Array.isArray(stories) ? stories : [];
    if (actorId) {
      list = list.filter((s) => s.user?.id === actorId && (!actorType || s.user?.type === actorType));
    }
    return list;
  }, [stories, actorId, actorType]);
  const storiesWithAds = useMemo(() => {
    if (!baseStories || baseStories.length === 0) return [];
    if (disableAds) {
      return baseStories.filter((s) => !s.isAd);
    }
    return baseStories;
  }, [baseStories, disableAds]);

  useEffect(() => {
    if (!storiesWithAds.length) return;
    if (storyId) {
      const initialIndex = storiesWithAds.findIndex((s) => s.id === storyId);
      setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
    } else {
      setCurrentIndex(0);
    }
  }, [storiesWithAds, storyId]);

  // Track story view when current story changes
  useEffect(() => {
    if (!storiesWithAds.length || !token) return;
    const currentStory = storiesWithAds[currentIndex];
    if (!currentStory || currentStory.isAd || viewedStoriesRef.current.has(currentStory.id)) return;

    // Mark story as viewed
    viewedStoriesRef.current.add(currentStory.id);
    api.viewStory(token, currentStory.id).catch((err) => {
      // Silently fail view tracking
      if (__DEV__) console.warn('Failed to mark story as viewed:', err);
    });
  }, [currentIndex, storiesWithAds, token]);

  const story = storiesWithAds[currentIndex] || null;
  const isVideo = story?.mediaType === 'video' || story?.type === 'video';
  const videoUrl = story?.mediaUrl || story?.video;

  const goToNext = useCallback(() => {
    if (currentIndex < storiesWithAds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of stories, go back
      navigation.goBack();
    }
  }, [currentIndex, storiesWithAds.length, navigation]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleVideoEnd = useCallback(() => {
    // When video ends, advance to next story
    goToNext();
  }, [goToNext]);

  // Auto-advance to next story after 8 seconds for images
  useEffect(() => {
    if (!story || isVideo) {
      // Clear timer if no story or if it's a video (videos handle their own timing)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Set 8-second timer for image stories
    timerRef.current = setTimeout(() => {
      goToNext();
    }, 8000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, story, isVideo, goToNext]);

  if (!story) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.overlay}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.onPrimary || '#fff'} name="arrow-back" size={26} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If this is an ad story, render AdStory component
  if (story?.isAd) {
    return (
      <AdStory
        adData={story}
        onClose={() => navigation.goBack()}
        onNext={goToNext}
      />
    );
  }

  const mediaUrl = isVideo ? videoUrl : (story.mediaUrls?.[0]?.url || story.image || story.video || story.url);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Navigation tap zones */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapLeft}
        onPress={goToPrevious}
      />
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapRight}
        onPress={goToNext}
      />

      {isVideo && mediaUrl ? (
        <Video
          ref={videoRef}
          shouldPlay
          isLooping={false}
          resizeMode="cover"
          source={{ uri: mediaUrl }}
          style={styles.media}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) {
              handleVideoEnd();
            }
          }}
          useNativeControls
        />
      ) : mediaUrl ? (
        <Image source={{ uri: mediaUrl }} style={styles.media} />
      ) : null}

      <View style={styles.overlay}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          {storiesWithAds.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressBar,
                { backgroundColor: `${colors.onPrimary || '#fff'}4D` },
                idx < currentIndex && { backgroundColor: colors.onPrimary || '#fff' },
                idx === currentIndex && { backgroundColor: colors.onPrimary || '#fff' },
              ]}
            />
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: `${colors.onPrimary || '#fff'}66` }]}>
              <Text style={[styles.avatarText, largeText && styles.avatarTextLarge, { color: colors.onPrimary || '#fff' }]}>
                {story.user?.name?.[0] || story.author?.name?.[0] || '?'}
              </Text>
            </View>
            <View>
              <Text style={[styles.userName, largeText && styles.userNameLarge, { color: colors.onPrimary || '#fff' }]}>
                {story.user?.name || story.author?.name || 'User'}
              </Text>
              <Text style={[styles.timestamp, largeText && styles.timestampLarge, { color: `${colors.onPrimary || '#fff'}CC` }]}>
                {story.timestamp || story.timeAgo || 'Just now'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons color={colors.onPrimary || '#fff'} name="close" size={28} />
          </TouchableOpacity>
        </View>

        {/* Description at bottom if present */}
        {story.content && (!isVideo || captionsForVideos) ? (
          <View style={[styles.descriptionContainer, { backgroundColor: ((colors.onPrimary || '#fff') === '#ffffff' ? '#00000066' : '#ffffff66') }]}>
            <Text style={[styles.description, largeText && styles.descriptionLarge, { color: colors.onPrimary || '#fff' }]}>
              {story.content}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 1,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '70%',
    zIndex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 50,
    paddingHorizontal: 12,
    paddingBottom: 20,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 3,

    borderRadius: 2,
  },
  progressBarComplete: {

  },
  progressBarActive: {

  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    pointerEvents: 'auto',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  avatarTextLarge: {
    fontSize: 20,
  },
  userName: {
    fontWeight: '600',
    fontSize: 15,
  },
  userNameLarge: {
    fontSize: 17,
  },
  timestamp: {
    fontSize: 12,
  },
  timestampLarge: {
    fontSize: 14,
  },
  descriptionContainer: {

    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    pointerEvents: 'none',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  descriptionLarge: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default StoryViewerScreen;
