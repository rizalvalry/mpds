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
    this.channel = null;
    this.isConnected = false;
    this.eventCallback = null;
  }

  /**
   * Connect to Pusher and subscribe to detection channel
   * @param {Function} onFileDetected - Callback when file is detected
   * @returns {boolean} Connection status
   */
  connect(onFileDetected = null) {
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

      // Store callback
      this.eventCallback = onFileDetected;

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

      // Subscribe to detection channel
      // Channel name: detection-events (from Pusher Debug Console)
      this.channel = this.pusher.subscribe('detection-events');

      // Bind to detection events
      this.channel.bind('file-detected', (data) => {
        console.log('[Pusher] 📥 file-detected event:', data);
        this.handleDetectionEvent('file-detected', data);
      });

      this.channel.bind('file-undetected', (data) => {
        console.log('[Pusher] 📥 file-undetected event:', data);
        this.handleDetectionEvent('file-undetected', data);
      });

      this.channel.bind('file-queued', (data) => {
        console.log('[Pusher] 📥 file-queued event:', data);
        this.handleDetectionEvent('file-queued', data);
      });

      // Handle subscription success
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log('[Pusher] ✅ Subscribed to detection-events channel');
      });

      // Handle subscription error
      this.channel.bind('pusher:subscription_error', (error) => {
        console.error('[Pusher] ❌ Subscription error:', error);
      });

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
   * Disconnect from Pusher
   */
  disconnect() {
    try {
      // Unsubscribe from channel
      if (this.channel) {
        this.channel.unbind_all();
        this.pusher.unsubscribe('detection-events');
        this.channel = null;
        console.log('[Pusher] Unsubscribed from channel');
      }

      // Disconnect Pusher
      if (this.pusher) {
        this.pusher.disconnect();
        this.pusher = null;
        console.log('[Pusher] Disconnected');
      }

      this.isConnected = false;
      this.eventCallback = null;
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
