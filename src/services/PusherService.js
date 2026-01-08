// Pusher Service - Official Pusher library for real-time updates
// Using pusher-js for React Native

import Pusher from 'pusher-js/react-native';

const PUSHER_CONFIG = {
  APP_ID: '2072925',
  KEY: '56f392033b1ff203c45a',
  SECRET: '0feed6155e527ae7f97d',
  CLUSTER: 'ap1',
};

class PusherService {
  constructor() {
    this.pusher = null;
    this.detectionChannel = null;
    this.progressChannel = null;
    this.isConnected = false;
    this.eventCallback = null;
    this.progressCallback = null;
  }

  /**
   * Connect to Pusher and subscribe to detection channel
   * @param {Function} onFileDetected - Callback when file is detected
   * @param {Function} onBlockProgress - Callback for block progress updates (optional)
   * @returns {boolean} Connection status
   */
  connect(onFileDetected = null, onBlockProgress = null) {
    try {
      if (this.isConnected && this.pusher) {
        console.log('[Pusher] Already connected');
        return true;
      }

      console.log('[Pusher] Connecting with config:', {
        key: PUSHER_CONFIG.KEY,
        cluster: PUSHER_CONFIG.CLUSTER,
      });

      // Initialize Pusher client
      this.pusher = new Pusher(PUSHER_CONFIG.KEY, {
        cluster: PUSHER_CONFIG.CLUSTER,
        encrypted: true,
        enabledTransports: ['ws', 'wss'],
      });

      // Store callbacks
      this.eventCallback = onFileDetected;
      this.progressCallback = onBlockProgress;

      // Connection state monitoring
      this.pusher.connection.bind('connected', () => {
        console.log('[Pusher] ✅ Connected successfully');
        this.isConnected = true;
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('[Pusher] ⚠️ Disconnected');
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (error) => {
        console.error('[Pusher] ❌ Connection error:', error);
        this.isConnected = false;
      });

      // Subscribe to detection-events channel (per-file events)
      this.detectionChannel = this.pusher.subscribe('detection-events');

      // Bind to detection events
      this.detectionChannel.bind('file-detected', (data) => {
        console.log('[Pusher] 📥 file-detected event:', data);
        this.handleDetectionEvent('file-detected', data);
      });

      this.detectionChannel.bind('file-undetected', (data) => {
        console.log('[Pusher] 📥 file-undetected event:', data);
        this.handleDetectionEvent('file-undetected', data);
      });

      this.detectionChannel.bind('file-queued', (data) => {
        console.log('[Pusher] 📥 file-queued event:', data);
        this.handleDetectionEvent('file-queued', data);
      });

      // Handle subscription success
      this.detectionChannel.bind('pusher:subscription_succeeded', () => {
        console.log('[Pusher] ✅ Subscribed to detection-events channel');
      });

      // Handle subscription error
      this.detectionChannel.bind('pusher:subscription_error', (error) => {
        console.error('[Pusher] ❌ Subscription error:', error);
      });

      // Subscribe to block-progress channel (aggregate progress per block)
      if (onBlockProgress) {
        this.progressChannel = this.pusher.subscribe('block-progress');

        // Bind to block progress events (batched every 10 files)
        this.progressChannel.bind('block-progress', (data) => {
          console.log('[Pusher] 📊 block-progress event:', data);
          this.handleProgressEvent(data);
        });

        // Handle subscription success
        this.progressChannel.bind('pusher:subscription_succeeded', () => {
          console.log('[Pusher] ✅ Subscribed to block-progress channel');
        });

        // Handle subscription error
        this.progressChannel.bind('pusher:subscription_error', (error) => {
          console.error('[Pusher] ❌ Block progress subscription error:', error);
        });
      }

      return true;
    } catch (error) {
      console.error('[Pusher] Failed to connect:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Handle detection event from Pusher
   * @param {string} eventType - Event type (file-detected / file-undetected)
   * @param {Object} data - Event data
   */
  handleDetectionEvent(eventType, data) {
    try {
      console.log('[Pusher] Detection event:', {
        type: eventType,
        data,
      });

      // Call user callback if provided
      if (this.eventCallback && typeof this.eventCallback === 'function') {
        this.eventCallback({
          ...data,
          event_type: eventType,
        });
      }
    } catch (error) {
      console.error('[Pusher] Error handling detection event:', error);
    }
  }

  /**
   * Handle block progress event from Pusher (batched updates per area)
   * @param {Object} data - Progress data from backend worker
   */
  handleProgressEvent(data) {
    try {
      console.log('[Pusher] Block progress event:', {
        area_code: data.area_code,
        detected_count: data.detected_count,
        undetected_count: data.undetected_count,
        total_processed: data.total_processed,
      });

      // Call progress callback if provided
      if (this.progressCallback && typeof this.progressCallback === 'function') {
        this.progressCallback(data);
      }
    } catch (error) {
      console.error('[Pusher] Error handling progress event:', error);
    }
  }

  /**
   * Disconnect from Pusher
   */
  disconnect() {
    try {
      // Unsubscribe from detection-events channel
      if (this.detectionChannel) {
        this.detectionChannel.unbind_all();
        this.pusher.unsubscribe('detection-events');
        this.detectionChannel = null;
        console.log('[Pusher] Unsubscribed from detection-events channel');
      }

      // Unsubscribe from block-progress channel
      if (this.progressChannel) {
        this.progressChannel.unbind_all();
        this.pusher.unsubscribe('block-progress');
        this.progressChannel = null;
        console.log('[Pusher] Unsubscribed from block-progress channel');
      }

      // Disconnect Pusher
      if (this.pusher) {
        this.pusher.disconnect();
        this.pusher = null;
        console.log('[Pusher] Disconnected');
      }

      this.isConnected = false;
      this.eventCallback = null;
      this.progressCallback = null;
    } catch (error) {
      console.error('[Pusher] Error disconnecting:', error);
    }
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected && this.pusher && this.pusher.connection.state === 'connected';
  }

  /**
   * Subscribe to a specific channel event with a callback
   * Used by PusherProgressService for additional event handling
   * @param {string} channelName - Channel name to subscribe to
   * @param {Function} callback - Callback function for events
   */
  subscribe(channelName, callback) {
    try {
      if (!this.pusher) {
        console.warn('[Pusher] Cannot subscribe - not connected');
        return false;
      }

      // Store callback for the channel
      if (!this.additionalCallbacks) {
        this.additionalCallbacks = {};
      }
      this.additionalCallbacks[channelName] = callback;

      console.log(`[Pusher] Additional subscription registered for: ${channelName}`);
      return true;
    } catch (error) {
      console.error('[Pusher] Error subscribing:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from a specific channel
   * @param {string} channelName - Channel name to unsubscribe from
   */
  unsubscribe(channelName) {
    try {
      if (this.additionalCallbacks && this.additionalCallbacks[channelName]) {
        delete this.additionalCallbacks[channelName];
        console.log(`[Pusher] Unsubscribed additional callback for: ${channelName}`);
      }
    } catch (error) {
      console.error('[Pusher] Error unsubscribing:', error);
    }
  }

  /**
   * Manually trigger a test event (for development/testing)
   * @param {string} areaCode - Area code to test
   */
  simulateFileDetected(areaCode) {
    console.log('[Pusher] 🧪 Simulating file-detected event for area:', areaCode);
    try {
      if (this.eventCallback) {
        this.eventCallback({
          area_code: areaCode,
          line_number: 1,
          slot_number: 1,
          confidence: 0.95,
          status: 'detected',
          timestamp: new Date().toISOString(),
          event_type: 'file-detected',
        });
      }
    } catch (error) {
      console.error('[Pusher] Error simulating event:', error);
    }
  }
}

// Export singleton instance
export default new PusherService();
