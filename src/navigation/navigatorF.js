import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardSimple';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const { isDarkMode, theme } = useTheme();

  const navigationTheme = {
    dark: isDarkMode,
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.accent,
    },
  };

  useEffect(() => {
    const init = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('access_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');

        if (accessToken && refreshToken) {
          // Load full login response to preserve area_code and other pilot data
          const loginResponseStr = await AsyncStorage.getItem('login_response');
          if (loginResponseStr) {
            try {
              const fullSession = JSON.parse(loginResponseStr);
              console.log('[Navigator] Restored full session with area_code:', fullSession.area_code);
              setSession(fullSession);
            } catch (parseError) {
              // Fallback to basic session if parse fails
              console.warn('[Navigator] Could not parse login_response, using basic session');
              setSession({ session_token: accessToken, refresh_token: refreshToken });
            }
          } else {
            // No login_response stored, use basic session
            setSession({ session_token: accessToken, refresh_token: refreshToken });
          }
        }
      } catch (error) {
        console.error('[Navigator] Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        key={session ? 'app' : 'auth'}
        screenOptions={{ headerShown: false }}
      >
        {session ? (
          <Stack.Screen name="Drone Frontend">
            {(props) => <DashboardScreen {...props} session={session} setSession={setSession} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} setSession={setSession} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
