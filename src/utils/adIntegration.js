/**
 * Ad Integration Helper
 * Provides utilities for integrating ads into various screens
 */

/**
 * Insert ad into feed
 * Every 5th post index (0, 5, 10, 15, etc.)
 */
export const shouldShowFeedAd = (postIndex) => {
  return postIndex > 0 && (postIndex + 1) % 5 === 0;
};

/**
 * Get ad position in feed
 */
export const getFeedAdPosition = (posts, _adData) => {
  // Find the first position where ad should appear
  for (let i = 0; i < posts.length; i++) {
    if (shouldShowFeedAd(i)) {
      return i;
    }
  }
  return null;
};

/**
 * Insert ads into story array
 * Between every 3 stories (after indices 2, 5, 8, etc.)
 * Only when viewing stories, not in homefeed story list
 */
export const insertStoryAds = (stories, ads) => {
  if (!ads || ads.length === 0) return stories;
  if (!stories || stories.length === 0) return stories;

  // Build new array to avoid index drift issues
  const result = [];
  let adIndex = 0;
  let storyCount = 0;

  for (let i = 0; i < stories.length; i++) {
    result.push(stories[i]);
    storyCount++;

    // Insert ad after every 3 stories (positions 3, 6, 9, etc.)
    if (storyCount % 3 === 0 && adIndex < ads.length) {
      result.push({
        ...ads[adIndex],
        isAd: true,
      });
      adIndex++;
    }
  }

  return result;
};

/**
 * Check if story is an ad story
 */
export const isAdStory = (story) => {
  return story?.isAd === true;
};

/**
 * Insert ads into reels
 * Every 3rd reel (at index 2, 5, 8, etc.)
 */
export const shouldShowReelAd = (reelIndex) => {
  return reelIndex > 0 && (reelIndex + 1) % 3 === 0;
};

/**
 * Check if reel is an ad
 */
export const isAdReel = (reel) => {
  return reel?.isAd === true;
};

/**
 * Render feed with ads
 * Inserts ad every 5 posts
 */
export const renderFeedWithAds = (posts, currentAd, renderPostComponent, renderAdComponent) => {
  const items = [];

  for (let i = 0; i < posts.length; i++) {
    // Add post
    items.push(
      renderPostComponent({
        key: `post-${posts[i].id}`,
        post: posts[i],
        index: i,
      }),
    );

    // Add ad if needed
    if (shouldShowFeedAd(i) && currentAd) {
      items.push(
        renderAdComponent({
          key: `ad-feed-${currentAd.id}-${i}`,
          adData: currentAd,
          index: i,
        }),
      );
    }
  }

  return items;
};

/**
 * Get scroll position percentage
 * Useful for tracking visibility
 */
export const getScrollPercentage = (contentOffset, layoutHeight, scrollHeight) => {
  if (scrollHeight === 0) return 0;
  const scrolled = contentOffset + layoutHeight;
  return (scrolled / scrollHeight) * 100;
};

/**
 * Check if element is visible in viewport
 */
export const isElementVisible = (layoutY, layoutHeight, scrollOffset, viewportHeight) => {
  const elementTop = layoutY;
  const elementBottom = layoutY + layoutHeight;
  const viewportTop = scrollOffset;
  const viewportBottom = scrollOffset + viewportHeight;

  return elementBottom > viewportTop && elementTop < viewportBottom;
};

/**
 * Calculate visibility percentage (0-100)
 */
export const calculateVisibilityPercent = (layoutY, layoutHeight, scrollOffset, viewportHeight) => {
  const elementTop = layoutY;
  const elementBottom = layoutY + layoutHeight;
  const viewportTop = scrollOffset;
  const viewportBottom = scrollOffset + viewportHeight;

  const visibleTop = Math.max(elementTop, viewportTop);
  const visibleBottom = Math.min(elementBottom, viewportBottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  return (visibleHeight / layoutHeight) * 100;
};

/**
 * Format ad response from backend
 */
export const formatAdData = (rawAd) => {
  return {
    id: rawAd.id,
    url: rawAd.url || rawAd.click_url || rawAd.ctaUrl || rawAd.cta_url || rawAd.landingUrl,
    mediaUrl: rawAd.mediaUrl || rawAd.media_url || rawAd.contentUrl || rawAd.content_url || rawAd.imageUrl || rawAd.media || rawAd.thumbnailUrl || rawAd.thumbnail_url,
    headline: rawAd.headline || rawAd.title,
    description: rawAd.description || rawAd.text,
    ctaText: rawAd.ctaText || rawAd.callToAction || 'Learn More',
    duration: rawAd.duration || 15, // seconds for video ads
    vastUrl: rawAd.vastUrl, // For VAST video ads
    adType: rawAd.adType || rawAd.ad_type, // 'image', 'video', 'script', 'sdk'
    sdkProvider: rawAd.sdkProvider || rawAd.sdk_provider, // 'admob', 'meta', etc.
    sdkAdUnitId: rawAd.sdkAdUnitId || rawAd.sdk_ad_unit_id,
    sdkConfig: rawAd.sdkConfig || rawAd.sdk_config, // JSON config for SDK
  };
};

/**
 * Debounce helper for tracking
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle helper for tracking
 */
export const throttle = (fn, limit) => {
  let inThrottle;
  return function throttled(...args) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export default {
  shouldShowFeedAd,
  getFeedAdPosition,
  insertStoryAds,
  isAdStory,
  shouldShowReelAd,
  isAdReel,
  renderFeedWithAds,
  getScrollPercentage,
  isElementVisible,
  calculateVisibilityPercent,
  formatAdData,
  debounce,
  throttle,
};
