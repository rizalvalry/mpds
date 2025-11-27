import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';

export default function ActivityControlScreen({ session, setSession, embedded = false }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ACTIVITY_CONTROL_URL = 'https://drone-ai-activity-control-ver-1-0-325865164778.us-west1.run.app/';

  // Injected JavaScript to force desktop mode
  const injectedJavaScript = `
    (function() {
      // Force desktop viewport
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=1280, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);

      // Adjust body for desktop view
      if (document.body) {
        document.body.style.minWidth = '1280px';
        document.body.style.overflowX = 'auto';
      }

      true;
    })();
  `;

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[ActivityControl] WebView error:', nativeEvent);
    setLoading(false);
    setError('Failed to load Activity Control');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading Activity Control...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>
            Please check your internet connection
          </Text>
        </View>
      )}

      <WebView
        source={{ uri: ACTIVITY_CONTROL_URL }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        injectedJavaScript={injectedJavaScript}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        bounces={false}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E90FF" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
