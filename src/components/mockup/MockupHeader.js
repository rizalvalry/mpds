import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, layout } from '../../constants/designSystem';
import { scale, scaleFontSize, getResponsivePadding } from '../../utils/responsive';

/**
 * Mockup Header Component
 * Exact replica dari fix-design mockups
 */

export const MockupHeader = ({ title, subtitle, droneId = 'Drone-001', time }) => {
  // Get current time if not provided
  const currentTime = time || new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      {/* Left: Title & Subtitle */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Right: Badges */}
      <View style={styles.badgeContainer}>
        {/* Drone ID Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>📷</Text>
          <Text style={styles.badgeText}>{droneId}</Text>
        </View>

        {/* Time Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>🕐</Text>
          <Text style={styles.badgeText}>{currentTime}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(layout.headerPadding),
    paddingVertical: scale(20),
    minHeight: scale(layout.headerHeight),
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: scaleFontSize(typography.headerTitle.fontSize),
    fontWeight: typography.headerTitle.fontWeight,
    color: typography.headerTitle.color,
    marginBottom: scale(4),
  },
  subtitle: {
    fontSize: scaleFontSize(typography.headerSubtitle.fontSize),
    fontWeight: typography.headerSubtitle.fontWeight,
    color: typography.headerSubtitle.color,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: scale(12),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    gap: scale(8),
  },
  badgeIcon: {
    fontSize: scaleFontSize(16),
  },
  badgeText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.textWhite,
  },
});
