import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import apiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ session, setSession }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // State for dashboard data (sesuai Flutter)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [dashboardWorkers, setDashboardWorkers] = useState([]);
  const [dashboardBdPerBlock, setDashboardBdPerBlock] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('today'); // today, week, month

  // Animated values for smooth entrance
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadDashboardData();
  }, [selectedFilter]);

  useEffect(() => {
    if (!loading) {
      // Trigger entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data in parallel (sesuai Flutter)
      const [statusRes, workerRes, bdPerBlockRes] = await Promise.all([
        apiService.getDashboardStatus(selectedFilter),
        apiService.getDashboardWorker(selectedFilter),
        apiService.getDashboardBDPerBlock(selectedFilter),
      ]);

      console.log('[Dashboard] Status:', statusRes);
      console.log('[Dashboard] Workers:', workerRes);
      console.log('[Dashboard] BD Per Block:', bdPerBlockRes);

      if (statusRes.status_code === 200) {
        setDashboardStatus(statusRes.data);
      }

      if (workerRes.status_code === 200) {
        setDashboardWorkers(workerRes.data || []);
      }

      if (bdPerBlockRes.status_code === 200) {
        setDashboardBdPerBlock(bdPerBlockRes.data || []);
      }
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getTotalBirdDrops = () => {
    if (!dashboardStatus) return 0;
    return (dashboardStatus.pending || 0) +
           (dashboardStatus.true_detection || 0) +
           (dashboardStatus.false_detection || 0);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await apiService.logout();
            setSession(null);
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading Dashboard...</Text>
              <Text style={styles.loadingSubtext}>Fetching latest data</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0f0f1e' : '#f5f7fa' }]}>
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modernHeader}
      >
        {/* Glassmorphism overlay */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.modernHeaderTitle}>Drone AI</Text>
              <Text style={styles.modernHeaderSubtitle}>MPDS v2</Text>
            </View>
            <View style={styles.modernHeaderButtons}>
              <TouchableOpacity onPress={toggleTheme} style={styles.modernIconButton}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.iconGradient}
                >
                  <Text style={styles.modernIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.modernIconButton}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.iconGradient}
                >
                  <Text style={styles.modernIcon}>🚪</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content with Animation */}
      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={styles.modernContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Modern Filter Pills */}
          <View style={styles.modernFilterSection}>
            <Text style={[styles.modernSectionTitle, { color: theme.text }]}>
              📅 Time Period
            </Text>
            <View style={styles.modernFilterChips}>
              {['today', 'week', 'month'].map((filter, index) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={styles.modernFilterButton}
                >
                  {selectedFilter === filter ? (
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modernFilterActive}
                    >
                      <Text style={styles.modernFilterTextActive}>
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.modernFilterInactive, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.modernFilterTextInactive, { color: theme.text }]}>
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Modern Stats Cards with Gradients */}
          <View style={styles.modernStatsGrid}>
            <ModernStatsCard
              title="Total Cases"
              value={getTotalBirdDrops()}
              icon="📊"
              gradient={['#667eea', '#764ba2']}
              theme={theme}
            />
            <ModernStatsCard
              title="Pending"
              value={dashboardStatus?.pending || 0}
              icon="⏳"
              gradient={['#f093fb', '#f5576c']}
              theme={theme}
            />
            <ModernStatsCard
              title="True Detection"
              value={dashboardStatus?.true_detection || 0}
              icon="✅"
              gradient={['#4facfe', '#00f2fe']}
              theme={theme}
            />
            <ModernStatsCard
              title="False Detection"
              value={dashboardStatus?.false_detection || 0}
              icon="❌"
              gradient={['#fa709a', '#fee140']}
              theme={theme}
            />
          </View>

          {/* Modern Worker Performance Section */}
          <View style={styles.modernSection}>
            <Text style={[styles.modernSectionTitle, { color: theme.text }]}>
              👷 Worker Performance
            </Text>
            <View style={[styles.modernCard, { backgroundColor: theme.card }]}>
              {dashboardWorkers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No worker data available
                  </Text>
                </View>
              ) : (
                dashboardWorkers.map((worker, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modernWorkerItem,
                      index !== dashboardWorkers.length - 1 && styles.modernItemBorder,
                      { borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.modernWorkerAvatar}>
                      <Text style={styles.avatarText}>
                        {(worker.fullname || worker.username)?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modernWorkerInfo}>
                      <Text style={[styles.modernWorkerName, { color: theme.text }]}>
                        {worker.fullname || worker.username}
                      </Text>
                      <Text style={[styles.modernWorkerEmail, { color: theme.textSecondary }]}>
                        {worker.email}
                      </Text>
                    </View>
                    <View style={styles.modernWorkerBadge}>
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.badgeGradient}
                      >
                        <Text style={styles.badgeText}>{worker.count || 0}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Modern Bird Drops Per Block Section */}
          <View style={styles.modernSection}>
            <Text style={[styles.modernSectionTitle, { color: theme.text }]}>
              🗺️ Bird Drops Per Area
            </Text>
            <View style={[styles.modernCard, { backgroundColor: theme.card }]}>
              {dashboardBdPerBlock.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📍</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No area data available
                  </Text>
                </View>
              ) : (
                dashboardBdPerBlock.map((block, index) => (
                  <View
                    key={index}
                    style={[
                      styles.modernBlockItem,
                      index !== dashboardBdPerBlock.length - 1 && styles.modernItemBorder,
                      { borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.modernBlockIcon}>
                      <Text style={styles.blockIconText}>🏢</Text>
                    </View>
                    <View style={styles.modernBlockInfo}>
                      <Text style={[styles.modernBlockName, { color: theme.text }]}>
                        Block {block.block || 'Unknown'}
                      </Text>
                      <Text style={[styles.modernBlockArea, { color: theme.textSecondary }]}>
                        {block.area || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.modernBlockBadge}>
                      <LinearGradient
                        colors={['#4facfe', '#00f2fe']}
                        style={styles.badgeGradient}
                      >
                        <Text style={styles.badgeText}>{block.count || 0}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ height: 60 }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// Modern Stats Card Component with Gradient
function ModernStatsCard({ title, value, icon, gradient, theme }) {
  return (
    <View style={styles.modernStatsCard}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsGradientCard}
      >
        <View style={styles.statsCardContent}>
          <Text style={styles.modernStatsIcon}>{icon}</Text>
          <Text style={styles.modernStatsValue}>{value}</Text>
          <Text style={styles.modernStatsTitle}>{title}</Text>
        </View>
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  statsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  workerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  workerItemBorder: {
    borderBottomWidth: 1,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workerEmail: {
    fontSize: 12,
  },
  workerStats: {
    alignItems: 'flex-end',
  },
  workerCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  workerLabel: {
    fontSize: 11,
  },
  blockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  blockItemBorder: {
    borderBottomWidth: 1,
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  blockArea: {
    fontSize: 12,
  },
  blockStats: {
    alignItems: 'flex-end',
  },
  blockCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  blockLabel: {
    fontSize: 11,
  },
});
