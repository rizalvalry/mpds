import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Alert, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UploadProvider } from './src/contexts/UploadContext';
import GlobalUploadIndicator from './src/components/shared/GlobalUploadIndicator';
import AnimatedSplashScreen from './src/components/shared/AnimatedSplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import ChooseDroneScreen from './src/screens/ChooseDroneScreen';
import DashboardScreen from './src/screens/DashboardSimple';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Session timeout configuration (12 hours in milliseconds)
const SESSION_TIMEOUT_HOURS = 12;
const SESSION_CHECK_INTERVAL = 60000; // Check every 1 minute

function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginResponse, setLoginResponse] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'chooseDrone', 'dashboard'

  const sessionCheckIntervalRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Check if session is expired based on expires_at
  const isSessionExpired = useCallback((sessionData) => {
    if (!sessionData?.expires_at) {
      console.log('[Session] No expires_at found');
      return false;
    }

    try {
      // Parse expires_at (format: "2026-02-06 00:00:31.579")
      const expiresAt = new Date(sessionData.expires_at.replace(' ', 'T'));
      const now = new Date();

      const isExpired = now >= expiresAt;
      const remainingMs = expiresAt - now;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      console.log(`[Session] Expires at: ${expiresAt.toISOString()}`);
      console.log(`[Session] Current time: ${now.toISOString()}`);
      console.log(`[Session] Remaining: ${remainingHours}h ${remainingMinutes}m`);
      console.log(`[Session] Is expired: ${isExpired}`);

      return isExpired;
    } catch (error) {
      console.error('[Session] Error parsing expires_at:', error);
      return false;
    }
  }, []);

  // Handle session expiry - show alert and logout
  const handleSessionExpired = useCallback(async () => {
    console.log('[Session] ⏰ Session expired! Kicking out to login...');

    // Clear interval first
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }

    // Show alert to user
    Alert.alert(
      'Session Expired',
      'Your session has expired (12 hours). Please login again.',
      [
        {
          text: 'OK',
          onPress: async () => {
            // Perform logout
            await handleLogout();
          }
        }
      ],
      { cancelable: false }
    );
  }, []);

  // Check session validity
  const checkSessionValidity = useCallback(async () => {
    try {
      const sessionDataString = await AsyncStorage.getItem('session_data');
      if (sessionDataString) {
        const sessionData = JSON.parse(sessionDataString);
        if (isSessionExpired(sessionData)) {
          handleSessionExpired();
        }
      }
    } catch (error) {
      console.error('[Session] Error checking session validity:', error);
    }
  }, [isSessionExpired, handleSessionExpired]);

  // Setup session expiry checker
  useEffect(() => {
    if (currentScreen === 'dashboard' && session) {
      console.log('[Session] Starting session expiry checker...');

      // Check immediately on mount
      checkSessionValidity();

      // Setup interval to check periodically
      sessionCheckIntervalRef.current = setInterval(() => {
        console.log('[Session] Periodic check...');
        checkSessionValidity();
      }, SESSION_CHECK_INTERVAL);

      // Listen for app state changes (foreground/background)
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          console.log('[Session] App came to foreground, checking session...');
          checkSessionValidity();
        }
        appState.current = nextAppState;
      });

      return () => {
        console.log('[Session] Cleaning up session checker...');
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
        subscription?.remove();
      };
    }
  }, [currentScreen, session, checkSessionValidity]);

  // Handle logout and clear session
  const handleLogout = async () => {
    try {
      console.log('[App] Logging out and clearing ALL session data');
      // Clear ALL session-related keys from AsyncStorage
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'drone_data',
        'session_data',
        'logged_in_time'
      ]);
      console.log('[App] Session cleared from AsyncStorage');

      setSession(null);
      setLoginResponse(null);
      setCurrentScreen('login');
    } catch (error) {
      console.error('[App] Error during logout:', error);
    }
  };

  // Handle session wrapper that includes logout capability
  const handleSetSessionWithLogout = (newSession) => {
    if (newSession === null) {
      // Logout triggered
      handleLogout();
    } else {
      setSession(newSession);
    }
  };

  useEffect(() => {
    // Check for existing session
    const loadSession = async () => {
      try {
        // Try to load complete session data first (new format)
        const sessionDataString = await AsyncStorage.getItem('session_data');

        if (sessionDataString) {
          console.log('[App] Found complete session data, restoring...');
          const sessionData = JSON.parse(sessionDataString);
          console.log('[App] Restored session:', {
            username: sessionData.username,
            role: sessionData.role,
            drone_code: sessionData.drone?.drone_code
          });

          setSession(sessionData);
          setCurrentScreen('dashboard');
        } else {
          // Fallback to old format (for backward compatibility)
          const accessToken = await AsyncStorage.getItem('access_token');
          const refreshToken = await AsyncStorage.getItem('refresh_token');
          const droneData = await AsyncStorage.getItem('drone_data');

          if (accessToken && refreshToken) {
            console.log('[App] Found legacy session format, loading...');
            const sessionData = {
              session_token: accessToken,
              refresh_token: refreshToken
            };

            // Add drone data if available
            if (droneData) {
              const drone = JSON.parse(droneData);
              sessionData.drone = drone;
            }

            setSession(sessionData);
            setCurrentScreen('dashboard');
          } else {
            console.log('[App] No existing session found');
          }
        }
      } catch (error) {
        console.error('[App] Error loading session:', error);
        // Clear potentially corrupted session
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'drone_data', 'session_data']);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Handle login response and show drone selection
  const handleLoginSuccess = (response) => {
    console.log('[App] Login successful, showing drone selection');
    setLoginResponse(response);
    setCurrentScreen('chooseDrone');
  };

  // Handle completing drone selection and saving session
  const handleCompleteDroneSelection = async (response) => {
    try {
      console.log('[App] Completing drone selection and saving session');
      console.log('[App] Full response:', response);

      // Save ALL session data to AsyncStorage
      await AsyncStorage.setItem('access_token', response.session_token);
      await AsyncStorage.setItem('refresh_token', response.refresh_token);

      // Save complete session data as JSON for full restoration
      const sessionData = {
        session_token: response.session_token,
        refresh_token: response.refresh_token,
        expires_at: response.expires_at,
        user_id: response.user_id,
        username: response.username,
        role_id: response.role_id,
        role: response.role,
        drone: response.drone,
        status: response.status,
        status_code: response.status_code,
        message: response.message
      };

      await AsyncStorage.setItem('session_data', JSON.stringify(sessionData));

      // Save drone data separately for backward compatibility
      if (response.drone) {
        await AsyncStorage.setItem('drone_data', JSON.stringify(response.drone));
      }

      console.log('[App] Session saved successfully to AsyncStorage');
      setSession(response);
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('[App] Error saving session:', error);
    }
  };

  if (loading) {
    return null;
  }

  // Render appropriate screen based on state
  if (currentScreen === 'dashboard' && session) {
    return <DashboardScreen session={session} setSession={handleSetSessionWithLogout} />;
  } else if (currentScreen === 'chooseDrone' && loginResponse) {
    return <ChooseDroneScreen loginResponse={loginResponse} setSession={handleCompleteDroneSelection} />;
  } else {
    return <LoginScreen setSession={handleLoginSuccess} />;
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  // Set screen orientation on app start
  useEffect(() => {
    async function setOrientation() {
      try {
        // Allow all orientations EXCEPT portrait upside down
        // This allows: Portrait, Landscape Left, Landscape Right
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN
        );
        console.log('[App] Screen orientation set to: ALL_BUT_UPSIDE_DOWN');
      } catch (e) {
        console.warn('[App] Error setting screen orientation:', e);
      }
    }

    setOrientation();
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Hide native splash screen immediately
        await SplashScreen.hideAsync();
        // Show animated splash for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn('Error during preparation:', e);
      } finally {
        setShowAnimatedSplash(false);
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // Show animated splash screen with GIF
  if (showAnimatedSplash) {
    return <AnimatedSplashScreen />;
  }

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <UploadProvider>
        <View style={{ flex: 1 }}>
          <MainApp />
          <GlobalUploadIndicator />
        </View>
      </UploadProvider>
    </ThemeProvider>
  );
}
