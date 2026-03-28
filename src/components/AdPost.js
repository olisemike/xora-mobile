import React, { useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';

import { useAdContext } from '../contexts/AdContext';

import AdSDK from './AdSDK';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Error Boundary for Ad Components
 */
class AdErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (__DEV__) console.error('[AdPost] Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ad temporarily unavailable</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * AdPost Component - Displays ads in feed as native posts
 * Shows as a sponsored post with advertiser details
 */
const AdPostInner = ({ adData, _index, onImpressionReady }) => {
  const { trackImpression, trackClick } = useAdContext();
  const viewRef = useRef(null);
  const impressionTrackedRef = useRef(false);

  useEffect(() => {
    if (!impressionTrackedRef.current && adData?.id) {
      impressionTrackedRef.current = true;
      trackImpression(adData.id, 'feed');
      onImpressionReady?.(adData.id);
    }
  }, [adData?.id, trackImpression, onImpressionReady]);

  if (!adData) return null;

  // Handle SDK ads - render using AdSDK component
  const adType = adData.adType || adData.ad_type || 'image';
  if (adType === 'sdk') {
    return (
      <View style={styles.sdkContainer}>
        <View style={styles.sdkHeader}>
          <Text style={styles.sdkLabel}>Sponsored</Text>
        </View>
        <AdSDK
          adData={adData}
          onImpression={(id) => {
            trackImpression(id, 'feed');
            onImpressionReady?.(id);
          }}
        />
      </View>
    );
  }

  // Handle field name variations from backend
  const title = adData.title || adData.headline || '';
  const mediaUrl = adData.mediaUrl || adData.media_url || null;
  const ctaText = adData.ctaText || adData.cta_text || 'Learn More';
  const description = adData.description || '';
  const clickUrl = adData.url || adData.click_url || '';

  const handlePress = () => {
    if (adData.id && clickUrl) {
      trackClick(adData.id, 'feed');
      Linking.openURL(clickUrl).catch((err) => {
        if (__DEV__) console.warn('[AdPost] Failed to open URL:', err);
      });
    }
  };

  return (
    <TouchableOpacity
      ref={viewRef}
      activeOpacity={0.8}
      style={styles.container}
      onPress={handlePress}
    >
      {/* Post Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>Sponsored Ad</Text>
            <Text style={styles.authorHandle}>@advertisement</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>Sponsored</Text>
      </View>

      {/* Post Content */}
      <View style={styles.content}>
        {title ? (
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text numberOfLines={3} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Ad Media */}
      {mediaUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: mediaUrl }}
          style={styles.media}
          onError={(error) => {
            if (__DEV__) console.warn('[AdPost] Image failed to load:', error.nativeEvent.error);
          }}
        />
      ) : null}

      {/* CTA Button */}
      {ctaText ? (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePress}
        >
          <Text style={styles.ctaText}>{ctaText}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Ad Indicator Badge */}
      <View style={styles.adBadge}>
        <Text style={styles.badgeText}>📢 Ad</Text>
      </View>
    </TouchableOpacity>
  );
};

// Export wrapped component with error boundary
export const AdPost = (props) => (
  <AdErrorBoundary>
    <AdPostInner {...props} />
  </AdErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    paddingBottom: 12,
  },
  errorContainer: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  authorHandle: {
    fontSize: 13,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  media: {
    width: SCREEN_WIDTH,
    height: 400,
    marginVertical: 8,
  },
  ctaButton: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sdkContainer: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 8,
  },
  sdkHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  sdkLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
});

export default AdPost;
