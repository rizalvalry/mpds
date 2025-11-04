import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Card Component with multiple variants
 * Inspired by DJI, Skydio UI patterns
 */

export const Card = ({
  children,
  variant = 'default',
  elevated = false,
  glass = false,
  gradient = false,
  style,
  ...props
}) => {
  const { theme, isDarkMode } = useTheme();

  const variants = {
    default: {
      backgroundColor: theme.card,
      shadowColor: theme.cardShadow,
    },
    elevated: {
      backgroundColor: theme.cardElevated,
      shadowColor: theme.cardShadow,
      elevation: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.border,
    },
    success: {
      backgroundColor: theme.successLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.success,
    },
    warning: {
      backgroundColor: theme.warningLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.warning,
    },
    error: {
      backgroundColor: theme.errorLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    info: {
      backgroundColor: theme.infoLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.info,
    },
  };

  if (glass) {
    return (
      <BlurView
        intensity={theme.glassBlur}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            borderColor: theme.glassBorder,
            borderWidth: 1,
            overflow: 'hidden',
          },
          style
        ]}
        {...props}
      >
        {children}
      </BlurView>
    );
  }

  if (gradient) {
    return (
      <LinearGradient
        colors={theme.primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          styles.gradientCard,
          style
        ]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  const variantStyle = variants[variant] || variants.default;

  return (
    <View
      style={[
        styles.card,
        variantStyle,
        elevated && variants.elevated,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  style
}) => {
  const { theme } = useTheme();

  return (
    <Card variant={variant} elevated style={[styles.statCard, style]}>
      <View style={styles.statHeader}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.statContent}>
          <Text style={[styles.statTitle, { color: theme.textSecondary }]}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {value}
          </Text>
          {subtitle && (
            <Text style={[styles.statSubtitle, { color: theme.textTertiary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {trend && (
          <View style={[
            styles.trendBadge,
            { backgroundColor: trend > 0 ? theme.successLight : theme.errorLight }
          ]}>
            <Text style={[
              styles.trendText,
              { color: trend > 0 ? theme.success : theme.error }
            ]}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

import { Text } from 'react-native';

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gradientCard: {
    shadowColor: '#0078D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statCard: {
    minHeight: 120,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
