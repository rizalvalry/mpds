import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UploadProvider } from './src/contexts/UploadContext';
import GlobalUploadIndicator from './src/components/shared/GlobalUploadIndicator';
import LoginScreen from './src/screens/LoginScreen';
import ChooseDroneScreen from './src/screens/ChooseDroneScreen';
import DashboardScreen from './src/screens/DashboardSimple';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function MainApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginResponse, setLoginResponse] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'chooseDrone', 'dashboard'

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

  useEffect(() => {
    async function prepare() {
      try {
        // Simulate loading resources
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Error during preparation:', e);
      } finally {
        setIsReady(true);
        // Hide splash screen after loading
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null; // Show splash screen from app.json
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
