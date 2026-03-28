/**
 * Content Detection Utilities
 * Helper functions to identify imported, trending, and video content
 */

/**
 * Check if content is imported from external platform
 */
export const isImportedContent = (post) => {
  if (!post) return false;

  // Check for imported markers
  if (post.imported_from || post.external_source || post.platform) {
    return true;
  }

  // Check if author suggests imported content
  if (post.author?.username && post.author.username.includes('_imported_')) {
    return true;
  }

  // Check imported_post_mapping or mapping field
  if (post.mapping || post.imported) {
    return true;
  }

  return false;
};

/**
 * Get the source platform if imported
 * Returns: 'youtube', 'tiktok', 'instagram', 'twitter', etc or null
 */
export const getImportedPlatform = (post) => {
  if (!post) return null;

  // If explicitly marked
  if (post.platform) return post.platform.toLowerCase();
  if (post.external_source) return post.external_source.toLowerCase();

  // Detect from media URLs
  if (post.media && Array.isArray(post.media)) {
    for (const media of post.media) {
      if (media.type === 'tiktok') return 'tiktok';
      if (media.type === 'instagram') return 'instagram';
      if (media.type === 'twitter') return 'twitter';
      if (media.url?.includes('tiktok.com')) return 'tiktok';
      if (media.url?.includes('instagram.com')) return 'instagram';
      if (media.url?.includes('twitter.com') || media.url?.includes('x.com')) return 'twitter';
    }
  }

  return null;
};

/**
 * Check if post is trending (has high engagement)
 */
export const isTrendingContent = (post, engagementThreshold = 50) => {
  if (!post) return false;

  const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
  return totalEngagement >= engagementThreshold;
};

/**
 * Check if post contains video media
 */
export const isVideoContent = (post) => {
  if (!post) return false;

  // Check media_type field
  if (post.media_type === 'video' || post.mediaType === 'video') return true;

  // Check media array
  if (post.media && Array.isArray(post.media)) {
    return post.media.some(m =>
      m.type === 'tiktok' ||
      m.type === 'video' ||
      m.url?.includes('tiktok.com') ||
      ['mp4', 'webm', 'mov', 'm3u8'].some(ext => m.url?.toLowerCase().includes(`.${ext}`)),
    );
  }

  return false;
};

/**
 * Check if post is an imported video
 */
export const isImportedVideo = (post) => {
  return isImportedContent(post) && isVideoContent(post);
};

/**
 * Get all video URLs from a post
 */
export const getVideoUrls = (post) => {
  const urls = [];

  if (post.media && Array.isArray(post.media)) {
    post.media.forEach(m => {
      if (m.type === 'tiktok' || m.type === 'video') {
        urls.push(m.url);
      }
    });
  }

  return urls;
};

/**
 * Get platform display name and icon
 */
export const getPlatformInfo = (platform) => {
  const info = {
    youtube: { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
    instagram: { name: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
    twitter: { name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    tiktok: { name: 'TikTok', icon: 'logo-tiktok', color: '#25F4EE' },
  };

  return info[platform?.toLowerCase()] || { name: 'External', icon: 'share-social', color: '#999999' };
};

/**
 * Determine user type based on account data
 * 'new' = created < 7 days ago or has < 5 follows
 * 'loyal' = created > 30 days ago and has > 20 follows
 * 'regular' = in between
 */
export const getUserType = (user) => {
  if (!user) return 'regular';

  const accountAgeDays = user.account_age_days ||
    (user.created_at ? Math.floor((Date.now() - user.created_at) / (1000 * 60 * 60 * 24)) : 30);

  const followCount = user.following_count || user.followingCount || 0;

  if (accountAgeDays < 7 || followCount < 5) {
    return 'new';
  }

  if (accountAgeDays > 30 && followCount > 20) {
    return 'loyal';
  }

  return 'regular';
};

/**
 * Get recommended feed type based on user type
 * This determines what mix of content to show
 */
export const getRecommendedFeedType = (userType) => {
  switch (userType) {
  case 'new':
    // New users get more suggested/trending content for discovery
    return 'suggested';
  case 'loyal':
    // Loyal users get primarily their home feed
    return 'home';
  default:
    // Regular users get balanced home feed
    return 'home';
  }
};
