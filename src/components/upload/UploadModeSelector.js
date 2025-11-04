import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Upload Mode Selector
 * Dual mode: AI Neural Network Transfer vs Manual File Browser
 * Inspired by fix-design mockups
 */

export const UploadModeSelector = ({ onSelectAIUpload, onSelectManualUpload, disabled = false }) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      {/* AI Upload Card - Left */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onSelectAIUpload}
        disabled={disabled}
        style={[styles.modeCard, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={theme.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modeGradient}
        >
          {/* AI Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.aiIconGlow} />
            <Text style={styles.icon}>🤖</Text>
          </View>

          {/* Title */}
          <Text style={styles.modeTitle}>DRONE AI UPLOAD</Text>

          {/* Description */}
          <Text style={styles.modeDescription}>
            Neural Network Transfer
          </Text>

          {/* Features */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureDot}>•</Text>
              <Text style={styles.featureText}>Automatic Processing</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureDot}>•</Text>
              <Text style={styles.featureText}>AI-Powered Detection</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureDot}>•</Text>
              <Text style={styles.featureText}>Real-time Analysis</Text>
            </View>
          </View>

          {/* Button */}
          <View style={styles.buttonContainer}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>SELECT AI MODE</Text>
            </View>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Manual Upload Card - Right */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onSelectManualUpload}
        disabled={disabled}
        style={[styles.modeCard, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={isDarkMode ? ['#2D3748', '#4A5568'] : ['#F7FAFC', '#EDF2F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modeGradient, styles.manualGradient]}
        >
          {/* Manual Icon */}
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { opacity: 0.9 }]}>📁</Text>
          </View>

          {/* Title */}
          <Text style={[styles.modeTitle, { color: theme.text }]}>
            JELAJAHI FILE
          </Text>

          {/* Description */}
          <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
            Manual File Upload
          </Text>

          {/* Features */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={[styles.featureDot, { color: theme.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                Choose Files Manually
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureDot, { color: theme.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                Batch Upload Support
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.featureDot, { color: theme.primary }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                8 Images per Batch
              </Text>
            </View>
          </View>

          {/* Button */}
          <View style={styles.buttonContainer}>
            <View style={[styles.button, { backgroundColor: theme.primary }]}>
              <Text style={styles.buttonText}>BROWSE FILES</Text>
            </View>
          </View>

          {/* Border */}
          <View
            style={[
              styles.manualBorder,
              { borderColor: theme.border },
            ]}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 24,
  },
  modeCard: {
    flex: 1,
    minHeight: 320,
  },
  disabled: {
    opacity: 0.6,
  },
  modeGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  manualGradient: {
    shadowOpacity: 0.08,
  },
  manualBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  aiIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -10,
  },
  icon: {
    fontSize: 56,
    zIndex: 2,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  modeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    flex: 1,
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureDot: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  decorCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    left: -20,
  },
});
