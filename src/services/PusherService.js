import Pusher from 'pusher-js';
import { recordProcessedFile } from '../utils/uploadSessionStorage';

// Pusher configuration (dari backend.worker)
const PUSHER_CONFIG = {
  KEY: '56f392033b1ff203c45a',
  CLUSTER: 'ap1',
  CHANNEL: 'detection-events',
  EVENT: 'file-detected',
};

class PusherService {
  constructor() {
    this.pusher = null;
    this.channel = null;
    this.isConnected = false;
    this.eventCallback = null;
  }

  /**
   * Connect to Pusher and subscribe to detection events
   * @param {Function} onFileDetected - Callback when file is detected
   * @returns {boolean} Connection status
   */
  connect(onFileDetected = null) {
    try {
      if (this.isConnected && this.pusher) {
        console.log('[PusherService] Already connected');
        return true;
      }

      console.log('[PusherService] Connecting to Pusher...', {
        key: PUSHER_CONFIG.KEY,
        cluster: PUSHER_CONFIG.CLUSTER,
      });

      // Initialize Pusher with standard pusher-js (compatible with Expo)
      this.pusher = new Pusher(PUSHER_CONFIG.KEY, {
        cluster: PUSHER_CONFIG.CLUSTER,
        forceTLS: true,
      });

      // Listen for connection events
      this.pusher.connection.bind('connected', () => {
        console.log('[PusherService] ✅ Connected to Pusher successfully');
        this.isConnected = true;
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('[PusherService] ⚠️ Disconnected from Pusher');
        this.isConnected = false;
      });

      this.pusher.connection.bind('error', (error) => {
        console.error('[PusherService] ❌ Connection error:', error);
        this.isConnected = false;
      });

      // Subscribe to channel
      this.channel = this.pusher.subscribe(PUSHER_CONFIG.CHANNEL);

      // Bind to subscription events
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log('[PusherService] ✅ Subscribed to channel:', PUSHER_CONFIG.CHANNEL);
      });

      this.channel.bind('pusher:subscription_error', (error) => {
        console.error('[PusherService] ❌ Subscription error:', error);
      });

      // Bind to file-detected event
      this.channel.bind(PUSHER_CONFIG.EVENT, async (data) => {
        console.log('[PusherService] 📥 File detected event:', data);

        try {
          const { area_code, line_number, slot_number, status } = data;

          // Record processed file in AsyncStorage
          if (area_code) {
            const newCount = await recordProcessedFile(area_code);
            console.log('[PusherService] Updated area progress:', {
              area_code,
              count: newCount,
            });
          }

          // Call user callback if provided
          if (onFileDetected && typeof onFileDetected === 'function') {
            onFileDetected(data);
          }
        } catch (error) {
          console.error('[PusherService] Error handling file-detected event:', error);
        }
      });

      // Also bind to file-undetected event (same processing)
      this.channel.bind('file-undetected', async (data) => {
        console.log('[PusherService] 📥 File undetected event:', data);

        try {
          const { area_code, line_number, slot_number, status } = data;

          // Record processed file in AsyncStorage (undetected also counts as processed)
          if (area_code) {
            const newCount = await recordProcessedFile(area_code);
            console.log('[PusherService] Updated area progress (undetected):', {
              area_code,
              count: newCount,
            });
          }

          // Call user callback if provided
          if (onFileDetected && typeof onFileDetected === 'function') {
            onFileDetected(data);
          }
        } catch (error) {
          console.error('[PusherService] Error handling file-undetected event:', error);
        }
      });

      // Store callback
      this.eventCallback = onFileDetected;

      console.log('[PusherService] Pusher service initialized and connecting...');
      return true;
    } catch (error) {
      console.error('[PusherService] Failed to connect:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from Pusher
   */
  disconnect() {
    try {
      if (this.channel) {
        this.channel.unbind_all();
        this.channel.unsubscribe();
        console.log('[PusherService] Unsubscribed from channel');
      }

      if (this.pusher) {
        this.pusher.disconnect();
        console.log('[PusherService] Disconnected from Pusher');
      }

      this.isConnected = false;
      this.channel = null;
      this.pusher = null;
      this.eventCallback = null;
    } catch (error) {
      console.error('[PusherService] Error disconnecting:', error);
    }
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Manually trigger a test event (for development/testing)
   * @param {string} areaCode - Area code to test
   */
  async simulateFileDetected(areaCode) {
    console.log('[PusherService] 🧪 Simulating file-detected event for area:', areaCode);
    try {
      await recordProcessedFile(areaCode);
      if (this.eventCallback) {
        this.eventCallback({
          area_code: areaCode,
          line_number: 1,
          slot_number: 1,
          status: 'detected',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[PusherService] Error simulating event:', error);
    }
  }
}

// Export singleton instance
export default new PusherService();
