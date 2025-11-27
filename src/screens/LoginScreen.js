import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import apiService from '../services/ApiService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ setSession }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for title
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting login with username:', username);
      const response = await apiService.login(username, password);

      console.log('[Login] Response:', response);

      if (response.session_token) {
        console.log('[Login] Success! Session token received');
        console.log('[Login] Drone data:', response.drone);

        // Pass complete response to App.js which will show ChooseDroneScreen
        setSession(response);
      } else {
        console.log('[Login] Failed - no session token');

        // Determine error message based on status code
        let errorTitle = 'Login Failed';
        let errorMessage = response.message || 'Invalid credentials';

        if (response.status_code) {
          switch (response.status_code) {
            case 502:
            case 503:
            case 504:
              errorTitle = 'Server Error';
              errorMessage = 'Server is temporarily unavailable. Please try again in a few moments.\n\nError Code: ' + response.status_code;
              break;
            case 500:
              errorTitle = 'Server Error';
              errorMessage = 'Internal server error occurred. Please contact support if this persists.\n\nError Code: 500';
              break;
            case 401:
              errorTitle = 'Authentication Failed';
              errorMessage = 'Invalid username or password. Please check your credentials and try again.';
              break;
            case 403:
              errorTitle = 'Access Denied';
              errorMessage = 'You do not have permission to access this system.';
              break;
            case 404:
              errorTitle = 'Connection Error';
              errorMessage = 'Login endpoint not found. Please check your configuration.';
              break;
            case 408:
            case 0:
              errorTitle = 'Connection Timeout';
              errorMessage = 'Request timed out. Please check your internet connection and try again.';
              break;
            default:
              if (response.status_code >= 500) {
                errorTitle = 'Server Error';
                errorMessage = `Server error occurred (${response.status_code}). Please try again later.`;
              }
          }
        }

        Alert.alert(errorTitle, errorMessage);
      }
    } catch (error) {
      console.error('[Login] Error:', error);

      // Handle network errors
      let errorTitle = 'Connection Error';
      let errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';

      if (error.message) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check:\n\n• Your internet connection\n• Server availability\n• Firewall settings';
        } else if (error.message.includes('timeout')) {
          errorTitle = 'Connection Timeout';
          errorMessage = 'Connection timed out. The server is taking too long to respond. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Clean Gradient Background - matching main app */}
      <LinearGradient
        colors={['#e6f2ff', '#f0f8ff', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Elegant Header */}
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>Motor Pool Drone Systems</Text>
              <View style={styles.dividerLine} />
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Clean Login Card */}
            <View style={styles.loginCard}>
              <Text style={styles.formTitle}>Login</Text>

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    style={styles.toggleButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.toggleButtonText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginButtonContainer}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#BDBDBD', '#9E9E9E'] : ['#00BFFF', '#1E90FF', '#0047AB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Get Started</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerVersion}>Version 1.0.0</Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 768 ? width * 0.25 : 32,
    paddingVertical: 40,
  },
  // Elegant Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: width > 768 ? 32 : 26,
    fontWeight: '700',
    color: '#0047AB',
    textAlign: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    width: 60,
    height: 3,
    backgroundColor: '#00BFFF',
    borderRadius: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Clean Login Card
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0047AB',
    marginBottom: 24,
    textAlign: 'center',
  },
  // Input Fields
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0047AB',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  passwordInput: {
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleButtonText: {
    fontSize: 20,
  },
  // Login Button
  loginButtonContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerVersion: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});
