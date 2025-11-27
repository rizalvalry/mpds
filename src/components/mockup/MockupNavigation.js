import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, layout, shadows } from '../../constants/designSystem';
import { scale, scaleFontSize } from '../../utils/responsive';

/**
 * Mockup Navigation Bar Component
 * 4 tabs: Dashboard, Upload, Cases, Monitoring
 */

export const MockupNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '' },
    { id: 'upload', label: 'Upload', icon: '' },
    { id: 'cases', label: 'Cases', icon: '' },
    { id: 'monitoring', label: 'Monitoring', icon: '' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && styles.tabActive,
            ]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabText,
              isActive ? styles.tabTextActive : styles.tabTextInactive,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundWhite,
    paddingHorizontal: scale(layout.navBarPadding),
    paddingVertical: scale(12),
    gap: scale(12),
    ...shadows.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'transparent',
    gap: scale(8),
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.medium,
  },
  tabIcon: {
    fontSize: scaleFontSize(18),
  },
  tabText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.textWhite,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
});
