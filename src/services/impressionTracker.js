
/**
 * Impression Tracker - Manages when ads should count as impressions
 * Rules:
 * - Feed ads: Impression when 50%+ visible for 1+ second
 * - Story ads: Impression when viewed (auto-tracked)
 * - Reel ads: Impression when 50%+ watched
 * - Banner ads: Impression when visible for 2+ seconds
 */
class ImpressionTracker {
  constructor() {
    this.activeImpressions = {}; // Track active ad impressions
    this.impressionThresholds = {
      feed: { visibilityPercent: 0.5, durationMs: 1000 },
      story: { immediate: true },
      reel: { watchPercent: 0.5 },
      banner: { visibilityPercent: 0.5, durationMs: 2000 },
    };
    this.trackedImpressions = new Set(); // Prevent duplicate impressions
  }

  /**
   * Start tracking feed ad impression
   */
  startTrackingFeedAd(adId, onImpressionReady) {
    if (this.trackedImpressions.has(`${adId}_feed`)) return;

    const tracker = {
      adId,
      type: 'feed',
      startTime: Date.now(),
      visibilityPercent: 0,
      onImpressionReady,
    };

    this.activeImpressions[adId] = tracker;
    return adId;
  }

  /**
   * Update feed ad visibility (0-100)
   */
  updateFeedAdVisibility(adId, visibilityPercent) {
    const tracker = this.activeImpressions[adId];
    if (!tracker || tracker.type !== 'feed') return;
    if (this.trackedImpressions.has(`${adId}_feed`)) return;

    tracker.visibilityPercent = visibilityPercent;

    const threshold = this.impressionThresholds.feed;
    const timeElapsed = Date.now() - tracker.startTime;

    // Check if impression criteria met
    if (
      visibilityPercent >= threshold.visibilityPercent * 100 &&
      timeElapsed >= threshold.durationMs &&
      !tracker.impressionSent
    ) {
      tracker.impressionSent = true;
      this.trackedImpressions.add(`${adId}_feed`);
      tracker.onImpressionReady?.(adId);
    }
  }

  /**
   * Track story ad impression (immediate)
   */
  trackStoryAdImpression(adId, onImpressionReady) {
    if (this.trackedImpressions.has(`${adId}_story`)) return;

    this.activeImpressions[adId] = {
      adId,
      type: 'story',
      impressionSent: true,
    };
    this.trackedImpressions.add(`${adId}_story`);
    onImpressionReady?.(adId);
  }

  /**
   * Start tracking reel ad watch time
   */
  startTrackingReelAd(adId, totalDurationMs, onImpressionReady) {
    if (this.trackedImpressions.has(`${adId}_reel`)) return;

    this.activeImpressions[adId] = {
      adId,
      type: 'reel',
      startTime: Date.now(),
      totalDurationMs,
      watchedMs: 0,
      onImpressionReady,
    };
  }

  /**
   * Update reel ad watch time
   */
  updateReelAdWatchTime(adId, watchedMs) {
    const tracker = this.activeImpressions[adId];
    if (!tracker || tracker.type !== 'reel') return;
    if (this.trackedImpressions.has(`${adId}_reel`)) return;

    tracker.watchedMs = watchedMs;

    const threshold = this.impressionThresholds.reel;
    const watchPercent = watchedMs / tracker.totalDurationMs;

    // Check if 50%+ watched
    if (
      watchPercent >= threshold.watchPercent &&
      !tracker.impressionSent
    ) {
      tracker.impressionSent = true;
      this.trackedImpressions.add(`${adId}_reel`);
      tracker.onImpressionReady?.(adId);
    }
  }

  /**
   * Start tracking banner ad visibility
   */
  startTrackingBannerAd(adId, onImpressionReady) {
    if (this.trackedImpressions.has(`${adId}_banner`)) return;

    this.activeImpressions[adId] = {
      adId,
      type: 'banner',
      startTime: Date.now(),
      visibilityPercent: 0,
      onImpressionReady,
    };
  }

  /**
   * Update banner ad visibility
   */
  updateBannerAdVisibility(adId, isVisible) {
    const tracker = this.activeImpressions[adId];
    if (!tracker || tracker.type !== 'banner') return;
    if (this.trackedImpressions.has(`${adId}_banner`)) return;

    if (!isVisible) {
      tracker.lastHiddenTime = Date.now();
      return;
    }

    if (!tracker.startTime) {
      tracker.startTime = Date.now();
      tracker.lastHiddenTime = null;
    }

    const threshold = this.impressionThresholds.banner;
    const timeElapsed = Date.now() - tracker.startTime;

    // If hidden for too long, reset
    if (tracker.lastHiddenTime && Date.now() - tracker.lastHiddenTime > 1000) {
      tracker.startTime = Date.now();
      return;
    }

    // Check if impression criteria met (2+ seconds visible)
    if (
      timeElapsed >= threshold.durationMs &&
      !tracker.impressionSent
    ) {
      tracker.impressionSent = true;
      this.trackedImpressions.add(`${adId}_banner`);
      tracker.onImpressionReady?.(adId);
    }
  }

  /**
   * Stop tracking an ad
   */
  stopTracking(adId) {
    delete this.activeImpressions[adId];
  }

  /**
   * Clear all active impressions
   */
  clearAll() {
    this.activeImpressions = {};
  }
}

export const impressionTracker = new ImpressionTracker();

/**
 * Helper to handle impression callback
 */
export const handleAdImpression = async (adId, position, adService) => {
  try {
    await adService.trackImpression(adId, position);
  } catch (_err) {
    // Error handling ad impression
  }
};

/**
 * Helper to handle video event tracking
 */
export const handleVideoEvent = async (adId, position, eventType, adService) => {
  try {
    await adService.trackVideoEvent(adId, position, eventType);
  } catch (_err) {
    // Error tracking video event
  }
};
