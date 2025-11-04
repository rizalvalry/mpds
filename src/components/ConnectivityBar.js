import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectivity } from '../hooks/useConnectivity';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ConnectivityBar Component
 * Shows connectivity status at the top of the screen
 */

export function ConnectivityBar() {
  const { isConnected, connectionType } = useConnectivity();
  const { theme } = useTheme();

  if (isConnected) return null;

  return (
    <View style={[styles.container, { backgroundColor: '#F44336' }]}>
      <Text style={styles.text}>
        ⚠️ No Internet Connection - Uploads will resume when connection is restored
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConnectivityBar;
