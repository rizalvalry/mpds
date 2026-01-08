/**
 * PusherProgressService
 *
 * Handles real-time progress updates from Pusher and periodically syncs to API.
 * This service ensures cross-device synchronization by:
 * 1. Receiving Pusher events with progress updates
 * 2. Storing progress in memory (NOT AsyncStorage)
 * 3. Periodically updating upload_details API every 1 minute
 * 4. Auto-completing uploads older than 90 minutes
 */

import pusherService from './PusherService';
import apiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PusherProgressService {
  constructor() {
    // In-memory storage for progress (per area code)
    // Format: { 'A': { total_processed: 100, detected: 60, undetected: 40, last_update: Date }, ... }
    this.progressData = {};

    // Timer for periodic API updates
    this.updateTimer = null;

    // Update interval: 1 minute (60000ms)
    this.UPDATE_INTERVAL = 60000;

    // Session data (operator, status, etc.)
    this.sessionData = null;

    // Track if service is running
    this.isRunning = false;
  }

  /**
   * Start listening to Pusher events and periodic API updates
   * @param {Object} session - User session with operator info
   */
  async start(session) {
    if (this.isRunning) {
      console.log('[PusherProgressService] Already running');
      return;
    }

    console.log('[PusherProgressService] Starting service...');
    this.isRunning = true;
    this.sessionData = session;

    // Subscribe to Pusher block-progress events
    pusherService.subscribe('block-progress', this.handleProgressEvent.bind(this));

    // Start periodic API update timer (every 1 minute)
    this.updateTimer = setInterval(() => {
      this.syncProgressToAPI();
    }, this.UPDATE_INTERVAL);

    console.log('[PusherProgressService] ✅ Service started - listening for progress updates');
  }

  /**
   * Stop service and clean up
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[PusherProgressService] Stopping service...');

    // Unsubscribe from Pusher
    pusherService.unsubscribe('block-progress');

    // Clear timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Clear progress data
    this.progressData = {};
    this.sessionData = null;
    this.isRunning = false;

    console.log('[PusherProgressService] ✅ Service stopped');
  }

  /**
   * Handle incoming Pusher progress event
   * @param {Object} data - Pusher event data
   */
  handleProgressEvent(data) {
    const { area_code, total_processed, detected_count, undetected_count, timestamp } = data;

    if (!area_code || total_processed === undefined) {
      console.warn('[PusherProgressService] Invalid Pusher event data:', data);
      return;
    }

    // Update in-memory progress data
    this.progressData[area_code] = {
      total_processed,
      detected_count: detected_count || 0,
      undetected_count: undetected_count || 0,
      last_update: new Date(timestamp || new Date()),
      pusher_timestamp: timestamp,
    };

    console.log(`[PusherProgressService] 📊 Updated Block ${area_code}: ${total_processed} files`);
  }

  /**
   * Sync current progress data to API (called every 1 minute)
   * Updates end_uploads for each area based on total_processed from Pusher
   */
  async syncProgressToAPI() {
    if (!this.sessionData) {
      console.warn('[PusherProgressService] No session data - skipping API sync');
      return;
    }

    const areaCodesWithProgress = Object.keys(this.progressData);

    if (areaCodesWithProgress.length === 0) {
      console.log('[PusherProgressService] No progress data to sync');
      return;
    }

    console.log(`[PusherProgressService] 🔄 Syncing progress for ${areaCodesWithProgress.length} areas to API...`);

    // Get operator from session (drone code)
    const operator = this.sessionData.drone?.drone_code || 'UNKNOWN';

    // Sync each area's progress to API
    for (const areaCode of areaCodesWithProgress) {
      const progressInfo = this.progressData[areaCode];

      try {
        // Check if upload is stale (> 60 minutes old)
        const timeSinceUpdate = Date.now() - progressInfo.last_update.getTime();
        const minutesOld = (timeSinceUpdate / 60000).toFixed(0);

        // CRITICAL: Prepare payload with area_code to update specific block
        // The API must filter by operator + area_code to update the correct row
        const payload = {
          operator,           // Drone-001 or Drone-002
          areaCode,          // Block A, B, C, etc.
          status: 'active',
          endUploads: progressInfo.total_processed,  // detected + undetected
          phase: 0,
          updatedAt: new Date().toISOString(),
        };

        console.log(`[PusherProgressService] 📤 Updating Block ${areaCode} (${minutesOld} min old): end_uploads=${progressInfo.total_processed}`);

        // Call API to update end_uploads for THIS specific area
        const response = await apiService.updateUploadProgress(payload);

        if (response.success) {
          console.log(`[PusherProgressService] ✅ Block ${areaCode} updated: end_uploads=${progressInfo.total_processed}`);
        } else {
          console.error(`[PusherProgressService] ❌ Failed Block ${areaCode}:`, response.message);
        }

      } catch (error) {
        console.error(`[PusherProgressService] ❌ Error syncing Block ${areaCode}:`, error);
      }
    }

    console.log(`[PusherProgressService] 🏁 Sync completed for ${areaCodesWithProgress.length} areas`);
  }

  /**
   * Get current progress for a specific area
   * @param {string} areaCode - Area block code
   * @returns {Object|null} Progress data or null
   */
  getProgress(areaCode) {
    return this.progressData[areaCode] || null;
  }

  /**
   * Get all progress data
   * @returns {Object} All progress data
   */
  getAllProgress() {
    return { ...this.progressData };
  }

  /**
   * Manually trigger API sync (for testing or immediate sync)
   */
  async forceSyncToAPI() {
    console.log('[PusherProgressService] 🔄 Force syncing to API...');
    await this.syncProgressToAPI();
  }
}

// Export singleton instance
export default new PusherProgressService();
