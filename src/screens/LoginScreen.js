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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting login with email:', email);
      const response = await apiService.login(email, password);

      console.log('[Login] Response:', response);

      if (response.session_token) {
        console.log('[Login] Success! Session token received');
        console.log('[Login] Drone data:', response.drone);

        // Pass complete response to App.js which will show ChooseDroneScreen
        setSession(response);
      } else {
        console.log('[Login] Failed - no session token');
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('[Login] Error:', error);
      Alert.alert(
        'Login Error',
        error.message || 'Unable to connect to server. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={['#0A0E27', '#1a1f3a', '#0047AB', '#1E90FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Decorative Circles - Premium Background Effect */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />

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
            {/* Premium Header Section */}
            <Animated.View
              style={[
                styles.headerSection,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.brandContainer}>
                <Text style={styles.mainTitle}>Motor Pool Drone Systems</Text>
                <View style={styles.dividerLine} />
                <Text style={styles.tagline}>Artificial Intelligence Powered</Text>
              </View>
            </Animated.View>

            {/* Glass Morphism Login Card */}
            <BlurView intensity={20} tint="dark" style={styles.loginCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.glassGradient}
              >
                <Text style={styles.formTitle}>SECURE ACCESS</Text>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <BlurView intensity={30} tint="dark" style={styles.inputBlur}>
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@domain.com"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </BlurView>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <BlurView intensity={30} tint="dark" style={styles.inputBlur}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </BlurView>
                </View>

                {/* Premium Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  style={styles.loginButtonContainer}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={loading ? ['#555', '#333'] : ['#00BFFF', '#1E90FF', '#0047AB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>ACCESS SYSTEM</Text>
                        <Text style={styles.loginButtonArrow}>→</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>

            {/* Premium Footer */}
            <View style={styles.footer}>
              <View style={styles.footerDivider} />
              <Text style={styles.footerText}>POWERED BY BSI RESEARCH & DEVELOPMENT</Text>
              <Text style={styles.footerVersion}>Version 1.0.0 • Enterprise Edition</Text>
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
    position: 'relative',
  },
  // Decorative Background Circles
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.1,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#00BFFF',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#1E90FF',
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 200,
    height: 200,
    backgroundColor: '#0047AB',
    top: '40%',
    left: '70%',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 768 ? width * 0.2 : 24,
    paddingVertical: 20,
    paddingBottom: 60,
  },
  // Premium Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BFFF',
    letterSpacing: 3,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  dividerLine: {
    width: 80,
    height: 2,
    backgroundColor: '#00BFFF',
    marginVertical: 12,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00BFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  // Glass Morphism Card
  loginCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  glassGradient: {
    padding: 24,
    borderRadius: 24,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  // Input Fields
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Premium Button
  loginButtonContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  loginButtonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  // Premium Footer
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  footerVersion: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
});
