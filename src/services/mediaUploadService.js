/**
 * Media Upload Service
 * Handles media uploads with progress tracking and validation
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validate file size
 * @param {number} fileSizeBytes
 * @returns {object} { valid: boolean, error?: string }
 */
export const validateFileSize = (fileSizeBytes) => {
  if (fileSizeBytes > MAX_FILE_SIZE) {
    const sizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large. Maximum size is ${sizeMB}MB`,
    };
  }
  return { valid: true };
};

/**
 * Get media type from file extension
 * @param {string} filename
 * @returns {'image' | 'video' | 'unknown'}
 */
export const getMediaType = (filename) => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop()?.toLowerCase();

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExts = ['mp4', 'mov', 'webm', 'avi', 'mkv'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return 'unknown';
};

/**
 * Upload media file to Cloudflare with progress tracking
 * @param {string} uploadURL - Cloudflare upload URL
 * @param {object} file - { uri, name, type }
 * @param {Function} onProgress - Callback: (progress: 0-100) => {}
 * @returns {Promise<object>} Uploaded media object
 */
export const uploadMediaFile = (uploadURL, file, onProgress = () => {}) => {
  // Validate before upload
  const validation = validateFileSize(file.size);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg'),
  });

  // Create XMLHttpRequest to track progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        if (xhr.status !== 200) {
          throw new Error(`Upload failed: ${xhr.statusText}`);
        }

        // Handle empty response (Cloudflare Stream returns empty body on success)
        let result = null;
        if (xhr.responseText && xhr.responseText.trim()) {
          result = JSON.parse(xhr.responseText);
        }

        // Extract URL from response, or return empty object if no response body
        const finalUrl =
          result?.result?.variants?.[0] ||
          result?.result?.url ||
          result?.result?.id ||
          null; // Cloudflare Stream returns empty body, caller handles URL construction

        if (!file.cloudflareId && result?.result?.id) {
          file.cloudflareId = result.result.id;
        }

        resolve({
          type: file.type,
          url: finalUrl,
          name: file.name,
          cloudflareId: file.cloudflareId || result?.result?.id || null,
        });
      } catch (err) {
        reject(err);
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', uploadURL);
    xhr.send(formData);
  });
};

/**
 * Get file size from URI (mobile)
 * Note: React Native doesn't provide direct file size access from URI
 * This is a helper - actual size checking happens during upload attempt
 */
export const estimateFileSize = (_uri) => {
  // This would need native module in production
  // For now, return a placeholder
  return null;
};

export default {
  validateFileSize,
  getMediaType,
  uploadMediaFile,
  MAX_FILE_SIZE,
};
