import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import azureBlobService from '../services/AzureBlobService';

const { width } = Dimensions.get('window');

export default function MonitoringScreen({ session, setSession, activeMenu, setActiveMenu, isDarkMode }) {
  const [stats, setStats] = useState({
    input: 0,
    queued: 0,
    processed: 0,
    detected: 0,
    undetected: 0,
    total: 0,
    timestamp: null
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Theme
  const theme = {
    background: isDarkMode ? '#001a33' : '#e6f2ff',
    text: isDarkMode ? '#fff' : '#0047AB',
    card: isDarkMode ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulse animation for loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [loading]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStats();
      }, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch monitoring statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('[Monitoring] Fetching stats from Azure Blob Storage...');

      const data = await azureBlobService.getAllStats();

      setStats(data);
      setLastUpdateTime(new Date());
      console.log('[Monitoring] Stats updated:', data);
    } catch (error) {
      console.error('[Monitoring] Error fetching stats:', error);
      Alert.alert('Error', 'Failed to fetch monitoring data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    Alert.alert(
      'Auto-Refresh',
      autoRefresh
        ? 'Auto-refresh disabled'
        : 'Auto-refresh enabled (every 30 seconds)',
      [{ text: 'OK' }]
    );
  };

  // Calculate processing status
  const isProcessingComplete = stats.queued === 0;
  const processingPercentage = stats.total > 0
    ? Math.round((stats.processed / stats.total) * 100)
    : 0;

  // Format time ago
  const getTimeAgo = () => {
    if (!lastUpdateTime) return 'Never';
    const seconds = Math.floor((new Date() - lastUpdateTime) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#00BFFF', '#1E90FF', '#0047AB']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Monitoring</Text>
        <Text style={styles.headerSubtitle}>Azure Blob Storage File Monitoring</Text>
      </LinearGradient>

      {/* Top Bar: Menu Navigation + DateTime */}
      <View style={styles.topBarContainer}>
        {/* Left: Menu Navigation Bar - 75% Width */}
        <View style={styles.topBarLeft}>
          <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.menuNavBlur}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.menuNavScrollContent}
            >
              {/* Dashboard */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('dashboard')}
                activeOpacity={0.7}
              >
                {activeMenu === 'dashboard' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📊</Text>
                    <Text style={styles.menuNavTextActive}>Dashboard</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📊</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Dashboard</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Upload */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('upload')}
                activeOpacity={0.7}
              >
                {activeMenu === 'upload' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📤</Text>
                    <Text style={styles.menuNavTextActive}>Upload</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📤</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Upload</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cases */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('cases')}
                activeOpacity={0.7}
              >
                {activeMenu === 'cases' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📋</Text>
                    <Text style={styles.menuNavTextActive}>Cases</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📋</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Cases</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Monitoring */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('monitoring')}
                activeOpacity={0.7}
              >
                {activeMenu === 'monitoring' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📈</Text>
                    <Text style={styles.menuNavTextActive}>Monitoring</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📈</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Monitoring</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </View>

        {/* Right: DateTime Card - 25% Width */}
        <View style={styles.topBarRight}>
          <BlurView intensity={80} tint="light" style={styles.dateTimeBlurCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']}
              style={styles.dateTimeGradientCard}
            >
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🚁</Text>
                <Text style={styles.dateTimeText}>
                  {session?.drone?.drone_code || 'N/A'}
                </Text>
              </View>
              <View style={styles.dateTimeDivider} />
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🕒</Text>
                <Text style={styles.timeText}>
                  {currentTime.toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Futuristic Header */}
        <BlurView intensity={90} tint="light" style={styles.mainHeaderBlur}>
          <LinearGradient
            colors={['rgba(0,191,255,0.05)', 'rgba(30,144,255,0.08)', 'rgba(0,71,171,0.05)']}
            style={styles.mainHeaderGradient}
          >
            <View style={styles.mainHeaderContent}>
              <View style={styles.radarIconContainer}>
                <Animated.View style={[styles.radarPulse, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.radarIcon}>📡</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.mainHeaderTitle}>AZURE BLOB MONITOR</Text>
                <Text style={styles.mainHeaderSubtitle}>Real-time Storage Analytics</Text>
              </View>
              <TouchableOpacity
                onPress={toggleAutoRefresh}
                style={[styles.autoRefreshButton, autoRefresh && styles.autoRefreshActive]}
              >
                <Text style={styles.autoRefreshIcon}>{autoRefresh ? '🔄' : '⏸️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Last Update Time */}
            <View style={styles.lastUpdateContainer}>
              <Text style={styles.lastUpdateText}>Last Update: {getTimeAgo()}</Text>
              <TouchableOpacity onPress={fetchStats} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>

        {/* Processing Status Banner */}
        {isProcessingComplete ? (
          <BlurView intensity={90} tint="light" style={styles.statusBannerBlur}>
            <LinearGradient
              colors={['rgba(76,175,80,0.15)', 'rgba(102,187,106,0.1)']}
              style={styles.statusBannerGradient}
            >
              <Text style={styles.statusBannerIcon}>✅</Text>
              <View style={styles.statusBannerTextContainer}>
                <Text style={styles.statusBannerTitle}>ALL PROCESSING COMPLETE</Text>
                <Text style={styles.statusBannerSubtitle}>Queue is empty - System ready</Text>
              </View>
            </LinearGradient>
          </BlurView>
        ) : (
          <BlurView intensity={90} tint="light" style={styles.statusBannerBlur}>
            <LinearGradient
              colors={['rgba(255,193,7,0.15)', 'rgba(255,152,0,0.1)']}
              style={styles.statusBannerGradient}
            >
              <Animated.Text style={[styles.statusBannerIcon, { transform: [{ scale: pulseAnim }] }]}>
                ⚙️
              </Animated.Text>
              <View style={styles.statusBannerTextContainer}>
                <Text style={styles.statusBannerTitle}>PROCESSING IN PROGRESS</Text>
                <Text style={styles.statusBannerSubtitle}>{stats.queued} files in queue</Text>
              </View>
            </LinearGradient>
          </BlurView>
        )}

        {/* Pipeline Flow Visualization */}
        <BlurView intensity={90} tint="light" style={styles.pipelineBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.98)']}
            style={styles.pipelineGradient}
          >
            <Text style={styles.pipelineTitle}>PROCESSING PIPELINE</Text>

            {/* Stage 1: Upload → Input */}
            <View style={styles.stageContainer}>
              <View style={styles.stageHeader}>
                <View style={styles.stageNumberBadge}>
                  <LinearGradient colors={['#FF6B35', '#F7931E']} style={styles.stageNumberGradient}>
                    <Text style={styles.stageNumber}>1</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.stageTitle}>Upload</Text>
              </View>
              <BlurView intensity={80} tint="light" style={styles.stageCardBlur}>
                <LinearGradient
                  colors={['rgba(255,107,53,0.08)', 'rgba(247,147,30,0.05)']}
                  style={styles.stageCard}
                >
                  <Text style={styles.stageLabel}>INPUT FOLDER</Text>
                  <View style={styles.stageValueContainer}>
                    <Text style={[styles.stageValue, { color: '#FF6B35' }]}>{stats.input}</Text>
                    <Text style={styles.stageUnit}>files</Text>
                  </View>
                  <View style={styles.stageProgressBar}>
                    <View style={[styles.stageProgressFill, { width: '100%', backgroundColor: '#FF6B35' }]} />
                  </View>
                </LinearGradient>
              </BlurView>
              <View style={styles.stageArrow}>
                <Text style={styles.arrowIcon}>⬇️</Text>
              </View>
            </View>

            {/* Stage 2: Queued */}
            <View style={styles.stageContainer}>
              <View style={styles.stageHeader}>
                <View style={styles.stageNumberBadge}>
                  <LinearGradient colors={['#FFC107', '#FF9800']} style={styles.stageNumberGradient}>
                    <Text style={styles.stageNumber}>2</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.stageTitle}>Queue</Text>
              </View>
              <BlurView intensity={80} tint="light" style={styles.stageCardBlur}>
                <LinearGradient
                  colors={['rgba(255,193,7,0.08)', 'rgba(255,152,0,0.05)']}
                  style={styles.stageCard}
                >
                  <Text style={styles.stageLabel}>QUEUED FOLDER</Text>
                  <View style={styles.stageValueContainer}>
                    <Text style={[styles.stageValue, { color: '#FFC107' }]}>{stats.queued}</Text>
                    <Text style={styles.stageUnit}>waiting</Text>
                  </View>
                  <View style={styles.stageProgressBar}>
                    <View style={[styles.stageProgressFill, {
                      width: stats.total > 0 ? `${(stats.queued / stats.total) * 100}%` : '0%',
                      backgroundColor: '#FFC107'
                    }]} />
                  </View>
                  {stats.queued > 0 && (
                    <Animated.View style={[styles.processingIndicator, { transform: [{ scale: pulseAnim }] }]}>
                      <Text style={styles.processingText}>● Processing...</Text>
                    </Animated.View>
                  )}
                </LinearGradient>
              </BlurView>
              <View style={styles.stageArrow}>
                <Text style={styles.arrowIcon}>⬇️</Text>
              </View>
            </View>

            {/* Stage 3: Processed */}
            <View style={styles.stageContainer}>
              <View style={styles.stageHeader}>
                <View style={styles.stageNumberBadge}>
                  <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.stageNumberGradient}>
                    <Text style={styles.stageNumber}>3</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.stageTitle}>Processed</Text>
              </View>
              <BlurView intensity={80} tint="light" style={styles.stageCardBlur}>
                <LinearGradient
                  colors={['rgba(33,150,243,0.08)', 'rgba(25,118,210,0.05)']}
                  style={styles.stageCard}
                >
                  <Text style={styles.stageLabel}>PROCESSED TODAY</Text>
                  <View style={styles.stageValueContainer}>
                    <Text style={[styles.stageValue, { color: '#2196F3' }]}>{stats.processed}</Text>
                    <Text style={styles.stageUnit}>completed</Text>
                  </View>
                  <View style={styles.stageProgressBar}>
                    <View style={[styles.stageProgressFill, {
                      width: `${processingPercentage}%`,
                      backgroundColor: '#2196F3'
                    }]} />
                  </View>
                  <Text style={styles.percentageText}>{processingPercentage}% Complete</Text>
                </LinearGradient>
              </BlurView>
              <View style={styles.stageArrow}>
                <Text style={styles.arrowIcon}>⬇️</Text>
              </View>
            </View>

            {/* Stage 4: Output Results */}
            <View style={styles.stageContainer}>
              <View style={styles.stageHeader}>
                <View style={styles.stageNumberBadge}>
                  <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.stageNumberGradient}>
                    <Text style={styles.stageNumber}>4</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.stageTitle}>Results</Text>
              </View>
              <View style={styles.outputResultsContainer}>
                {/* Detected */}
                <BlurView intensity={80} tint="light" style={styles.outputCardBlur}>
                  <LinearGradient
                    colors={['rgba(76,175,80,0.08)', 'rgba(102,187,106,0.05)']}
                    style={styles.outputCard}
                  >
                    <Text style={styles.outputCardIcon}>✅</Text>
                    <Text style={styles.outputCardLabel}>DETECTED</Text>
                    <Text style={[styles.outputCardValue, { color: '#4CAF50' }]}>{stats.detected}</Text>
                  </LinearGradient>
                </BlurView>

                {/* Undetected */}
                <BlurView intensity={80} tint="light" style={styles.outputCardBlur}>
                  <LinearGradient
                    colors={['rgba(158,158,158,0.08)', 'rgba(117,117,117,0.05)']}
                    style={styles.outputCard}
                  >
                    <Text style={styles.outputCardIcon}>⬜</Text>
                    <Text style={styles.outputCardLabel}>UNDETECTED</Text>
                    <Text style={[styles.outputCardValue, { color: '#9E9E9E' }]}>{stats.undetected}</Text>
                  </LinearGradient>
                </BlurView>
              </View>
            </View>
          </LinearGradient>
        </BlurView>

        {/* System Info */}
        <BlurView intensity={80} tint="light" style={styles.systemInfoBlur}>
          <LinearGradient
            colors={['rgba(0,191,255,0.05)', 'rgba(30,144,255,0.08)']}
            style={styles.systemInfoGradient}
          >
            <Text style={styles.systemInfoTitle}>SYSTEM INFORMATION</Text>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemInfoLabel}>Storage Account:</Text>
              <Text style={styles.systemInfoValue}>azmaisap100</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemInfoLabel}>Container:</Text>
              <Text style={styles.systemInfoValue}>imagedetection</Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemInfoLabel}>Auto-Refresh:</Text>
              <Text style={[styles.systemInfoValue, { color: autoRefresh ? '#4CAF50' : '#F44336' }]}>
                {autoRefresh ? 'ENABLED (30s)' : 'DISABLED'}
              </Text>
            </View>
            <View style={styles.systemInfoRow}>
              <Text style={styles.systemInfoLabel}>Status:</Text>
              <Text style={[styles.systemInfoValue, { color: isProcessingComplete ? '#4CAF50' : '#FFC107' }]}>
                {isProcessingComplete ? 'IDLE' : 'PROCESSING'}
              </Text>
            </View>
          </LinearGradient>
        </BlurView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f2ff',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
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
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 12,
  },
  mainHeaderBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainHeaderGradient: {
    padding: 16,
  },
  mainHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radarIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  radarPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,191,255,0.3)',
  },
  radarIcon: {
    fontSize: 40,
  },
  headerTextContainer: {
    flex: 1,
  },
  mainHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mainHeaderSubtitle: {
    fontSize: 10,
    color: '#00BFFF',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  autoRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(158,158,158,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  autoRefreshActive: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderColor: '#4CAF50',
  },
  autoRefreshIcon: {
    fontSize: 20,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,191,255,0.2)',
  },
  lastUpdateText: {
    fontSize: 10,
    color: '#00BFFF',
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'rgba(0,191,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,191,255,0.3)',
  },
  refreshButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0047AB',
  },
  statusBannerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  statusBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statusBannerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusBannerTextContainer: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusBannerSubtitle: {
    fontSize: 11,
    color: '#00BFFF',
    fontWeight: '600',
  },
  pipelineBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pipelineGradient: {
    padding: 16,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  stageContainer: {
    marginBottom: 12,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
  },
  stageNumberGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0047AB',
    letterSpacing: 0.5,
  },
  stageCardBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  stageCard: {
    padding: 16,
  },
  stageLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0047AB',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stageValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  stageValue: {
    fontSize: 32,
    fontWeight: '900',
    marginRight: 8,
  },
  stageUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00BFFF',
  },
  stageProgressBar: {
    height: 8,
    backgroundColor: 'rgba(0,191,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stageProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  processingIndicator: {
    marginTop: 8,
  },
  processingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFC107',
  },
  percentageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00BFFF',
    marginTop: 6,
  },
  stageArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  arrowIcon: {
    fontSize: 24,
  },
  outputResultsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  outputCardBlur: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  outputCard: {
    padding: 16,
    alignItems: 'center',
  },
  outputCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  outputCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0047AB',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  outputCardValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  systemInfoBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  systemInfoGradient: {
    padding: 16,
  },
  systemInfoTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
    marginBottom: 12,
  },
  systemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,191,255,0.1)',
  },
  systemInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00BFFF',
  },
  systemInfoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0047AB',
  },
});
