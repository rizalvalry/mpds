import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Header Component with Gradient
 * Inspired by DJI GO app and Azure IoT design
 */

export const Header = ({
  title,
  subtitle,
  badge,
  rightComponent,
  gradient = true,
  style,
}) => {
  const { theme, isDarkMode } = useTheme();

  const content = (
    <View style={[styles.container, style]}>
      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: gradient ? '#FFFFFF' : theme.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: gradient ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {(badge || rightComponent) && (
          <View style={styles.rightContainer}>
            {badge && (
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                {typeof badge === 'string' ? (
                  <Text style={styles.badgeText}>{badge}</Text>
                ) : (
                  badge
                )}
              </View>
            )}
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={isDarkMode ? ['#1A1F2E', '#2D3748'] : theme.primaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.gradientContainer, { backgroundColor: theme.card }]}>
      {content}
    </View>
  );
};

export const PageHeader = ({
  title,
  subtitle,
  badge,
  icon,
  stats,
  gradient = true,
}) => {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.pageHeader}
    >
      <View style={styles.pageHeaderContent}>
        <View style={styles.pageHeaderMain}>
          {icon && <View style={styles.pageIcon}>{icon}</View>}
          <View style={styles.pageTitleContainer}>
            <Text style={styles.pageTitle}>{title}</Text>
            {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
          </View>
        </View>

        {badge && (
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {stats && (
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.85,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Page Header Styles
  pageHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pageTitleContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  pageBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pageBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});
