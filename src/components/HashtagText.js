import React from 'react';
import { Text, StyleSheet } from 'react-native';

// Simple hashtag and mention renderer: splits by space, detects #tags and @mentions, and makes them tappable

const HashtagText = ({ text, onPressHashtag, onPressMention, style }) => {
  if (!text) return null;

  const parts = (`${text}`).split(/(#[A-Za-z0-9_]+|@([A-Za-z0-9_]+))/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (!part) return null; // Skip empty parts
        if (part.match(/^#[A-Za-z0-9_]+$/)) {
          const tag = part.slice(1);
          return (
            <Text
              key={`hashtag-${index}-${tag}`}
              style={styles.hashtag}
              onPress={() => onPressHashtag && onPressHashtag(tag)}
            >
              {part}
            </Text>
          );
        }
        if (part.match(/^@([A-Za-z0-9_]+)$/)) {
          const username = part.slice(1);
          return (
            <Text
              key={`mention-${index}-${username}`}
              style={styles.mention}
              onPress={() => onPressMention && onPressMention(username)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={`text-${index}-${part.slice(0, 10)}`}>{part}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  hashtag: {
    color: '#E91E63',
    fontWeight: '600',
  },
  mention: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default HashtagText;
