// API base URL for real backend
// NOTE: keep in sync with web/admin .env if you change this.
// For physical device testing: Use your LAN IP (run `ipconfig` to find it)
// For emulator testing: Use 'http://127.0.0.1:8787' or 'http://10.0.2.2:8787' (Android)
// Production: https://xora-workers-api-production.xorasocial.workers.dev

// Use environment variable if set, otherwise use production URL
const getApiUrl = () => {
  // Check for environment variable first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Default to production API
  return 'https://xora-workers-api-production.xorasocial.workers.dev';
};

export const API_URL = getApiUrl();

// Cloudflare media delivery configuration (optional)
export const CLOUDFLARE_IMAGES_HASH = process.env.EXPO_PUBLIC_CLOUDFLARE_IMAGES_HASH || '';
export const CLOUDFLARE_STREAM_SUBDOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN || '';

export const getCloudflareImageUrl = (id, variant = 'public') =>
  CLOUDFLARE_IMAGES_HASH
    ? `https://imagedelivery.net/${CLOUDFLARE_IMAGES_HASH}/${id}/${variant}`
    : null;

export const getCloudflareVideoUrl = (id) =>
  CLOUDFLARE_STREAM_SUBDOMAIN
    ? `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${id}/manifest/video.m3u8`
    : `https://videodelivery.net/${id}/manifest/video.m3u8`;

// Base URL of the web app used for sharing links
export const WEB_APP_BASE_URL = 'https://xorasocial.com';

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Normalize error shape from backend errorResponse({ message, code, details })
/**
 * Extract error message from various response formats.
 * Backend returns: { success: false, error: { message: string } | string, message?: string }
 */
const extractError = (data, status, fallback) => {
  if (!data) {
    return fallback || `Request failed (${status})`;
  }

  if (typeof data.error === 'string') {
    return data.error;
  }

  if (data.error && typeof data.error.message === 'string') {
    return data.error.message;
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return fallback || `Request failed (${status})`;
};

/**
 * Check if a post/reel is an advertisement.
 * Backend returns camelCase: isAd (boolean)
 * Defensive: Also checks snake_case variants for backward compatibility
 */
const isAdPost = (post) => {
  if (!post) return false;
  // Check camelCase first (expected from backend toCamelCase middleware)
  if (post.isAd === true) return true;
  // Backward compatibility fallbacks
  if (post.is_ad === true || post.is_ad === 1) return true;
  if (post.adType) return true;
  if (post.ad_type) return true;
  return false;
};

/**
 * Extract author information from comment.
 * Backend returns camelCase: authorName, authorUsername via toCamelCase middleware
 * Defensive: Also checks snake_case variants and alternate naming
 */
const extractCommentAuthor = (comment) => {
  const name = comment.authorName || comment.author_name || comment.userName || comment.user_name || comment.name || 'User';
  const username = comment.authorUsername || comment.username || comment.userUsername || comment.user_username || 'user';
  return { name, username };
};

/**
 * Extract numeric count field with fallback variants.
 * Backend returns camelCase: likesCount, commentsCount, viewsCount via toCamelCase
 * Defensive: Also checks snake_case variants and shorthand (likes, comments, views)
 */
const extractCount = (obj, camelKey, snakeKey, shortKey) => {
  return obj?.[camelKey] ?? obj?.[snakeKey] ?? obj?.[shortKey] ?? 0;
};

const extractAuthTokens = (payload) => {
  const accessToken =
    payload?.tokens?.accessToken ||
    payload?.accessToken ||
    payload?.token ||
    null;

  const refreshToken =
    payload?.tokens?.refreshToken ||
    payload?.refreshToken ||
    null;

  return { accessToken, refreshToken };
};

/**
 * Extract actor name from post response - handles backend enrichment field names
 */
const extractActorName = (raw) => {
  // After toCamelCase from backend enrichment
  if (raw.actorName && raw.actorName !== 'User') return raw.actorName;
  // Direct snake_case from backend
  if (raw.actor_name && raw.actor_name !== 'User') return raw.actor_name;
  // From author object
  const authorObj = raw.author || raw.actor || raw.owner || raw.user || raw.page;
  if (authorObj?.name && authorObj.name !== 'User') return authorObj.name;
  if (authorObj?.displayName) return authorObj.displayName;
  // Fallback to username variants
  if (raw.username) return raw.username;
  if (raw.actor_username) return raw.actor_username;
  if (authorObj?.username) return authorObj.username;
  return 'User';
};

/**
 * Extract actor username from post response
 */
const extractActorUsername = (raw) => {
  // From author object
  const authorObj = raw.author || raw.actor || raw.owner || raw.user || raw.page;
  // Priority: Backend-enriched username field
  if (raw.username) return raw.username;
  // Camel case variants
  if (raw.actorUsername) return raw.actorUsername;
  if (raw.authorUsername) return raw.authorUsername;
  // Snake case variants
  if (raw.actor_username) return raw.actor_username;
  if (raw.author_username) return raw.author_username;
  // From object
  if (authorObj?.username) return authorObj.username;
  if (authorObj?.handle) return authorObj.handle;
  return 'user';
};

/**
 * Extract actor avatar from post response
 */
const extractActorAvatar = (raw) => {
  // After toCamelCase from backend enrichment
  if (raw.avatarUrl) return raw.avatarUrl;
  // Direct snake_case from backend
  if (raw.avatar_url) return raw.avatar_url;
  // Other variants
  if (raw.avatar) return raw.avatar;
  // From author object
  const authorObj = raw.author || raw.actor || raw.owner || raw.user || raw.page;
  if (authorObj?.avatarUrl) return authorObj.avatarUrl;
  if (authorObj?.avatar_url) return authorObj.avatar_url;
  if (authorObj?.avatar) return authorObj.avatar;
  return null;
};

// Normalize a backend post into the mobile feed shape used by HomeScreen / Bookmarks
const normalizePost = (raw) => {
  if (!raw) return null;

  // media_urls may be JSON string, array, or null
  let mediaArray = [];
  const mediaField = raw.media_urls ?? raw.mediaUrls ?? raw.media;
  if (Array.isArray(mediaField)) {
    mediaArray = mediaField;
  } else if (typeof mediaField === 'string') {
    try {
      const parsed = JSON.parse(mediaField);
      if (Array.isArray(parsed)) mediaArray = parsed;
    } catch {
      // ignore parse errors; treat as no media
    }
  }

  const images = mediaArray
    .filter((m) => !m.type || m.type === 'image')
    .map((m) => ({
      uri: m.url || m.uri || m,
      type: 'image',
      thumbnailUri: m.thumbnailUrl || m.thumbnail || m.thumbnailUri || null,
    }));
  const videos = mediaArray
    .filter((m) => m.type === 'video')
    .map((m) => ({
      uri: m.url || m.uri || m,
      type: 'video',
      thumbnailUri: m.thumbnailUrl || m.thumbnail || m.thumbnailUri || null,
    }));

  const allMedia = [...images, ...videos];

  const timestampSource = raw.created_at || raw.createdAt || raw.timestamp;
  let timestamp = 'now';
  if (timestampSource) {
    const ms = typeof timestampSource === 'number' ? timestampSource * 1000 : Date.parse(timestampSource);
    if (!Number.isNaN(ms)) {
      timestamp = new Date(ms).toLocaleString();
    }
  }

  // Preserve actor identity on the normalized post so ownership checks (delete, edit)
  // can work correctly in components like PostMenu.
  const actorType = raw.actor_type || raw.actorType || 'user';
  const actorId =
    raw.actor_id ||
    raw.actorId ||
    raw.author_id ||
    raw.owner_id ||
    raw.user_id ||
    (raw.author && (raw.author.id || raw.author.user_id)) ||
    null;

  // Use robust helper functions to extract actor information with all field variants
  const authorName = extractActorName(raw);
  const authorUsername = extractActorUsername(raw);
  const authorAvatar = extractActorAvatar(raw);

  // For imported posts, try to get original author from media metadata
  let displayAuthorName = authorName;
  let displayAuthorUsername = authorUsername;
  if (mediaArray.length > 0 && mediaArray[0].external_author) {
    displayAuthorName = mediaArray[0].external_author;
    displayAuthorUsername = mediaArray[0].external_author.toLowerCase().replace(/\s+/g, '_');
  }

  // Handle shared posts from backend (isShare + originalPost → kind: 'share' + original)
  const isShare = raw.isShare === true;
  const originalPost = raw.originalPost;

  // DEBUG: Log actor information extraction
  if (__DEV__) {
    const hasActorInfo = Boolean(authorName && authorName !== 'User') || Boolean(authorUsername && authorUsername !== 'user') || Boolean(authorAvatar);
    if (!hasActorInfo || actorId === null) {
      console.warn('[normalizePost] Missing actor info:', {
        postId: raw.postId || raw.id,
        actorId,
        authorName,
        authorUsername,
        authorAvatar,
        rawFields: {
          actorName: raw.actorName,
          actor_name: raw.actor_name,
          username: raw.username,
          avatarUrl: raw.avatarUrl,
          avatar_url: raw.avatar_url,
        },
      });
    }
  }

  const basePost = {
    id: String(raw.postId || raw.id),
    kind: isShare ? 'share' : (raw.kind || 'post'),
    actor_type: actorType,
    actor_id: actorId,
    author: {
      id: actorId,
      name: displayAuthorName,
      username: displayAuthorUsername,
      avatar: authorAvatar,
    },
    content: raw.content || raw.caption || raw.text || '',
    image: images[0]?.uri || null,
    media: allMedia,
    likes: Number(raw.likesCount ?? raw.likes_count ?? raw.likes ?? 0),
    comments: Number(raw.commentsCount ?? raw.comments_count ?? raw.comments ?? 0),
    shares: Number(raw.sharesCount ?? raw.shares_count ?? raw.shares ?? 0),
    timestamp,
    isSensitive: Boolean(raw.is_sensitive),
    isLiked: Boolean(raw.isLiked ?? raw.liked_by_me ?? raw.is_liked ?? raw.likedByMe ?? false),
    isBookmarked: Boolean(raw.isBookmarked ?? raw.bookmarked_by_me ?? raw.is_bookmarked ?? raw.bookmarkedByMe ?? false),
  };

  // Log if ID is missing for debugging
  if (!basePost.id || basePost.id === 'undefined') {
    if (__DEV__) console.warn('[normalizePost] Missing post ID:', { rawPostId: raw.postId, rawId: raw.id, raw });
  }

  // If this is a share, add the original post and sharedBy info
  if (isShare && originalPost) {
    basePost.sharedBy = {
      id: actorId,
      name: authorName,
      username: authorUsername,
      avatar: authorAvatar,
    };
    // Normalize the original post content
    const origMediaArray = Array.isArray(originalPost.media_urls)
      ? originalPost.media_urls
      : (typeof originalPost.media_urls === 'string'
        ? ((() => { try { return JSON.parse(originalPost.media_urls); } catch { return []; } })())
        : []);
    const origImages = origMediaArray
      .filter((m) => !m.type || m.type === 'image')
      .map((m) => ({ uri: m.url || m.uri || m, type: 'image' }));
    const origVideos = origMediaArray
      .filter((m) => m.type === 'video')
      .map((m) => ({ uri: m.url || m.uri || m, type: 'video', thumbnailUri: m.thumbnailUrl || m.thumbnailUri || null }));

    basePost.original = {
      id: String(originalPost.id),
      content: originalPost.content || '',
      image: origImages[0]?.uri || null,
      media: [...origImages, ...origVideos],
      likes: Number(originalPost.likesCount ?? originalPost.likes_count ?? originalPost.likes ?? 0),
      comments: Number(originalPost.commentsCount ?? originalPost.comments_count ?? originalPost.comments ?? 0),
      shares: Number(originalPost.sharesCount ?? originalPost.shares_count ?? originalPost.shares ?? 0),
      isLiked: Boolean(originalPost.isLiked ?? originalPost.liked_by_me ?? originalPost.is_liked ?? originalPost.likedByMe ?? false),
      isBookmarked: Boolean(originalPost.isBookmarked ?? originalPost.bookmarked_by_me ?? originalPost.is_bookmarked ?? originalPost.bookmarkedByMe ?? false),
      actor_type: originalPost.actorType || originalPost.actor_type || 'user',
      actor_id: originalPost.actorId || originalPost.actor_id,
      author: {
        id: originalPost.actorId || originalPost.actor_id,
        name: originalPost.actorName || originalPost.actor_name || originalPost.username || 'User',
        username: originalPost.username || 'user',
        avatar: originalPost.avatarUrl || originalPost.avatar_url || null,
      },
      timestamp: (originalPost.createdAt || originalPost.created_at)
        ? new Date(typeof (originalPost.createdAt || originalPost.created_at) === 'number' ? (originalPost.createdAt || originalPost.created_at) * 1000 : (originalPost.createdAt || originalPost.created_at)).toLocaleString()
        : 'unknown',
    };
  }

  return basePost;
};

const api = {
  normalizePostForRealtime: (rawPost) => normalizePost(rawPost),

  // Auth
  /**
   * Login user with email/username and password.
   * Backend auth.login() expects: { identifier, password, deviceInfo }
   * Returns: { success, data: { user, tokens: { accessToken, refreshToken } } } via toCamelCase middleware
   * OR requests 2FA/device verification: { success: true, requires2FA: true, tempToken, message }
   */
  login: async (emailOrUsername, password, deviceInfo = null) => {
    try {
      // Attempting login
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ identifier: emailOrUsername, password, deviceInfo }),
      });

      const data = await parseJsonSafe(response);
      // Login response received

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `Login failed with status ${response.status}`,
        );
        // Login failed
        throw new Error(errorMsg);
      }

      const payload = data.data || data || {};

      if (payload.requires2FA) {
        // 2FA required
        return {
          success: true,
          requires2FA: true,
          tempToken: payload.tempToken,
          message:
            payload.message ||
            'Two-factor authentication is required. Enter the code from your authenticator app or a backup code.',
        };
      }

      if (payload.requiresDeviceVerification) {
        // Device verification required
        return {
          success: true,
          requiresDeviceVerification: true,
          tempToken: payload.tempToken,
          message:
            payload.message ||
            'A verification code has been sent to your email. Please verify this device before logging in.',
        };
      }

      const userFromApi = payload.user;
      const { accessToken: access, refreshToken: refresh } = extractAuthTokens(payload);

      return {
        success: true,
        user: userFromApi,
        token: access,
        refreshToken: refresh || null,
      };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  signup: async (name, email, username, password) => {
    try {
      // Attempting signup
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ name, email, username, password }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `Signup failed with status ${response.status}`,
        );
        throw new Error(errorMsg);
      }

      const payload = data.data || data || {};

      // Check if email verification is required (new signup flow)
      if (payload.requiresEmailVerification) {
        return {
          success: true,
          requiresEmailVerification: true,
          tempToken: payload.tempToken,
          email: payload.email,
          message: payload.message,
        };
      }

      const userFromApi = payload.user;
      const { accessToken: access, refreshToken: refresh } = extractAuthTokens(payload);

      return {
        success: true,
        user: userFromApi,
        token: access,
        refreshToken: refresh || null,
      };
    } catch (error) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  },

  /**
   * Refresh authentication token.
   * Backend auth.refresh() returns via toCamelCase:
   * { success, data: { tokens: { accessToken, refreshToken } } }
   * Also handles defensive check for accessToken/refreshToken at root level
   */
  refreshToken: async (refreshToken) => {
    try {
      // Attempting to refresh access token

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ refreshToken }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `Token refresh failed with status ${response.status}`,
        );
        // Refresh failed - include status code for AuthContext to determine if it's auth failure
        throw new Error(JSON.stringify({ error: errorMsg, statusCode: response.status }));
      }

      const { accessToken: access, refreshToken: refresh } = extractAuthTokens(data.data || data || {});

      // Refresh success
      return {
        success: true,
        token: access,
        refreshToken: refresh || null,
      };
    } catch (error) {
      // Parse status code from error if available
      let statusCode = null;
      let errorMsg = error.message || 'Token refresh failed';

      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.error && parsed.statusCode) {
          statusCode = parsed.statusCode;
          errorMsg = parsed.error;
        }
      } catch {
        // Not a JSON error, use as is
      }

      return {
        success: false,
        error: errorMsg,
        statusCode,
      };
    }
  },

  // Complete signup after email verification
  completeSignup: async (tempToken, code) => {
    try {
      const response = await fetch(`${API_URL}/auth/complete-signup`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ tempToken, code }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `Verification failed with status ${response.status}`,
        );
        return { success: false, error: errorMsg };
      }

      const payload = data.data || data || {};

      // New response structure: just confirms email verification, no tokens yet
      // User must complete sign-in with device verification
      return {
        success: true,
        emailVerified: payload.emailVerified || false,
        email: payload.email,
        userId: payload.userId,
        signupVerificationToken: payload.signupVerificationToken,
        message: data.message || 'Email verified successfully',
      };
    } catch (error) {
      return { success: false, error: error.message || 'Verification failed' };
    }
  },

  // Resend signup verification code
  resendSignupVerification: async (tempToken) => {
    try {
      const response = await fetch(`${API_URL}/auth/resend-signup-verification`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ tempToken }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `Failed to resend code (${response.status})`,
        );
        return { success: false, error: errorMsg };
      }

      return { success: true, message: data.data?.message || data.message || 'Code sent' };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to resend code' };
    }
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to request password reset (${response.status})`);
    }
    return true;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to reset password (${response.status})`);
    }
    return true;
  },

  changePassword: async (token, currentPassword, newPassword) => {
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to change password (${response.status})`);
    }
    return true;
  },

  // 2FA helpers
  enable2FA: async (token) => {
    const response = await fetch(`${API_URL}/auth/enable-2fa`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({}),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to start 2FA setup (${response.status})`);
    }
    return data.data || data;
  },

  verify2FASetup: async (token, code) => {
    const response = await fetch(`${API_URL}/auth/verify-2fa-setup`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ code }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to verify 2FA setup (${response.status})`);
    }
    return true;
  },

  disable2FA: async (token, password, code) => {
    const response = await fetch(`${API_URL}/auth/disable-2fa`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ password, code }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to disable 2FA (${response.status})`);
    }
    return true;
  },

  getBackupCodesCount: async (token) => {
    const response = await fetch(`${API_URL}/auth/2fa/backup-codes`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to get backup codes (${response.status})`);
    }
    return data.data?.remainingCodes ?? 0;
  },

  regenerateBackupCodes: async (token, password, code) => {
    const response = await fetch(`${API_URL}/auth/2fa/regenerate-backup-codes`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ password, code }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to regenerate backup codes (${response.status})`);
    }
    return data.data?.backupCodes || [];
  },

  // Complete 2FA login using tempToken and code (TOTP or backup)
  verify2FALogin: async (tempToken, code, isBackupCode = false) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-2fa-login`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ tempToken, code, isBackupCode }),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok || !data?.success) {
        const errorMsg = extractError(
          data,
          response.status,
          `2FA verification failed (${response.status})`,
        );
        return { success: false, error: errorMsg };
      }

      const payload = data.data || data || {};
      const userFromApi = payload.user;
      const { accessToken: access, refreshToken: refresh } = extractAuthTokens(payload);

      return {
        success: true,
        user: userFromApi,
        token: access,
        refreshToken: refresh || null,
      };
    } catch (error) {
      return { success: false, error: error.message || '2FA verification failed' };
    }
  },

  // Session management: logout all devices & device tracking
  logoutAllDevices: async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/logout-all-devices`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({}),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error?.message || `Failed to logout all devices (${response.status})`,
        );
      }

      const payload = data?.data || data || {};
      const access =
        payload.tokens?.accessToken || payload.accessToken || null;
      const refresh =
        payload.tokens?.refreshToken || payload.refreshToken || null;

      return {
        success: true,
        token: access,
        refreshToken: refresh || null,
      };
    } catch (error) {
      return { success: false, error: error.message || 'Logout all devices failed' };
    }
  },

  // Device verification uses a temporary token issued by /auth/login
  verifyDevice: async (tempToken, verificationCode) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-device`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ verificationCode, tempToken }),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok || data?.success === false) {
        const message = extractError(data, response.status, `Device verification failed (${response.status})`);
        return { success: false, error: message };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      if (__DEV__) console.error('Verify device failed:', error);
      return { success: false, error: 'Device verification failed' };
    }
  },

  getLoginHistory: async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/login-history`, {
        method: 'GET',
        headers: jsonHeaders(token),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error?.message || `Failed to load login history (${response.status})`,
        );
      }

      const history = data?.data?.history || data?.history || [];
      return { success: true, history };
    } catch (error) {
      if (__DEV__) console.error('Get login history failed:', error);
      return { success: false, error: 'Failed to load login history' };
    }
  },

  getVerifiedDevices: async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/verified-devices`, {
        method: 'GET',
        headers: jsonHeaders(token),
      });
      const data = await parseJsonSafe(response);

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error?.message || `Failed to load verified devices (${response.status})`,
        );
      }

      const devices = data?.data?.devices || data?.devices || [];
      return { success: true, devices };
    } catch (error) {
      if (__DEV__) console.error('Get verified devices failed:', error);
      return { success: false, error: 'Failed to load verified devices' };
    }
  },

  // Get current authenticated user (fresh copy from backend)
  getMe: async (token) => {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to load current user (${response.status})`);
    }
    // AuthController.me returns the user object in data
    return data.data || data;
  },

  // Feed
  getFeed: async (token, cursor = null, options = {}) => {
    let url = `${API_URL}/feed`;
    const params = new URLSearchParams();

    if (cursor) {
      params.set('cursor', cursor);
    }
    if (options.skipCache) {
      params.set('skipCache', 'true');
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      throw new Error(data?.error?.message || `Failed to load feed (${response.status})`);
    }

    const rows = data?.data?.posts || data?.posts || [];
    if (__DEV__) {
      const samplePost = rows[0];
      if (samplePost) {
        console.warn('[getFeed] Sample raw post fields:', {
          id: samplePost.id,
          hasActorName: !!samplePost.actorName,
          hasActorUsername: !!samplePost.actorUsername,
          hasUsername: !!samplePost.username,
          hasAvatarUrl: !!samplePost.avatarUrl,
          hasAuthor: !!samplePost.author,
          actorId: samplePost.actorId || samplePost.actor_id,
          actorType: samplePost.actorType || samplePost.actor_type,
        });
      }
    }
    const posts = rows.map(normalizePost).filter(Boolean);
    if (__DEV__) {
      const samplePost = posts[0];
      if (samplePost) {
        console.warn('[getFeed] Sample normalized post author:', {
          id: samplePost.id,
          author: samplePost.author,
          actorId: samplePost.actor_id,
          actorType: samplePost.actor_type,
        });
      }
    }
    const pagination = data?.data?.pagination || { hasMore: false, nextCursor: null };

    return { posts, pagination };
  },

  // Settings
  getSettings: async (token) => {
    const response = await fetch(`${API_URL}/settings`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to load settings (${response.status})`);
    }
    return data.data || data;
  },

  updateSettings: async (token, payload) => {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to update settings (${response.status})`);
    }
    return data.data || data;
  },

  // Posts and Stories
  createPost: async ({ token, content, isSensitive = false, mediaUrls = [], cloudflareImageIds = [], cloudflareVideoIds = [], mediaType = null, actorType = null, actorId = null, language = 'en', postType = 'POST' }) => {
    const finalActorType = actorType || 'user';
    const finalActorId = actorId;

    // Route to /stories endpoint if creating a story
    const isStory = postType === 'STORY';
    const endpoint = isStory ? `${API_URL}/stories` : `${API_URL}/posts`;

    let body;
    if (isStory) {
      // Stories endpoint expects: actorType, actorId, mediaType, mediaUrl, duration, isSensitive
      // Extract URL from mediaUrls (which can be strings or objects with url property)
      let firstMediaUrl = null;
      if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
        const firstItem = mediaUrls[0];
        firstMediaUrl = typeof firstItem === 'string' ? firstItem : firstItem?.url;
      }
      body = {
        actorType: finalActorType,
        actorId: finalActorId,
        mediaType: mediaType || 'image',
        mediaUrl: firstMediaUrl,
        duration: mediaType === 'video' ? 15 : 5,
        isSensitive,
      };
    } else {
      body = {
        content,
        isSensitive,
        actorType: finalActorType,
        actorId: finalActorId,
        mediaUrls,
        cloudflareImageIds: cloudflareImageIds.filter(id => id && typeof id === 'string'),
        cloudflareVideoIds: cloudflareVideoIds.filter(id => id && typeof id === 'string'),
        mediaType,
        language,  // Include language for proper i18n support
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(body),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to create ${isStory ? 'story' : 'post'} (${response.status})`);
    }

    const rawPost = data.data?.post || data.data?.story || data.data || data.post || data.story || data;
    return normalizePost(rawPost);
  },

  // Conversations & messages
  getConversations: async (token) => {
    const response = await fetch(`${API_URL}/conversations`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      throw new Error(data?.error?.message || `Failed to load conversations (${response.status})`);
    }

    const rows = data?.data?.conversations || data?.conversations || data?.data || [];
    return rows.map((c) => {
      // Backend attaches participants[] with the other users in the conversation.
      const participant = (Array.isArray(c.participants) && c.participants[0]) || {};
      const lastMessage = c.last_message || '';
      const lastTimeSeconds = c.last_message_at;
      const timestamp = lastTimeSeconds
        ? new Date(lastTimeSeconds * 1000).toLocaleString()
        : '';
      const unread = (c.unread_count ?? 0) > 0;

      return {
        id: String(c.id),
        user: {
          id: participant.id,
          name: participant.name,
          username: participant.username || 'user',
        },
        lastMessage,
        timestamp,
        unread,
        messages: [], // messages are loaded on ChatScreen
      };
    });
  },

  getConversationMessages: async (token, conversationId) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load messages (${response.status})`);
    }

    const rows = data?.data?.messages || data?.messages || data?.data || [];
    const normalizeIsSenderSelf = (value) => {
      if (value === true || value === 'true' || value === 1 || value === '1') return true;
      if (value === false || value === 'false' || value === 0 || value === '0') return false;
      return null;
    };

    return rows.map((m) => ({
      id: String(m.id),
      fromUserId: m.sender_id || m.from_user_id,
      senderType: m.sender_type || 'user',
      senderName: m.name || null,
      senderUsername: m.username || null,
      senderAvatar: m.avatar_url || null,
      text: m.content || m.text || '',
      time: m.created_at,
      media: Array.isArray(m.mediaUrls) ? m.mediaUrls : [],
      isSenderSelf: normalizeIsSenderSelf(m.is_sender_self ?? m.isSenderSelf),
    }));
  },

  sendMessage: async (token, conversationId, content, actorType = null, actorId = null, mediaUrls = null) => {
    // Extract Cloudflare IDs from mediaUrls if present (both images and videos)
    const cloudflareImageIds = mediaUrls
      ?.filter(media => media.type === 'image' && media.cloudflareId)
      ?.map(media => media.cloudflareId) || [];

    const cloudflareVideoIds = mediaUrls
      ?.filter(media => media.type === 'video' && media.cloudflareId)
      ?.map(media => media.cloudflareId) || [];

    const body = {
      content,
      ...(actorType && actorId ? { actorType, actorId } : {}),
      ...(mediaUrls && mediaUrls.length ? { mediaUrls } : {}),
      ...(cloudflareImageIds.length > 0 ? { cloudflareImageIds } : {}),
      ...(cloudflareVideoIds.length > 0 ? { cloudflareVideoIds } : {}),
    };

    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(body),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to send message (${response.status})`);
    }

    const m = data.data?.message || data.data || data.message || data;
    return {
      id: String(m.id),
      fromUserId: m.sender_id || m.from_user_id,
      senderType: m.sender_type || 'user',
      text: m.content || m.text || '',
      time: m.created_at,
      media: Array.isArray(m.mediaUrls) ? m.mediaUrls : (Array.isArray(m.media_urls) ? m.media_urls : mediaUrls || []),
    };
  },

  deleteMessage: async (token, messageId) => {
    const response = await fetch(`${API_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete message (${response.status})`);
    }
    return true;
  },

  deleteConversation: async (token, conversationId) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete conversation (${response.status})`);
    }
    return true;
  },

  // Create a new conversation (1:1 or group)
  createConversation: async (token, participantIds, isGroup = false, name = null) => {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        participantIds,
        isGroup,
        ...(name ? { name } : {}),
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to create conversation (${response.status})`);
    }
    const conv = data.data?.conversation || data.data || data.conversation || data;
    return {
      id: String(conv.id),
      isGroup: Boolean(conv.is_group),
      name: conv.name || null,
    };
  },

  // Stories used by the mobile home header & StoryViewer
  getStoriesFeed: async (token) => {
    const response = await fetch(`${API_URL}/stories/feed`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      throw new Error(data?.error?.message || `Failed to load stories (${response.status})`);
    }

    // Backend returns storyGroups (grouped by actor), flatten to individual stories
    const storyGroups = data?.data?.storyGroups || data?.storyGroups || [];
    if (!Array.isArray(storyGroups)) {
      return [];
    }

    // Flatten story groups into individual stories with user info attached
    const stories = [];
    for (const group of storyGroups) {
      if (!Array.isArray(group.stories) || group.stories.length === 0) continue;

      for (const story of group.stories) {
        const ts = story.createdAt || story.created_at || story.timestamp;
        let timestamp = '';
        if (ts) {
          const ms = typeof ts === 'number' ? ts * 1000 : Date.parse(ts);
          if (!Number.isNaN(ms)) timestamp = new Date(ms).toLocaleString();
        }

        // Handle video stories: extract video ID and generate thumbnail
        const mediaUrl = story.mediaUrl || story.media_url || null;
        const mediaType = story.mediaType || story.media_type || 'image';
        let imageUrl = mediaUrl; // Default to media URL for images

        if (mediaType === 'video' && mediaUrl) {
          // Extract video ID from Cloudflare manifest URL
          // Format: https://customer-xxx.cloudflarestream.com/{videoId}/manifest/video.m3u8
          const videoIdMatch = mediaUrl.match(/cloudflarestream\.com\/([^/]+)\/manifest/);
          if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            // Extract subdomain for thumbnail URL
            const subdomainMatch = mediaUrl.match(/https:\/\/(customer-[^.]+\.cloudflarestream\.com)/);
            const subdomain = subdomainMatch ? subdomainMatch[1] : 'customer-virwr1ukt49zj3yu.cloudflarestream.com';
            // Generate thumbnail URL for feed display
            imageUrl = `https://${subdomain}/${videoId}/thumbnails/thumbnail.jpg`;
          }
        }

        stories.push({
          id: String(story.id),
          image: imageUrl,
          mediaUrl: mediaType === 'video' ? mediaUrl : null,
          mediaType,
          duration: story.duration || 5,
          expiresAt: story.expiresAt || story.expires_at || null,
          user: {
            id: group.actorId || group.actor_id,
            name: group.actorName || group.actor_name || group.username || 'User',
            username: group.username || 'user',
            avatar: group.avatarUrl || group.avatar_url || null,
            verified: group.verified || false,
            type: group.actorType || group.actor_type || null,
          },
          isAd: group.isAd || false,
          ctaText: story.ctaText,
          ctaUrl: story.ctaUrl,
          viewedByMe: story.viewedByMe || false,
          timestamp,
        });
      }
    }

    return stories.filter((story) => story.image);
  },

  // Create a new story
  createStory: async (token, payload) => {
    const { actorType, actorId, mediaType, mediaUrl, duration, isSensitive, content } = payload;

    const response = await fetch(`${API_URL}/stories`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        actorType,
        actorId,
        mediaType,
        mediaUrl,
        duration: duration || (mediaType === 'video' ? 15 : 5),
        isSensitive: Boolean(isSensitive),
        content: content || '',
      }),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to create story (${response.status})`);
    }

    return data?.data || data;
  },

  // Mark a story as viewed
  viewStory: async (token, storyId) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(storyId)}/view`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({}),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to mark story as viewed (${response.status})`);
    }

    return true;
  },

  // Delete a story
  deleteStory: async (token, storyId) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(storyId)}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to delete story (${response.status})`);
    }

    return true;
  },

  // Get stories for a specific user
  getUserStories: async (token, username) => {
    const response = await fetch(`${API_URL}/stories/${encodeURIComponent(username)}`, {
      headers: jsonHeaders(token),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to get user stories (${response.status})`);
    }

    return data?.data || { user: null, stories: [] };
  },

  // Bookmarks
  getBookmarks: async (token) => {
    const response = await fetch(`${API_URL}/bookmarks`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load bookmarks (${response.status})`);
    }

    const rows = data?.data?.bookmarks || data?.bookmarks || data?.data || [];
    return rows.map(normalizePost).filter(Boolean);
  },

  getUserBookmarks: async (token, username) => {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/bookmarks`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load user bookmarks (${response.status})`);
    }

    const rows = data?.data?.bookmarks || data?.bookmarks || data?.data || [];
    return rows.map(normalizePost).filter(Boolean);
  },

  addBookmark: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}/bookmarks`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to add bookmark (${response.status})`);
    }
  },

  removeBookmark: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}/bookmarks`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to remove bookmark (${response.status})`);
    }
  },

  // Blocks
  getBlocks: async (token) => {
    const response = await fetch(`${API_URL}/blocks`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      throw new Error(data?.error?.message || `Failed to load blocks (${response.status})`);
    }

    const rows = data?.data?.blocks || data?.blocks || data?.data || [];
    return rows.map((row) => ({
      id: String(row.blocked_id || row.id),
      type: row.blocked_type || row.type || 'user',
      name: row.name || row.blocked_name || 'User',
      username: row.username || row.blocked_username || 'user',
    }));
  },

  // Follow helpers
  followUser: async (token, userId) => {
    const response = await fetch(`${API_URL}/follows`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ targetType: 'user', targetId: userId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to follow user (${response.status})`);
    }
  },

  unfollowUser: async (token, userId) => {
    const response = await fetch(`${API_URL}/follows`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
      body: JSON.stringify({ targetType: 'user', targetId: userId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to unfollow user (${response.status})`);
    }
  },


  // User profile & relationships
  getUserProfile: async (token, username) => {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load user (${response.status})`);
    }

    const u = data?.data?.user || data?.user || data?.data || data;
    const stats = u.stats || {};
    return {
      id: String(u.id),
      name: u.name || u.display_name || u.username || username,
      username: u.username || username,
      bio: u.bio || '',
      avatarUrl: u.avatarUrl || u.avatar_url || null,
      coverUrl: u.coverUrl || u.cover_url || null,
      followers:
        stats.followers ??
        u.followers_count ??
        u.followers ??
        0,
      following:
        stats.following ??
        u.following_count ??
        u.following ??
        0,
    };
  },

  getUserFeed: async (token, username, actorType = null, actorId = null) => {
    const params = new URLSearchParams();
    if (actorType && actorId) {
      params.set('actorType', actorType);
      params.set('actorId', actorId);
    }
    const url = params.toString()
      ? `${API_URL}/users/${encodeURIComponent(username)}/feed?${params.toString()}`
      : `${API_URL}/users/${encodeURIComponent(username)}/feed`;
    const response = await fetch(url, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load user feed (${response.status})`);
    }
    const rows = data?.data?.posts || data?.posts || data?.data || [];
    return rows.map(normalizePost).filter(Boolean);
  },

  getUserFollowers: async (token, username) => {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/followers`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load followers (${response.status})`);
    }
    const rows = data?.data?.followers || data?.followers || data?.data || [];
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      username: r.username,
      type: r.type || 'user',
      avatarUrl: r.avatar_url || null,
    }));
  },

  getUserFollowing: async (token, username) => {
    const response = await fetch(`${API_URL}/users/${encodeURIComponent(username)}/following`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load following (${response.status})`);
    }
    const rows = data?.data?.following || data?.following || data?.data || [];
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      username: r.username,
      type: r.type || 'user',
      avatarUrl: r.avatar_url || null,
    }));
  },

  // Update current authenticated user's profile (name, bio, avatar, cover, etc.)
  updateUserProfile: async (token, updates) => {
    const response = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(updates),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to update profile (${response.status})`);
    }
    const u = data?.data?.user || data?.data || data;
    return u;
  },

  // Search with pagination support
  searchAll: async (token, query, options = {}) => {
    const params = new URLSearchParams({
      q: query,  // URLSearchParams handles encoding automatically
      type: options.type || 'all',
      limit: String(options.limit || 20),
    });

    if (options.cursor) {
      params.set('cursor', options.cursor);
    }

    if (options.sort) {
      params.set('sort', options.sort);
    }

    const response = await fetch(`${API_URL}/search?${params}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to search (${response.status})`);
    }
    const root = data?.data || data || {};
    const users = (root.users || []).map((u) => ({
      id: String(u.id),
      name: u.name || u.display_name || u.username,
      username: u.username,
    }));
    const posts = (root.posts || []).map(normalizePost).filter(Boolean);
    const hashtags = (root.hashtags || []).map((h) => ({
      tag: h.tag || h.hashtag || h.name,
      postCount: h.post_count ?? 0,
    }));
    return {
      users,
      posts,
      hashtags,
      pagination: root.pagination || { hasMore: false, nextCursor: null },
    };
  },

  // Search specific types with pagination
  searchUsers: async (token, query, options = {}) => {
    const result = await api.searchAll(token, query, { ...options, type: 'users' });
    return { users: result.users, pagination: result.pagination };
  },

  searchPosts: async (token, query, options = {}) => {
    const result = await api.searchAll(token, query, { ...options, type: 'posts' });
    return { posts: result.posts, pagination: result.pagination };
  },

  searchHashtags: async (token, query, options = {}) => {
    const result = await api.searchAll(token, query, { ...options, type: 'hashtags' });
    return { hashtags: result.hashtags, pagination: result.pagination };
  },

  getSuggestedUsers: async (token, limit = 20) => {
    // For now we reuse the search endpoint with a broad single-letter query
    // just to get a reasonable set of accounts for Explore suggestions.
    // This keeps backend changes minimal for local testing.
    const q = encodeURIComponent('a');
    const response = await fetch(`${API_URL}/search?q=${q}&type=users&limit=${limit}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      throw new Error(
        data?.error?.message || `Failed to load suggested users (${response.status})`,
      );
    }
    const root = data?.data || data || {};
    const usersOnly = (root.users || []).map((u) => ({
      id: String(u.id),
      name: u.name || u.display_name || u.username || 'User',
      username: u.username || '',
      bio: u.bio || '',
      avatar: u.avatar_url || null,
    }));
    return usersOnly;
  },

  searchPostsByHashtag: async (token, tag) => {
    const q = encodeURIComponent(`#${tag.replace(/^#/, '')}`);
    const response = await fetch(`${API_URL}/search?q=${q}&type=posts&limit=50`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load hashtag posts (${response.status})`);
    }
    const rows = data?.data?.posts || data?.posts || data?.data || [];
    return rows.map(normalizePost).filter(Boolean);
  },

  // Single post & comments
  getPost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load post (${response.status})`);
    }
    const raw = data?.data?.post || data?.data || data?.post || data;
    return normalizePost(raw);
  },

  getPostComments: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load comments (${response.status})`);
    }
    const rows = data?.data?.comments || data?.comments || data?.data || [];
    return rows.map((c) => {
      // Parse media_urls if it's a JSON string (backend returns as mediaUrls after camelCase conversion)
      let mediaUrls = c.mediaUrls || c.media_urls;
      if (typeof mediaUrls === 'string') {
        try {
          mediaUrls = JSON.parse(mediaUrls);
        } catch {
          mediaUrls = null;
        }
      }
      // Format timestamp like posts do (check camelCase first, then snake_case)
      const ts = c.createdAt || c.created_at;
      let createdAt = 'now';
      if (ts) {
        const ms = typeof ts === 'number' ? ts * 1000 : Date.parse(ts);
        if (!Number.isNaN(ms)) {
          createdAt = new Date(ms).toLocaleString();
        }
      }

      const { name: authorName, username: authorUsername } = extractCommentAuthor(c);

      return {
        id: String(c.id),
        authorName,
        authorUsername,
        text: c.content || c.text || '',
        createdAt,
        likes: extractCount(c, 'likesCount', 'likes_count', 'likes'),
        actorId: c.actorId || c.actor_id,
        actorType: c.actorType || c.actor_type,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : null,
        image: Array.isArray(mediaUrls) && mediaUrls[0]?.url ? mediaUrls[0].url : null,
      };
    });
  },

  addComment: async (token, postId, text, actorType, actorId, mediaUrls = null) => {
    // Extract Cloudflare IDs from mediaUrls if present (both images and videos)
    const cloudflareImageIds = mediaUrls
      ?.filter(media => media.type === 'image' && media.cloudflareId)
      ?.map(media => media.cloudflareId) || [];

    const cloudflareVideoIds = mediaUrls
      ?.filter(media => media.type === 'video' && media.videoId)
      ?.map(media => media.videoId) || [];

    const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        content: text,
        actorType,
        actorId,
        mediaUrls,
        ...(cloudflareImageIds.length > 0 ? { cloudflareImageIds } : {}),
        ...(cloudflareVideoIds.length > 0 ? { cloudflareVideoIds } : {}),
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to add comment (${response.status})`);
    }
    const c = data.data?.comment || data.data || data.comment || data;

    // Format timestamp like posts do (check camelCase first, then snake_case)
    const ts = c.createdAt || c.created_at;
    let createdAt = 'now';
    if (ts) {
      const ms = typeof ts === 'number' ? ts * 1000 : Date.parse(ts);
      if (!Number.isNaN(ms)) {
        createdAt = new Date(ms).toLocaleString();
      }
    }

    // Parse media_urls if present (backend returns as mediaUrls after camelCase conversion)
    let mediaUrlsParsed = c.mediaUrls || c.media_urls;
    if (typeof mediaUrlsParsed === 'string') {
      try {
        mediaUrlsParsed = JSON.parse(mediaUrlsParsed);
      } catch {
        mediaUrlsParsed = null;
      }
    }

    const { name: authorName, username: authorUsername } = extractCommentAuthor(c);

    return {
      id: String(c.id),
      authorName: authorName !== 'User' ? authorName : 'You',
      authorUsername: authorUsername || 'you',
      text: c.content || c.text || '',
      createdAt,
      likes: extractCount(c, 'likesCount', 'likes_count', 'likes'),
      actorId: c.actorId || c.actor_id,
      actorType: c.actorType || c.actor_type,
      mediaUrls: Array.isArray(mediaUrlsParsed) ? mediaUrlsParsed : null,
    };
  },

  deleteComment: async (token, commentId) => {
    const response = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete comment (${response.status})`);
    }
  },

  // Likes & shares
  togglePostLike: async (token, postId, liked, actorType, actorId) => {
    const method = liked ? 'POST' : 'DELETE';
    const response = await fetch(`${API_URL}/posts/${postId}/likes`, {
      method,
      headers: jsonHeaders(token),
      body: JSON.stringify({ actorType, actorId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to toggle like (${response.status})`);
    }
  },

  // Reels feed for mobile ReelsScreen
  getReelsFeed: async (token, forceNonSensitive = false, cursor = null) => {
    const params = new URLSearchParams({ limit: '20' });
    if (forceNonSensitive) {
      params.append('force_non_sensitive', '1');
    }
    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = `${API_URL}/reels/feed?${params.toString()}`;
    if (__DEV__) console.warn('Fetching reels from:', url);

    const response = await fetch(url, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);

    if (__DEV__) console.warn('Reels response status:', response.status, 'data:', data);

    if (!response.ok || !data?.success) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      const errorMsg = data?.error?.message || data?.error || `Failed to load reels (${response.status})`;
      if (__DEV__) console.error('Reels error:', errorMsg, 'Full response:', data);
      throw new Error(errorMsg);
    }

    const root = data.data || data || {};
    const rows = root.reels || [];
    const pagination = root.pagination || { hasMore: false, nextCursor: null };

    // Flatten videos: each video from a post becomes a separate reel item
    const flattenedReels = [];
    rows.forEach((post) => {
      // Check if this item is an advertisement using helper (consistent camelCase check)
      if (isAdPost(post)) {
        flattenedReels.push({
          id: String(post.id || `ad-${Math.random().toString(36).slice(2)}`),
          isAd: true,
          adType: post.adType || post.ad_type,
          mediaUrl: post.mediaUrl || post.media_url || post.contentUrl || post.content_url || post.thumbnailUrl || post.thumbnail_url || null,
          thumbnail: post.thumbnailUrl || post.thumbnail_url || null,
          description: post.description || post.text || '',
          ctaText: post.ctaText || post.cta_text || 'Learn More',
          url: post.url || post.click_url || post.ctaUrl || post.cta_url || post.landingUrl || null,
          duration: post.duration || 15,
          sdkProvider: post.sdkProvider || post.sdk_provider,
          sdkAdUnitId: post.sdkAdUnitId || post.sdk_ad_unit_id,
          sdkConfig: post.sdkConfig || post.sdk_config,
        });
        return;
      }

      const videos = post.videos || [];
      // Extract actor type/id - backend now returns camelCase first, with fallback to snake_case
      const actorType = post.actorType || post.actor_type;
      const actorId = post.actorId || post.actor_id;
      const actorName = post.actorName || post.actor_name;
      const likesCount = post.likesCount ?? post.likes_count ?? 0;
      const commentsCount = post.commentsCount ?? post.comments_count ?? 0;
      const viewsCount = post.viewsCount ?? post.views_count ?? 0;
      const likedByMe = post.likedByMe ?? post.liked_by_me ?? 0;
      const isSensitive = post.isSensitive ?? post.is_sensitive;

      // If post has multiple videos, create a reel item for each
      if (Array.isArray(videos) && videos.length > 0) {
        videos.forEach((video, videoIndex) => {
          flattenedReels.push({
            id: `${post.id}_${videoIndex}`, // Unique ID combining post ID and video index
            postId: post.postId || post.post_id || post.id, // Reference to original post (now camelCase from backend)
            user: {
              name: actorName || post.username || 'User',
              username: post.username || 'user',
              id: actorId,
            },
            url: video.url,
            thumbnail: video.thumbnail || null,
            caption: post.caption || '',
            likes: likesCount,
            comments: commentsCount,
            views: viewsCount,
            liked_by_me: likedByMe,
            is_sensitive: isSensitive,
            actorType,
            actorId,
            videoIndex, // Position in the post's video list
            totalVideos: videos.length, // Total videos in this post
          });
        });
      } else if (post.video_url) {
        // Fallback for old format single video
        flattenedReels.push({
          id: String(post.id),
          postId: post.postId || post.post_id || post.id,
          user: {
            name: actorName || post.username || 'User',
            username: post.username || 'user',
            id: actorId,
          },
          url: post.video_url,
          thumbnail: post.thumbnail_url || null,
          caption: post.caption || '',
          likes: likesCount,
          comments: commentsCount,
          views: viewsCount,
          liked_by_me: likedByMe,
          is_sensitive: isSensitive,
          actorType,
          actorId,
          videoIndex: 0,
          totalVideos: 1,
        });
      }
    });

    return {
      reels: flattenedReels,
      pagination,
    };
  },

  // Like a reel
  likeReel: async (token, reelId, { actorType = 'user', actorId }) => {
    const response = await fetch(`${API_URL}/reels/${reelId}/like`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ actorType, actorId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to like reel (${response.status})`);
    }
    return data;
  },

  // Unlike a reel
  unlikeReel: async (token, reelId, { actorType = 'user', actorId }) => {
    const response = await fetch(`${API_URL}/reels/${reelId}/like`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
      body: JSON.stringify({ actorType, actorId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to unlike reel (${response.status})`);
    }
    return data;
  },

  // Record reel view
  viewReel: async (token, reelId) => {
    const response = await fetch(`${API_URL}/reels/${reelId}/view`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({}),
    });
    // Silently fail for view tracking - don't throw on error
    const data = await parseJsonSafe(response);
    return data;
  },

  // Get reel comments
  getReelComments: async (token, reelId, cursor = null) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`${API_URL}/reels/${reelId}/comments?${params.toString()}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to load comments (${response.status})`);
    }
    return data.data || {};
  },

  // Add reel comment
  addReelComment: async (token, reelId, { actorType = 'user', actorId, content, parentId = null }) => {
    const response = await fetch(`${API_URL}/reels/${reelId}/comments`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ actorType, actorId, content, parentId }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to add comment (${response.status})`);
    }
    return data.data;
  },

  sharePost: async (token, postId, actorType, actorId, comment = '') => {
    const response = await fetch(`${API_URL}/shares`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ actorType, actorId, postId, comment }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to share post (${response.status})`);
    }
  },

  // Legacy media upload helpers - redirect to /media/* endpoints (no CSRF)
  // DEPRECATED: Use getImageUploadURL and getVideoUploadURL instead
  getImageUploadUrl: async (token) => {
    // Redirect to the correct /media/* endpoint (no CSRF protection for mobile)
    const response = await fetch(`${API_URL}/media/images/upload-url`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      const errorMsg = data?.error?.message || data?.error || `Failed to get image upload URL (${response.status})`;
      throw new Error(errorMsg);
    }
    const d = data.data || {};
    return { uploadURL: d.uploadURL, id: d.id };
  },

  getVideoUploadUrl: async (token, _maxDurationSeconds = 180) => {
    // Redirect to the correct /media/* endpoint (no CSRF protection for mobile)
    const response = await fetch(`${API_URL}/media/videos/upload-url`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      const errorMsg = data?.error?.message || data?.error || `Failed to get video upload URL (${response.status})`;
      throw new Error(errorMsg);
    }
    const d = data.data || {};
    // Note: video service returns 'uid' instead of 'id'
    return { uploadURL: d.uploadURL, id: d.id || d.uid };
  },

  blockEntity: async (token, entity) => {
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        blockedType: entity.type,
        blockedId: entity.id,
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      const message = data?.error?.message || '';
      // Treat "Already blocked" as a non-fatal condition
      if (response.status === 400 && /already blocked/i.test(message)) {
        return;
      }
      throw new Error(message || `Failed to block entity (${response.status})`);
    }
  },

  unblockEntity: async (token, entity) => {
    const response = await fetch(`${API_URL}/blocks`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        blockedType: entity.type,
        blockedId: entity.id,
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      const message = data?.error?.message || '';
      // Treat "Not blocked" as non-fatal
      if (response.status === 400 && /not blocked/i.test(message)) {
        return;
      }
      throw new Error(message || `Failed to unblock entity (${response.status})`);
    }
  },

  // Register Expo push token for mobile device
  registerExpoPushToken: async (token, expoPushToken) => {
    const response = await fetch(`${API_URL}/push/expo/subscribe`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ token: expoPushToken }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || data?.success === false) {
      throw new Error(data?.error?.message || `Failed to register push token (${response.status})`);
    }
    return true;
  },

  // Notifications
  getNotifications: async (token, limit = 20, cursor = null) => {
    const params = new URLSearchParams();
    params.append('limit', limit);
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(`${API_URL}/notifications?${params}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load notifications (${response.status})`);
    }

    const rows = data?.data?.notifications || data?.notifications || data?.data || [];
    const pagination = data?.data?.pagination || data?.pagination || { hasMore: false, nextCursor: null };

    const notifications = rows.map((n) => {
      // Backend now returns actors array with denormalized data
      const actor = Array.isArray(n.actors) && n.actors.length > 0 ? n.actors[0] : null;
      return {
        id: String(n.id),
        type: n.type || 'system',
        message: n.message || n.title || n.content || '',
        createdAt: n.createdAt || n.created_at || n.timestamp,
        targetType: n.targetType || n.target_type || null,
        targetId: n.targetId || n.target_id || null,
        postId: n.targetType === 'post' ? n.targetId : (n.post_id || null),
        userId: actor?.id || n.userId || n.user_id || null,
        actorId: actor?.id || n.actorId || n.actor_id || null,
        actorName: actor?.name || null,
        actorUsername: actor?.username || null,
        actorAvatar: actor?.avatar || null,
        read: Boolean(n.read || n.is_read || n.read_at),
      };
    });

    return { notifications, pagination };
  },

  getUnreadNotificationCount: async (token) => {
    const response = await fetch(`${API_URL}/notifications/count`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return 0; // Fail silently for count
    }
    return data?.data?.unreadCount || 0;
  },

  markNotificationRead: async (token, id) => {
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to mark notification read (${response.status})`);
    }
  },

  markAllNotificationsRead: async (token) => {
    const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to mark all notifications read (${response.status})`);
    }
  },

  // User data export
  exportUserData: async (token) => {
    const response = await fetch(`${API_URL}/users/me/export`, {
      method: 'GET',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to export user data (${response.status})`);
    }
    return data;
  },

  // Account deletion
  deleteAccount: async (token, password) => {
    const response = await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
      body: JSON.stringify({ password }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete account (${response.status})`);
    }
    return data;
  },

  // Post interactions
  likePost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/likes`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to like post (${response.status})`);
    }
    return data;
  },

  unlikePost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/likes`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to unlike post (${response.status})`);
    }
    return data;
  },

  bookmarkPost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/bookmarks`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to bookmark post (${response.status})`);
    }
    return data;
  },

  unbookmarkPost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/bookmarks`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to unbookmark post (${response.status})`);
    }
    return data;
  },

  deletePost: async (token, postId) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete post (${response.status})`);
    }
    return data;
  },

  updatePost: async (token, postId, updates) => {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(updates),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to update post (${response.status})`);
    }
    const rawPost = data.data?.post || data.data || data.post || data;
    return normalizePost(rawPost);
  },


  reportPost: async (token, targetType, targetId, category, description = '') => {
    const normalizedCategory = (() => {
      switch (category) {
      case 'hate_speech':
        return 'harassment';
      case 'false_information':
        return 'misinformation';
      case 'nudity':
        return 'nsfw';
      default:
        return category || 'other';
      }
    })();
    const response = await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        targetType,
        targetId,
        category: normalizedCategory,
        description,
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to report (${response.status})`);
    }
    return data;
  },

  // ===== AD MANAGEMENT APIS =====

  // Get eligible ads for a position
  getEligibleAds: async (token, position, userLocation = null) => {
    const placementMap = {
      feed: 'feeds',
      feeds: 'feeds',
      reel: 'reels',
      reels: 'reels',
      story: 'stories',
      stories: 'stories',
      banner: 'feeds',
      search: 'search',
    };
    const normalizedPlacement = placementMap[position] || position;
    const params = new URLSearchParams({ placement: normalizedPlacement }); // Backend expects 'placement' parameter
    if (userLocation) params.append('location', userLocation);

    const response = await fetch(`${API_URL}/ads/eligible?${params}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load ads (${response.status})`);
    }
    return data.data?.ads || [];
  },

  // Track ad impression
  trackAdImpression: async (token, adId, position, duration = null) => {
    const response = await fetch(`${API_URL}/ads/${encodeURIComponent(adId)}/impression`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        position,
        duration,
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to track impression (${response.status})`);
    }
    return data;
  },

  // Track ad click
  trackAdClick: async (token, adId, position) => {
    const response = await fetch(`${API_URL}/ads/${encodeURIComponent(adId)}/click`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        position,
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to track click (${response.status})`);
    }
    return data;
  },

  // Admin: Create new ad
  createAd: async (token, adData) => {
    const response = await fetch(`${API_URL}/admin/ads`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(adData),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to create ad (${response.status})`);
    }
    return data;
  },

  // Admin: Get all ads
  getAds: async (token, position = null, status = 'active') => {
    const params = new URLSearchParams({ status });
    if (position) params.append('position', position);

    const response = await fetch(`${API_URL}/admin/ads?${params}`, {
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Failed to load ads (${response.status})`);
    }
    return data.data?.ads || [];
  },

  // Admin: Update ad
  updateAd: async (token, adId, updates) => {
    const response = await fetch(`${API_URL}/admin/ads/${encodeURIComponent(adId)}`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify(updates),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to update ad (${response.status})`);
    }
    return data;
  },

  // Admin: Delete ad
  deleteAd: async (token, adId) => {
    const response = await fetch(`${API_URL}/admin/ads/${encodeURIComponent(adId)}`, {
      method: 'DELETE',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to delete ad (${response.status})`);
    }
    return data;
  },

  // Admin: Toggle ad status (active/paused)
  toggleAdStatus: async (token, adId) => {
    const response = await fetch(`${API_URL}/admin/ads/${encodeURIComponent(adId)}/toggle`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to toggle ad status (${response.status})`);
    }
    return data;
  },

  // Admin: Moderate ad (approve/reject/flag)
  moderateAd: async (token, adId, action) => {
    const response = await fetch(`${API_URL}/admin/ads/${encodeURIComponent(adId)}/moderate`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ action }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to moderate ad (${response.status})`);
    }
    return data;
  },

  // Admin: Search trending social media content
  searchTrendingContent: async (token, params = {}) => {
    const payload = {
      platform: params.platform || 'twitter',
      query: params.query,
      location: params.location || 'global',
      limit: params.limit || 100,
      language: params.language,
      minEngagement: params.minEngagement,
    };

    const response = await fetch(`${API_URL}/admin/social-media/search/trending`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to search trending content (${response.status})`);
    }
    return data.data || {};
  },

  // Admin: Import selected social media content
  importSelectedContent: async (token, posts, platform = 'twitter') => {
    const normalizedPlatform = typeof platform === 'string'
      ? platform
      : (platform?.platform || 'twitter');
    const normalizedPosts = Array.isArray(posts)
      ? posts
      : Array.isArray(platform?.items)
        ? platform.items
        : [];

    const response = await fetch(`${API_URL}/admin/social-media/import/selected`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ platform: normalizedPlatform, posts: normalizedPosts }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error?.message || `Failed to import content (${response.status})`);
    }
    return data.data || {};
  },

  // ===== MEDIA UPLOAD APIS =====

  // Get direct upload URL for images
  /**
   * Get direct upload URL for images from Cloudflare.
   * Backend (MediaController) returns via successResponse/toCamelCase:
   * { success: true, data: { uploadURL, id, deliveryUrl } }
   */
  getImageUploadURL: async (token) => {
    const response = await fetch(`${API_URL}/media/images/upload-url`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      // Handle both object and string error formats
      const errorMsg = data?.error?.message || data?.error || data?.details || `Failed to get upload URL (${response.status})`;
      if (__DEV__) console.error('Image upload URL error:', errorMsg, data);
      throw new Error('Failed to get image upload URL');
    }
    if (!data.data?.uploadURL) {
      if (__DEV__) console.error('Missing uploadURL in response:', data);
      throw new Error('Server returned invalid upload URL');
    }
    // Return in format expected by callers: { uploadURL, id, deliveryUrl }
    return {
      uploadURL: data.data?.uploadURL,
      id: data.data?.id,
      deliveryUrl: data.data?.deliveryUrl || null,
    };
  },

  /**
   * Get direct upload URL for videos from Cloudflare Stream.
   * Backend (MediaController) returns via successResponse/toCamelCase:
   * { success: true, data: { uploadURL, id (from uid), playbackUrl, streamSubdomain } }
   */
  // Get direct upload URL for videos
  getVideoUploadURL: async (token, maxDurationSeconds = 3600) => {
    const response = await fetch(`${API_URL}/media/videos/upload-url`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ maxDurationSeconds }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.success) {
      // Handle both object and string error formats
      const errorMsg = data?.error?.message || data?.error || data?.details || `Failed to get upload URL (${response.status})`;
      if (__DEV__) console.error('Video upload URL error:', errorMsg, data);
      throw new Error('Failed to get video upload URL');
    }
    if (!data.data?.uploadURL) {
      if (__DEV__) console.error('Missing uploadURL in response:', data);
      throw new Error('Server returned invalid upload URL');
    }
    // Return in format expected by callers: { uploadURL, id, playbackUrl, streamSubdomain }
    // Note: video service returns 'uid' or 'id' depending on endpoint
    return {
      uploadURL: data.data?.uploadURL,
      id: data.data?.id || data.data?.uid,
      playbackUrl: data.data?.playbackUrl || null,
      streamSubdomain: data.data?.streamSubdomain || null,
    };
  },

  // Upload image directly to Cloudflare (React Native/Expo)
  uploadImage: async (uploadURL, imageUri, mimeType = 'image/jpeg') => {
    const formData = new FormData();

    // For React Native, we need to create a file object from the URI
    const fileName = `photo_${Date.now()}.jpg`;
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: mimeType,
    });

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header - let fetch set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response;
  },

  // Upload video directly to Cloudflare (React Native/Expo)
  uploadVideo: async (uploadURL, videoUri, mimeType = 'video/mp4') => {
    const formData = new FormData();

    // For React Native, we need to create a file object from the URI
    const fileName = `video_${Date.now()}.mp4`;
    formData.append('file', {
      uri: videoUri,
      name: fileName,
      type: mimeType,
    });

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type header - let fetch set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response;
  },

};

export default api;

