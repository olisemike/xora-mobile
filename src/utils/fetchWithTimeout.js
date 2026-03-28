/**
 * Fetch with timeout utility
 * Wraps fetch API calls with configurable timeout
 */

const DEFAULT_TIMEOUT = 10000; // 10 seconds

export const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

/**
 * Retry utility for failed requests
 * Retries a function up to maxRetries times with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  initialDelay = 1000,
  backoffMultiplier = 2,
) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(backoffMultiplier, i);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Example usage:
 *
 * // With timeout
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * }, 5000);
 *
 * // With retry
 * const data = await retryWithBackoff(async () => {
 *   const response = await fetchWithTimeout('https://api.example.com/data');
 *   return response.json();
 * });
 */
