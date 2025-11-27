import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const MENU_ITEMS = [
  { key: 'dashboard', icon: '', label: 'Dashboard' },
  { key: 'upload', icon: '', label: 'Upload' },
  { key: 'cases', icon: '', label: 'Cases' },
  { key: 'monitoring', icon: '', label: 'Monitoring' },
  { key: 'activitycontrol', icon: '', label: 'Activity Control' },
  { key: 'documentations', icon: '', label: 'Documentations' },
];

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 44;
const TAB_BORDER_RADIUS = 10;

export default function MainTabMenu({ activeMenu, onChangeMenu }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.surfaceAlt || '#F7F9FC',
          borderBottomColor: theme.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        decelerationRate={Platform.select({ ios: 0.95, android: 0.98 })}
        snapToAlignment="start"
        snapToInterval={(width / 5)}
        bounces={false}
        contentInset={{ left: 16, right: TAB_HEIGHT * 0.25 }}
        contentOffset={{ x: 0, y: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          {
            minWidth: width,
            paddingRight: TAB_HEIGHT * 0.5, // expose last tab
          },
        ]}
      >
        {MENU_ITEMS.map((item, index) => {
          const isActive = item.key === activeMenu;
          const isLast = index === MENU_ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onChangeMenu(item.key)}
              activeOpacity={0.9}
              style={[
                styles.item,
                {
                  backgroundColor: isActive ? '#0EA5E9' : 'transparent',
                  transform: [{ translateY: isActive ? -1.5 : 0 }],
                  minWidth: width / 5 - 18,
                  height: TAB_HEIGHT,
                  marginRight: isLast ? -TAB_HEIGHT * 0.5 : 0,
                },
                isActive ? styles.itemActive : styles.itemInactive,
              ]}
            >
              <Text
                style={[
                  styles.icon,
                  { color: isActive ? '#FFFFFF' : '#475569' },
                ]}
              >
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? '#FFFFFF' : '#475569' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
    borderRadius: TAB_BORDER_RADIUS,
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  itemActive: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: Platform.select({ android: 3, ios: 5 }),
  },
  itemInactive: {
    shadowOpacity: 0.08,
    elevation: Platform.select({ android: 1, ios: 2 }),
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});

