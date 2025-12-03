// WebSocket Service (replaces Pusher)
// Connects to backend.wss for real-time detection events

const WEBSOCKET_CONFIG = {
  // IMPORTANT: URL must match ingress configuration
  // Development: wss://rnd-dev.bsi.co.id/drone/socket/ws/status
  // Production: wss://droneark.bsi.co.id/ws/status
  URL: 'wss://rnd-dev.bsi.co.id/drone/socket/ws/status', // Dev endpoint via ingress
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
};

class PusherService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.eventCallback = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
  }

  /**
   * Connect to WebSocket and listen to detection events
   * @param {Function} onFileDetected - Callback when file is detected
   * @returns {boolean} Connection status
   */
  connect(onFileDetected = null) {
    try {
      if (this.isConnected && this.ws) {
        console.log('[WebSocket] Already connected');
        return true;
      }

      console.log('[WebSocket] Connecting to:', WEBSOCKET_CONFIG.URL);

      // Create WebSocket connection (NO AUTH - public endpoint)
      this.ws = new WebSocket(WEBSOCKET_CONFIG.URL);

      // Store callback
      this.eventCallback = onFileDetected;

      // Connection opened
      this.ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Clear reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      // Message received from server
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] 📥 Message received:', message);

          // Handle detection events
          if (message.type === 'file-detected' || message.type === 'file-undetected') {
            this.handleDetectionEvent(message);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      // Connection closed
      this.ws.onclose = () => {
        console.log('[WebSocket] ⚠️ Connection closed');
        this.isConnected = false;
        this.attemptReconnect();
      };

      // Connection error
      this.ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Connection error:', error);
        this.isConnected = false;
      };

      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Handle detection event from WebSocket
   * @param {Object} message - Detection message
   */
  handleDetectionEvent(message) {
    try {
      const { metadata } = message;

      if (!metadata) {
        console.warn('[WebSocket] No metadata in message');
        return;
      }

      const { area_code } = metadata;

      console.log('[WebSocket] Detection event:', {
        type: message.type,
        area_code,
        confidence: metadata.confidence,
      });

      // Call user callback if provided
      if (this.eventCallback && typeof this.eventCallback === 'function') {
        this.eventCallback({
          area_code,
          ...metadata,
          event_type: message.type,
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error handling detection event:', error);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.eventCallback);
    }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    try {
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
        console.log('[WebSocket] Disconnected');
      }

      this.isConnected = false;
      this.eventCallback = null;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('[WebSocket] Error disconnecting:', error);
    }
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Manually trigger a test event (for development/testing)
   * @param {string} areaCode - Area code to test
   */
  simulateFileDetected(areaCode) {
    console.log('[WebSocket] 🧪 Simulating file-detected event for area:', areaCode);
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
      console.error('[WebSocket] Error simulating event:', error);
    }
  }
}

// Export singleton instance
export default new PusherService();
