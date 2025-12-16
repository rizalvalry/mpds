import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';

export default function ActivityControlScreen({ session, setSession, embedded = false }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const ACTIVITY_CONTROL_URL = 'https://drone-ai-activity-control-ver-1-0-325865164778.us-west1.run.app/';

  // Listen to dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  // Determine viewport configuration based on screen size
  const getViewportConfig = () => {
    const { width, height } = dimensions;
    const isLandscape = width > height;

    // Desktop (>1080px width)
    if (width >= 1080) {
      return {
        viewportWidth: 1440,
        viewportHeight: 'device-height',
        initialScale: 0.75,
        minScale: 0.5,
        maxScale: 2.0,
        userScalable: true,
        contentHeight: 2000, // Minimum content height
      };
    }
    // Tablet (1024x1366 or similar) - iPad range (680-1024px)
    else if (width >= 680) {
      return {
        viewportWidth: isLandscape ? 1280 : 1024,
        viewportHeight: 'device-height',
        initialScale: isLandscape ? 0.8 : 0.95,
        minScale: 0.5,
        maxScale: 2.0,
        userScalable: true,
        contentHeight: isLandscape ? 1800 : 2400, // More height for portrait
      };
    }
    // Mobile (390x844 or similar)
    else {
      return {
        viewportWidth: 1280,
        viewportHeight: 'device-height',
        initialScale: 0.3,
        minScale: 0.25,
        maxScale: 3.0,
        userScalable: true,
        contentHeight: 2000,
      };
    }
  };

  const viewportConfig = getViewportConfig();

  // Log viewport configuration for debugging
  useEffect(() => {
    console.log('[ActivityControlScreen] Screen dimensions:', dimensions);
    console.log('[ActivityControlScreen] Viewport config:', viewportConfig);
  }, [dimensions]);

  // Injected JavaScript to apply responsive viewport and fix header visibility
  const injectedJavaScript = `
    (function() {
      var screenWidth = window.screen.width;
      var screenHeight = window.screen.height;
      var deviceWidth = Math.max(screenWidth, screenHeight);

      console.log('[ActivityControl] Screen dimensions:', screenWidth, 'x', screenHeight);
      console.log('[ActivityControl] Device width:', deviceWidth);

      // Wait for DOM to be fully loaded
      function adjustLayout() {
        try {
          // Remove existing viewport meta tags
          var existingMetas = document.querySelectorAll('meta[name="viewport"]');
          existingMetas.forEach(function(meta) {
            meta.remove();
          });

          // Apply responsive viewport based on screen size with height
          var meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=${viewportConfig.viewportWidth}, height=${viewportConfig.viewportHeight}, initial-scale=${viewportConfig.initialScale}, minimum-scale=${viewportConfig.minScale}, maximum-scale=${viewportConfig.maxScale}, user-scalable=${viewportConfig.userScalable ? 'yes' : 'no'}';
          document.getElementsByTagName('head')[0].appendChild(meta);

          console.log('[ActivityControl] Applied viewport:', meta.content);
          console.log('[ActivityControl] Content height target:', ${viewportConfig.contentHeight});

          // Adjust body and html for desktop/responsive view with proper height
          if (document.documentElement) {
            document.documentElement.style.minWidth = '${viewportConfig.viewportWidth}px';
            document.documentElement.style.minHeight = '${viewportConfig.contentHeight}px';
            document.documentElement.style.height = 'auto';
            document.documentElement.style.overflowX = 'auto';
            document.documentElement.style.overflowY = 'auto';
            document.documentElement.style.width = '100%';
          }

          if (document.body) {
            document.body.style.minWidth = '${viewportConfig.viewportWidth}px';
            document.body.style.minHeight = '${viewportConfig.contentHeight}px';
            document.body.style.height = 'auto';
            document.body.style.overflowX = 'auto';
            document.body.style.overflowY = 'auto';
            document.body.style.width = '100%';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.paddingTop = '0';
            document.body.style.position = 'relative';
          }

          // Inject CSS to remove all top padding/margins globally and set proper heights
          var style = document.createElement('style');
          style.textContent = \`
            * {
              scroll-behavior: smooth !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: auto !important;
              overflow-y: auto !important;
              min-height: ${viewportConfig.contentHeight}px !important;
              height: auto !important;
            }
            body > * {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            body > div:first-child,
            #root, #app, .app, main, [role="main"] {
              min-height: ${viewportConfig.contentHeight}px !important;
              height: auto !important;
            }
            header, .header, [class*="header"], [class*="Header"] {
              margin-top: 0 !important;
              position: relative !important;
            }
            /* Ensure content containers have proper height */
            .container, [class*="container"], [class*="Container"] {
              min-height: inherit !important;
              height: auto !important;
            }
          \`;
          document.head.appendChild(style);
          console.log('[ActivityControl] Injected CSS to remove top spacing and set heights');

          // Try to find and adjust the main content wrapper/container with height
          var mainSelectors = ['body > div:first-child', 'main', '[role="main"]', '#root', '#app', '.app'];
          for (var i = 0; i < mainSelectors.length; i++) {
            var mainElement = document.querySelector(mainSelectors[i]);
            if (mainElement) {
              mainElement.style.paddingTop = '0';
              mainElement.style.marginTop = '0';
              mainElement.style.minHeight = '${viewportConfig.contentHeight}px';
              mainElement.style.height = 'auto';
              mainElement.style.overflowY = 'visible';
              console.log('[ActivityControl] Adjusted main element with height:', mainSelectors[i]);
            }
          }

          // Force all child containers to have proper height
          var allContainers = document.querySelectorAll('.container, [class*="container"], [class*="Container"]');
          allContainers.forEach(function(container) {
            container.style.minHeight = 'inherit';
            container.style.height = 'auto';
          });
          console.log('[ActivityControl] Adjusted', allContainers.length, 'containers');

          // Force scroll to top to ensure header is visible
          setTimeout(function() {
            window.scrollTo(0, 0);
            // Also try scrolling the body
            if (document.body) {
              document.body.scrollTop = 0;
            }
            if (document.documentElement) {
              document.documentElement.scrollTop = 0;
            }
          }, 100);

          // Set up a MutationObserver to maintain scroll position at top
          var scrollObserver = new MutationObserver(function() {
            // Keep forcing scroll to top for the first few seconds
            window.scrollTo(0, 0);
          });

          if (document.body) {
            scrollObserver.observe(document.body, {
              childList: true,
              subtree: true
            });

            // Disconnect observer after 3 seconds
            setTimeout(function() {
              scrollObserver.disconnect();
              console.log('[ActivityControl] Scroll observer disconnected');
            }, 3000);
          }

          console.log('[ActivityControl] Layout adjusted successfully');
        } catch (error) {
          console.error('[ActivityControl] Error adjusting layout:', error);
        }
      }

      // Execute immediately
      adjustLayout();

      // Also execute after page load to ensure it applies
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', adjustLayout);
      } else {
        // If already loaded, execute again
        setTimeout(adjustLayout, 100);
      }

      window.addEventListener('load', function() {
        setTimeout(adjustLayout, 200);
      });

      // Re-adjust on resize
      window.addEventListener('resize', adjustLayout);

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
        key={`webview-${dimensions.width}-${dimensions.height}`}
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
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={true}
        showsVerticalScrollIndicator={true}
        bounces={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        androidLayerType="hardware"
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
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
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
