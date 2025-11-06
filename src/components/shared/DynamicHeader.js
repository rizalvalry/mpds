import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../services/ApiService';

export default function DynamicHeader({
  title,
  subtitle,
  session,
  setSession,
  onThemeToggle,
  isDarkMode = false,
}) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await apiService.logout();
              setSession(null);
            } catch (error) {
              console.error('[DynamicHeader] Logout error:', error);
              setSession(null); // Force logout anyway
            }
          },
        },
      ]
    );
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <>
      <LinearGradient
        colors={['#1E9BE9', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Drone Code Badge */}
          <View style={styles.droneBadge}>
            <Text style={styles.droneIcon}>📷</Text>
            <Text style={styles.droneText}>
              {session?.drone?.drone_code || 'Drone-001'}
            </Text>
          </View>

          {/* Clock Badge */}
          <View style={styles.clockBadge}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.clockText}>{formatTime(currentTime)}</Text>
          </View>

          {/* Burger Menu Button */}
          <TouchableOpacity
            onPress={() => setShowSettingsMenu(!showSettingsMenu)}
            style={styles.burgerButton}
          >
            <Image
              source={require('../../../assets/burger-tab.png')}
              style={styles.burgerIcon}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Overlay to close menu when clicking outside */}
      {showSettingsMenu && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        />
      )}

      {/* Settings Dropdown Menu */}
      {showSettingsMenu && (
        <View style={styles.settingsMenu}>
          {/* Theme Toggle */}
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={(value) => {
                if (onThemeToggle) {
                  onThemeToggle(value);
                }
              }}
              trackColor={{ false: '#D1D5DB', true: '#0EA5E9' }}
              thumbColor={isDarkMode ? '#FFFFFF' : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>

          {/* Divider */}
          <View style={styles.menuDivider} />

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              setShowSettingsMenu(false);
              handleLogout();
            }}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  droneBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  droneIcon: {
    fontSize: 16,
  },
  droneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clockBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockIcon: {
    fontSize: 16,
  },
  clockText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  burgerButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  burgerIcon: {
    width: 24,
    height: 24,
    // tintColor: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  settingsMenu: {
    position: 'absolute',
    top: 60,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
