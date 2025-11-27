import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced AI Drone Design System - Inspired by DJI, Skydio, Parrot, and Azure IoT
const lightTheme = {
  mode: 'light',

  // Background System
  background: '#F8FAFB',
  backgroundSecondary: '#F1F4F9',
  backgroundGradient: ['#F8FAFB', '#E8F4F9'],

  // Card System with depth
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardHover: '#F9FBFC',
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  // Primary Blue System - Inspired by DJI Sky Blue & Azure
  primary: '#0078D4',
  primaryLight: '#00A9E0',
  primaryDark: '#0066CC',
  primaryGradient: ['#0078D4', '#00B4D8'],

  // Accent System - AI Neural Network Colors
  accent: '#00D9FF',
  accentSecondary: '#4FC3F7',
  accentGradient: ['#00D9FF', '#00B4D8'],

  // Text System
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  buttonText: '#FFFFFF',

  // Status Colors - Professional Grade
  success: '#10B981',
  successLight: '#D4EDDA',
  successDark: '#059669',

  warning: '#F59E0B',
  warningLight: '#FFF4CC',
  warningDark: '#D97706',

  error: '#EF4444',
  errorLight: '#FFE6E6',
  errorDark: '#DC2626',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',

  // Neutral Palette
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',

  // Border System
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',

  // Drone Specific Colors
  droneActive: '#00D9FF',
  droneStandby: '#FCD34D',
  droneError: '#EF4444',
  droneOffline: '#9CA3AF',

  // AI Processing Colors
  aiProcessing: '#8B5CF6',
  aiComplete: '#10B981',
  aiQueue: '#F59E0B',

  // Overlay System
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayHeavy: 'rgba(0, 0, 0, 0.7)',

  // Glass Morphism
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBlur: 100,
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};

const darkTheme = {
  mode: 'dark',

  // Background System - Deep Space Black
  background: '#0B0E11',
  backgroundSecondary: '#151A21',
  backgroundGradient: ['#0B0E11', '#1A1F2E'],

  // Card System with elevation
  card: '#1A1F2E',
  cardElevated: '#212837',
  cardHover: '#252B3A',
  cardShadow: 'rgba(0, 0, 0, 0.3)',

  // Primary Blue System - Cyber Blue
  primary: '#0EA5E9',
  primaryLight: '#38BDF8',
  primaryDark: '#0284C7',
  primaryGradient: ['#0EA5E9', '#06B6D4'],

  // Accent System - Neon AI Colors
  accent: '#00F0FF',
  accentSecondary: '#4FC3F7',
  accentGradient: ['#00F0FF', '#00D9FF'],

  // Text System
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#1A1A1A',
  buttonText: '#FFFFFF',

  // Status Colors - Dark Mode Optimized
  success: '#34D399',
  successLight: '#064E3B',
  successDark: '#10B981',

  warning: '#FBBF24',
  warningLight: '#78350F',
  warningDark: '#F59E0B',

  error: '#F87171',
  errorLight: '#7F1D1D',
  errorDark: '#EF4444',

  info: '#60A5FA',
  infoLight: '#1E3A8A',
  infoDark: '#3B82F6',

  // Neutral Palette - Dark
  neutral50: '#1F2937',
  neutral100: '#1A1F2E',
  neutral200: '#2D3748',
  neutral300: '#4A5568',
  neutral400: '#718096',
  neutral500: '#A0AEC0',
  neutral600: '#CBD5E0',
  neutral700: '#E2E8F0',
  neutral800: '#EDF2F7',
  neutral900: '#F7FAFC',

  // Border System
  border: '#2D3748',
  borderLight: '#1F2937',
  borderDark: '#4A5568',

  // Drone Specific Colors
  droneActive: '#00F0FF',
  droneStandby: '#FCD34D',
  droneError: '#F87171',
  droneOffline: '#718096',

  // AI Processing Colors
  aiProcessing: '#A78BFA',
  aiComplete: '#34D399',
  aiQueue: '#FBBF24',

  // Overlay System
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.9)',

  // Glass Morphism
  glass: 'rgba(26, 31, 46, 0.8)',
  glassBlur: 100,
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

const ThemeContext = createContext({
  isDarkMode: true,
  theme: darkTheme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('darkMode');
        if (saved !== null) {
          setIsDarkMode(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem('darkMode', JSON.stringify(isDarkMode));
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    };
    saveTheme();
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
