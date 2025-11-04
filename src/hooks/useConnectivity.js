import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * useConnectivity Hook
 * Monitors network connectivity status
 */

export function useConnectivity() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web implementation
      const handleOnline = () => {
        setIsConnected(true);
        setConnectionType(navigator.connection?.effectiveType || 'unknown');
      };

      const handleOffline = () => {
        setIsConnected(false);
        setConnectionType('none');
      };

      const handleConnectionChange = () => {
        setConnectionType(navigator.connection?.effectiveType || 'unknown');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (navigator.connection) {
        navigator.connection.addEventListener('change', handleConnectionChange);
      }

      // Initial check
      setIsConnected(navigator.onLine);
      setConnectionType(navigator.connection?.effectiveType || 'unknown');

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (navigator.connection) {
          navigator.connection.removeEventListener('change', handleConnectionChange);
        }
      };
    } else {
      // Mobile implementation (requires @react-native-community/netinfo)
      try {
        const NetInfo = require('@react-native-community/netinfo');

        const unsubscribe = NetInfo.default.addEventListener((state) => {
          setIsConnected(state.isConnected);
          setConnectionType(state.type || 'unknown');
        });

        // Get initial state
        NetInfo.default.fetch().then((state) => {
          setIsConnected(state.isConnected);
          setConnectionType(state.type || 'unknown');
        });

        return () => unsubscribe();
      } catch (error) {
        console.warn('NetInfo not available, assuming connected');
        setIsConnected(true);
      }
    }
  }, []);

  return { isConnected, connectionType };
}

export default useConnectivity;
