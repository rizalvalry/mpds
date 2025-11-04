// src/screens/LoginScreenF.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { getSession, login } from '../api/Auth';
import { storage as nativeStorage } from '../utils/storage';
import { storage as webStorage } from '../utils/storage.web';
import BackgroundWrapper from '../components/styles/backgroundWrapper';

// Optional: for native blur
import { BlurView } from 'expo-blur';

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export default function LoginScreen({ navigation, setSession }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const data = await login(username, password);

      if (!data.success) {
        throw new Error(data.message || 'Invalid Credentials');
      }

      console.log('✅ Logged in as:', data.username);
      await storage.setItem('session', JSON.stringify(data));
      setSession(data);
      const sesh = await getSession();
      console.log('session data: ', sesh);
      return data;
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Unable to login.');
    } finally {
      setLoading(false);
    }
  };

  const CardContainer =
    Platform.OS === 'web'
      ? View // Web fallback (CSS blur)
      : BlurView; // Native blur component

  return (
    <BackgroundWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.centerContainer}>
          <CardContainer
            style={[
              styles.card,
              Platform.OS === 'web' && styles.webGlass, // web blur fallback
            ]}
            intensity={Platform.OS !== 'web' ? 50 : undefined}
            tint="light"
          >
            <Text style={styles.title}>Selamat Datang di Drone Frontend</Text>

            <TextInput
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
              placeholderTextColor="#ffffffff"
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor="#ffffffff"
            />

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>
          </CardContainer>
        </View>
      </KeyboardAvoidingView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  // Web fallback for glass effect using CSS
  webGlass: {
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 26,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '700',
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    padding: 12,
    marginBottom: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: 'rgba(47,123,246,0.9)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
