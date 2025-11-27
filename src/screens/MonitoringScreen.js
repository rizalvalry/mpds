import React, { useState, useEffect, useCallback } from 'react';
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

const { width } = Dimensions.get('window');

// TODO: Replace with actual API calls when endpoints are ready
const API_BASE_URL = 'https://droneark.bsi.co.id/api';

export default function MonitoringScreen({ session, setSession, activeMenu, setActiveMenu, isDarkMode }) {
  const [blockProgress, setBlockProgress] = useState({
    inProgress: [], // [{ area: 'A', processed: 17, total: 300 }]
    complete: [],   // [{ area: 'B', processed: 250, total: 250 }]
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Theme
  const theme = {
    background: isDarkMode ? '#001a33' : '#e6f2ff',
    text: isDarkMode ? '#fff' : '#0047AB',
    card: isDarkMode ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  };

  // Get area codes from session (from login response)
  const userAreaCodes = session?.area_code || [];
  const droneCode = session?.drone?.drone_code || 'N/A';
  const username = session?.username || 'User';

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

  // Initial load and auto-refresh every 10 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch monitoring statistics from API
  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('[Monitoring] Fetching stats from API...');

      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/upload/today`, {
      //   headers: {
      //     'Authorization': `Bearer ${session?.session_token}`,
      //   },
      // });
      // const data = await response.json();

      // MOCK DATA for testing (remove when API is ready)
      const mockData = [
        {
          id: 1,
          operator: 'DP003',
          start_uploads: 530,
          end_uploads: 0,
          area_handle: ['C', 'D', 'K', 'L'],
          status: 'in_progress',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          operator: 'DP005',
          start_uploads: 316,
          end_uploads: 316,
          area_handle: ['B', 'K'],
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      ];

      // Process data and calculate block progress
      calculateBlockProgress(mockData);
      setLastUpdateTime(new Date());

      console.log('[Monitoring] Stats updated successfully');
    } catch (error) {
      console.error('[Monitoring] Error fetching stats:', error);
      // Don't show alert on auto-refresh errors
      if (refreshing) {
        Alert.alert('Error', 'Failed to fetch monitoring data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate block progress from upload data
  const calculateBlockProgress = (uploadData) => {
    const inProgress = [];
    const complete = [];
    const areaMap = {}; // { 'C': { total: 530, processed: 17 } }

    // Aggregate by area code
    uploadData.forEach((upload) => {
      upload.area_handle.forEach((area) => {
        if (!areaMap[area]) {
          areaMap[area] = {
            total: 0,
            processed: 0, // TODO: Get from Pusher or API
          };
        }
        areaMap[area].total += upload.start_uploads;
        // TODO: Add processed count from backend
        // For now, mock some progress
        areaMap[area].processed += Math.floor(upload.end_uploads / upload.area_handle.length);
      });
    });

    // Split into In Progress and Complete
    Object.entries(areaMap).forEach(([area, data]) => {
      const blockData = {
        area,
        processed: data.processed,
        total: data.total,
      };

      if (data.processed >= data.total && data.total > 0) {
        complete.push(blockData);
      } else {
        inProgress.push(blockData);
      }
    });

    // Sort by area code
    inProgress.sort((a, b) => a.area.localeCompare(b.area));
    complete.sort((a, b) => a.area.localeCompare(b.area));

    setBlockProgress({ inProgress, complete });
  };

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

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

  // Calculate total stats
  const totalUploaded = blockProgress.inProgress.reduce((sum, b) => sum + b.total, 0) +
                       blockProgress.complete.reduce((sum, b) => sum + b.total, 0);
  const totalProcessed = blockProgress.inProgress.reduce((sum, b) => sum + b.processed, 0) +
                        blockProgress.complete.reduce((sum, b) => sum + b.processed, 0);
  const progress = totalUploaded > 0 ? Math.round((totalProcessed / totalUploaded) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#00BFFF', '#1E90FF', '#0047AB']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Monitoring</Text>
        <Text style={styles.headerSubtitle}>Real-time Upload Progress Tracking</Text>
      </LinearGradient>

      {/* Top Bar: Menu Navigation + DateTime + Area Code */}
      <View style={styles.topBarContainer}>
        {/* Left: Menu Navigation Bar - 50% Width */}
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

        {/* Right: DateTime + Area Code Card - 50% Width */}
        <View style={styles.topBarRight}>
          <BlurView intensity={80} tint="light" style={styles.infoBlurCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']}
              style={styles.infoGradientCard}
            >
              {/* Drone Code */}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🚁</Text>
                <Text style={styles.infoText}>{droneCode}</Text>
              </View>

              <View style={styles.infoDivider} />

              {/* Area Codes */}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>
                  {userAreaCodes.length > 0 ? userAreaCodes.join(', ') : 'N/A'}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              {/* Time */}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🕒</Text>
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
                <Text style={styles.mainHeaderTitle}>UPLOAD PROGRESS MONITOR</Text>
                <Text style={styles.mainHeaderSubtitle}>Track your daily uploads</Text>
              </View>
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

        {/* Upload Summary Cards */}
        <View style={styles.summaryCardsContainer}>
          {/* Total Uploaded */}
          <BlurView intensity={90} tint="light" style={styles.summaryCardBlur}>
            <LinearGradient
              colors={['rgba(0,191,255,0.08)', 'rgba(30,144,255,0.05)']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardIcon}>📤</Text>
              <Text style={styles.summaryCardLabel}>UPLOADED</Text>
              <Text style={[styles.summaryCardValue, { color: '#00BFFF' }]}>{totalUploaded}</Text>
              <Text style={styles.summaryCardUnit}>files</Text>
            </LinearGradient>
          </BlurView>

          {/* Total Processed */}
          <BlurView intensity={90} tint="light" style={styles.summaryCardBlur}>
            <LinearGradient
              colors={['rgba(76,175,80,0.08)', 'rgba(102,187,106,0.05)']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardIcon}>✅</Text>
              <Text style={styles.summaryCardLabel}>PROCESSED</Text>
              <Text style={[styles.summaryCardValue, { color: '#4CAF50' }]}>{totalProcessed}</Text>
              <Text style={styles.summaryCardUnit}>files</Text>
            </LinearGradient>
          </BlurView>

          {/* Progress Percentage */}
          <BlurView intensity={90} tint="light" style={styles.summaryCardBlur}>
            <LinearGradient
              colors={['rgba(255,193,7,0.08)', 'rgba(255,152,0,0.05)']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryCardIcon}>📊</Text>
              <Text style={styles.summaryCardLabel}>PROGRESS</Text>
              <Text style={[styles.summaryCardValue, { color: '#FFC107' }]}>{progress}%</Text>
              <Text style={styles.summaryCardUnit}>complete</Text>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Overall Progress Bar */}
        <BlurView intensity={90} tint="light" style={styles.progressBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.98)']}
            style={styles.progressGradient}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>OVERALL PROGRESS</Text>
              <Text style={styles.progressPercentage}>{progress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressSubtext}>
              {totalProcessed} / {totalUploaded} files completed
            </Text>
          </LinearGradient>
        </BlurView>

        {/* 2-Panel Block Progress Display */}
        {totalUploaded > 0 ? (
          <View style={styles.blockProgressContainer}>
            {/* Left Panel: In Progress (Yellow) */}
            <View style={styles.blockPanel}>
              <BlurView intensity={90} tint="light" style={styles.blockPanelBlur}>
                <LinearGradient
                  colors={['rgba(255,193,7,0.08)', 'rgba(255,152,0,0.05)']}
                  style={styles.blockPanelGradient}
                >
                  <View style={styles.blockPanelHeader}>
                    <Text style={styles.blockPanelIcon}>⏳</Text>
                    <Text style={[styles.blockPanelTitle, { color: '#FFC107' }]}>IN PROGRESS</Text>
                  </View>

                  <ScrollView style={styles.blockList} showsVerticalScrollIndicator={false}>
                    {blockProgress.inProgress.length === 0 ? (
                      <View style={styles.emptyBlockState}>
                        <Text style={styles.emptyBlockIcon}>✨</Text>
                        <Text style={styles.emptyBlockText}>All blocks complete!</Text>
                      </View>
                    ) : (
                      blockProgress.inProgress.map((block) => (
                        <View key={block.area} style={[styles.blockItem, { borderColor: '#FFC107' }]}>
                          <View style={styles.blockItemHeader}>
                            <Text style={[styles.blockAreaLabel, { color: '#FFC107' }]}>Block {block.area}</Text>
                            <Text style={[styles.blockProgressText, { color: '#FFC107' }]}>
                              {block.processed}/{block.total}
                            </Text>
                          </View>
                          <View style={styles.blockProgressBar}>
                            <LinearGradient
                              colors={['#FFC107', '#FF9800']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.blockProgressFill, {
                                width: `${block.total > 0 ? (block.processed / block.total) * 100 : 0}%`
                              }]}
                            />
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </LinearGradient>
              </BlurView>
            </View>

            {/* Right Panel: Complete (Green) */}
            <View style={styles.blockPanel}>
              <BlurView intensity={90} tint="light" style={styles.blockPanelBlur}>
                <LinearGradient
                  colors={['rgba(76,175,80,0.08)', 'rgba(102,187,106,0.05)']}
                  style={styles.blockPanelGradient}
                >
                  <View style={styles.blockPanelHeader}>
                    <Text style={styles.blockPanelIcon}>✅</Text>
                    <Text style={[styles.blockPanelTitle, { color: '#4CAF50' }]}>COMPLETE</Text>
                  </View>

                  <ScrollView style={styles.blockList} showsVerticalScrollIndicator={false}>
                    {blockProgress.complete.length === 0 ? (
                      <View style={styles.emptyBlockState}>
                        <Text style={styles.emptyBlockIcon}>⏳</Text>
                        <Text style={styles.emptyBlockText}>No completed blocks yet</Text>
                      </View>
                    ) : (
                      blockProgress.complete.map((block) => (
                        <View key={block.area} style={[styles.blockItem, { borderColor: '#4CAF50' }]}>
                          <View style={styles.blockItemHeader}>
                            <Text style={[styles.blockAreaLabel, { color: '#4CAF50' }]}>Block {block.area}</Text>
                            <Text style={[styles.blockProgressText, { color: '#4CAF50' }]}>
                              {block.processed}/{block.total}
                            </Text>
                          </View>
                          <View style={styles.blockProgressBar}>
                            <LinearGradient
                              colors={['#4CAF50', '#66BB6A']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[styles.blockProgressFill, { width: '100%' }]}
                            />
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </LinearGradient>
              </BlurView>
            </View>
          </View>
        ) : (
          /* Empty State */
          <BlurView intensity={90} tint="light" style={styles.emptyStateBlur}>
            <LinearGradient
              colors={['rgba(158,158,158,0.08)', 'rgba(117,117,117,0.05)']}
              style={styles.emptyStateGradient}
            >
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateTitle}>No Uploads Today</Text>
              <Text style={styles.emptyStateSubtitle}>
                Upload files in the Upload tab to start tracking progress
              </Text>
              <Text style={styles.apiWaitingText}>
                ⏳ Waiting for API endpoints to be configured...
              </Text>
            </LinearGradient>
          </BlurView>
        )}

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
    flex: 1,
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
  infoBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  infoGradientCard: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoIcon: {
    fontSize: 10,
  },
  infoText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0047AB',
  },
  timeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E90FF',
  },
  infoDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
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
  summaryCardsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCardBlur: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryCard: {
    padding: 16,
    alignItems: 'center',
  },
  summaryCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  summaryCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0047AB',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  summaryCardUnit: {
    fontSize: 10,
    color: '#00BFFF',
    fontWeight: '600',
  },
  progressBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressGradient: {
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4CAF50',
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressSubtext: {
    fontSize: 10,
    color: '#00BFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  blockProgressContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  blockPanel: {
    flex: 1,
  },
  blockPanelBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 300,
  },
  blockPanelGradient: {
    flex: 1,
    padding: 16,
  },
  blockPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,191,255,0.2)',
  },
  blockPanelIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  blockPanelTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  blockList: {
    flex: 1,
  },
  blockItem: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  blockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockAreaLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  blockProgressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  blockProgressBar: {
    height: 6,
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  blockProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyBlockState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyBlockIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyBlockText: {
    fontSize: 12,
    color: '#00BFFF',
    fontWeight: '600',
  },
  emptyStateBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  emptyStateGradient: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#00BFFF',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  apiWaitingText: {
    fontSize: 10,
    color: '#FFC107',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
