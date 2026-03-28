/**
 * Sentry Error Logging Utility
 *
 * Centralizes error logging to Sentry with helpful context
 * Usage:
 *   import { logError, logMessage, setUserContext } from './utils/errorLogger';
 */

import * as Sentry from '@sentry/react-native';

/**
 * Log an error to Sentry with context
 * @param {Error} error - The error object
 * @param {object} context - Additional context
 * @param {string} context.feature - Feature name (e.g., 'auth', 'posts')
 * @param {string} context.action - Action being performed
 * @param {object} context.extra - Any extra data
 */
export const logError = (error, context = {}) => {
  if (__DEV__) {
    return;
  }

  const { feature, action, extra = {} } = context;

  Sentry.captureException(error, {
    tags: {
      feature: feature || 'unknown',
      action: action || 'unknown',
    },
    extra: {
      ...extra,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Log a message to Sentry (non-error)
 * @param {string} message - The message to log
 * @param {string} level - Severity level: 'info', 'warning', 'error'
 * @param {object} extra - Additional data
 */
export const logMessage = (message, level = 'info', extra = {}) => {
  if (__DEV__) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: {
      ...extra,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Mask email address for privacy in error logs
 * @param {string} email - Email address to mask
 * @returns {string|undefined} Masked email or undefined if invalid
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return undefined;
  const [name, domain] = email.split('@');
  if (!name || !domain) return undefined;
  const safeName = name.length <= 2 ? `${name[0]}*` : `${name[0]}***${name[name.length - 1]}`;
  return `${safeName}@${domain}`;
};

export const setUserContext = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: maskEmail(user.email),
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for debugging
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (e.g., 'navigation', 'api', 'user-action')
 * @param {object} data - Additional data
 */
export const addBreadcrumb = (message, category = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Example usage:
 *
 * // In AuthContext after login:
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   username: user.username
 * });
 *
 * // When catching an error:
 * try {
 *   await api.createPost(data);
 * } catch (error) {
 *   logError(error, {
 *     feature: 'posts',
 *     action: 'create_post',
 *     extra: { postId: data.id, hasMedia: !!data.media }
 *   });
 *   throw error;
 * }
 *
 * // On logout:
 * clearUserContext();
 */
