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
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '../contexts/ThemeContext';
import apiService from '../services/ApiService';
import UploadScreen from './UploadScreen';
import CasesScreen from './CasesScreen';
import MonitoringScreen from './MonitoringScreen';
import UploadMockup from './UploadMockup';
import MonitoringMockup from './MonitoringMockup';
import DocumentationsScreen from './DocumentationsScreen';
import CasesMockup from './CasesMockup';
import DashboardComplete from './DashboardComplete';

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
  const [isLandscape, setIsLandscape] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard'); // dashboard, upload, cases, monitoring, documentations
  const [scrollY] = useState(new Animated.Value(0));
  const [bottomBarVisible, setBottomBarVisible] = useState(true);
  const [bottomBarHeight] = useState(new Animated.Value(0));

  // Animated values for smooth entrance
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  // Bottom bar toggle
  const toggleBottomBar = () => {
    Animated.spring(bottomBarHeight, {
      toValue: bottomBarVisible ? -200 : 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
    setBottomBarVisible(!bottomBarVisible);
  };

  // Orientation toggle function
  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (error) {
      console.error('Error changing orientation:', error);
      Alert.alert('Error', 'Failed to change orientation');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedFilter]);

  // Reload dashboard data when returning to dashboard menu
  useEffect(() => {
    if (activeMenu === 'dashboard' && !loading) {
      console.log('[Dashboard] Returning to dashboard, reloading data...');
      loadDashboardData();
    }
  }, [activeMenu]);

  // Set initial orientation to landscape on mount
  useEffect(() => {
    const setInitialOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      } catch (error) {
        console.error('Error setting initial orientation:', error);
      }
    };
    setInitialOrientation();
  }, []);

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

      // Check if error is session expired/invalid
      if (error.message === 'SESSION_EXPIRED' || error.message === 'SESSION_INVALID') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => setSession(null), // Trigger logout
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
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
          colors={['#00BFFF', '#1E90FF', '#0047AB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Motor Pool Drone System</Text>
              <Text style={styles.loadingSubtext}>Loading Dashboard Data...</Text>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Render Upload Screen - FULL MOCKUP (PERSIS seperti upload-menu.png)
  if (activeMenu === 'upload') {
    return <UploadMockup session={session} setActiveMenu={setActiveMenu} setSession={setSession} />;
  }

  // Render Cases Screen - FULL MOCKUP (PERSIS seperti cases-menu.png)
  if (activeMenu === 'cases') {
    return <CasesMockup session={session} setActiveMenu={setActiveMenu} setSession={setSession} />;
  }

  // Render Monitoring Screen - FULL MOCKUP (PERSIS seperti monitoring-menu.png)
  if (activeMenu === 'monitoring') {
    return <MonitoringMockup session={session} setActiveMenu={setActiveMenu} setSession={setSession} />;
  }

  // Render Documentations Screen - WebView
  if (activeMenu === 'documentations') {
    return <DocumentationsScreen session={session} setActiveMenu={setActiveMenu} setSession={setSession} />;
  }

  // Render Dashboard - Enhanced Dashboard dengan Charts (mengikuti Flutter)
  return <DashboardComplete session={session} setActiveMenu={setActiveMenu} setSession={setSession} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCard: {
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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
  // ======= MODERN 2025 STYLES =======
  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
  },
  headerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  headerTitleContainer: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  modernHeaderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  // Dark Storm Cloud Buttons
  darkStormButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2C3E50', // Dark storm cloud color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modernIcon: {
    fontSize: 20,
  },
  // Date Time Section
  dateTimeSection: {
    backgroundColor: 'rgba(30, 144, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginTop: 120, // Space for header
    borderLeftWidth: 4,
    borderLeftColor: '#1E90FF',
  },
  currentDateTime: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  currentTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  modernContentContainer: {
    padding: 20,
    paddingTop: 70,
  },
  modernFilterSection: {
    marginBottom: 24,
  },
  modernSectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  modernFilterChips: {
    flexDirection: 'row',
    gap: 12,
  },
  modernFilterButton: {
    flex: 1,
  },
  modernFilterActive: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  modernFilterTextActive: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modernFilterInactive: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  modernFilterTextInactive: {
    fontSize: 15,
    fontWeight: '600',
  },
  modernStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  modernStatsCard: {
    flex: 1,
    minWidth: '46%',
  },
  statsGradientCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsCardContent: {
    zIndex: 2,
  },
  modernStatsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modernStatsValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modernStatsTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  decorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -30,
    right: -30,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    bottom: -20,
    left: -20,
  },
  decorCircle3: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: 30,
    right: 20,
  },
  statsGlassOverlay: {
    flex: 1,
  },
  iconGlowContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  iconGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: -7,
    left: -7,
    opacity: 0.5,
  },
  shimmerLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    right: 40,
    transform: [{ skewX: '-15deg' }],
  },
  modernSection: {
    marginBottom: 24,
  },
  modernCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modernWorkerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modernItemBorder: {
    borderBottomWidth: 1,
  },
  modernWorkerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modernWorkerInfo: {
    flex: 1,
  },
  modernWorkerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernWorkerEmail: {
    fontSize: 13,
  },
  modernWorkerBadge: {
    marginLeft: 12,
  },
  badgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modernBlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  modernBlockIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  blockIconText: {
    fontSize: 24,
  },
  modernBlockInfo: {
    flex: 1,
  },
  modernBlockName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernBlockArea: {
    fontSize: 13,
  },
  modernBlockBadge: {
    marginLeft: 12,
  },
  // Update avatar with blue theme
  modernWorkerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernBlockIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  // Modern Curved Header Styles
  curvedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  curvedHeaderGradient: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headerTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCardContainer: {
    flex: 1,
    marginRight: 12,
  },
  titleCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  curvedHeaderTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  enhancedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 2,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  curvedHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
  },
  fixedHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  darkStormButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modernIcon: {
    fontSize: 18,
  },
  // Top Bar Container: Menu (Left 75%) + DateTime (Right 25%)
  topBarContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
    zIndex: 99,
  },
  topBarLeft: {
    flex: 3,
  },
  topBarRight: {
    flex: 1,
  },
  // Menu Navigation Styles (Left Side)
  menuNavBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  menuNavScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  menuNavItem: {
    marginHorizontal: 2,
  },
  menuNavActiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuNavInactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    backgroundColor: 'transparent',
  },
  menuNavIconActive: {
    fontSize: 16,
  },
  menuNavIconInactive: {
    fontSize: 14,
    opacity: 0.6,
  },
  menuNavTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  menuNavTextInactive: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  // DateTime Card Styles (Right Side)
  dateTimeBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  dateTimeGradientCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  dateTimeColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeIcon: {
    fontSize: 12,
  },
  dateTimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
  },
  dateTimeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0047AB',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E90FF',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
