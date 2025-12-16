import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import apiService from '../services/ApiService';
import PusherService from '../services/PusherService';

// Polling configuration
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function MonitoringScreen({ session, activeMenu, setActiveMenu, isDarkMode }) {
  const [blockProgress, setBlockProgress] = useState({
    inProgress: [], // [{ area: 'A', processed: 17, total: 300 }]
    complete: [],   // [{ area: 'B', processed: 250, total: 250 }]
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Real-time progress from pusher (aggregate count per block)
  // Format: { 'A': { detected: 50, undetected: 30, total_processed: 80 }, 'B': {...} }
  const [pusherProgress, setPusherProgress] = useState({});

  // Enhanced metrics state for comparing UploadDetails vs bird_drops_by_block
  const [comparisonMetrics, setComparisonMetrics] = useState({
    totalUploaded: 0,      // From UploadDetails API (start_uploads sum)
    totalInSystem: 0,      // From bird_drops_by_block API (total sum)
    totalDetected: 0,      // From bird_drops_by_block API (true_detection + false_detection)
    completionRate: 0,     // (totalDetected / totalUploaded) * 100
    sessionCount: 0,       // Number of upload sessions today
  });

  // Refs for timers
  const pollingIntervalRef = useRef(null);

  // Theme
  const theme = {
    background: isDarkMode ? '#001a33' : '#e6f2ff',
    text: isDarkMode ? '#fff' : '#0047AB',
    card: isDarkMode ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  };

  // Get area codes from session (from login response)
  const userAreaCodes = session?.area_code || [];
  const droneCode = session?.drone?.drone_code || 'N/A';

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

  // Pusher listener for real-time progress updates (aggregate batches)
  useEffect(() => {
    console.log('[Monitoring] Initializing pusher for block-progress events...');

    // Subscribe to block-progress channel
    const progressChannel = PusherService.subscribe('block-progress');

    // Bind event handler for aggregate progress updates
    progressChannel.bind('block-progress', (data) => {
      console.log('[Monitoring] 📩 Received block-progress event:', data);

      const areaCode = data.area_code;
      const detectedCount = data.detected_count || 0;
      const undetectedCount = data.undetected_count || 0;
      const totalProcessed = data.total_processed || 0;

      if (areaCode) {
        // SET progress (not increment) - this avoids lost events issue
        setPusherProgress((prev) => ({
          ...prev,
          [areaCode]: {
            detected: detectedCount,
            undetected: undetectedCount,
            total_processed: totalProcessed,
          },
        }));

        console.log(`[Monitoring] Updated progress for Block ${areaCode}:`, {
          detected: detectedCount,
          undetected: undetectedCount,
          total_processed: totalProcessed,
        });
      }
    });

    // Cleanup: Unbind and unsubscribe on unmount
    return () => {
      console.log('[Monitoring] Cleaning up pusher subscriptions...');
      progressChannel.unbind('block-progress');
      PusherService.unsubscribe('block-progress');
    };
  }, []);

  // Helper: Get today's date in YYYY-MM-DD format (Asia/Jakarta timezone)
  const getTodayDate = useCallback(() => {
    const now = new Date();
    const jakartaDateString = now.toLocaleString('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return jakartaDateString.split(',')[0];
  }, []);

  // Transform data: UploadDetails (total) + Pusher (real-time progress)
  // HYBRID: UploadDetails for total, Pusher for real-time detected/undetected counts
  const transformAPIDataToBlockProgress = useCallback((birdDropsData, uploadDetailsData) => {
    try {
      const inProgress = [];
      const complete = [];

      // Create map of total uploaded per block from UploadDetails
      const uploadedPerBlock = {};
      uploadDetailsData.forEach((session) => {
        const areaHandle = session.area_handle; // Now string format from backend
        const startUploads = session.start_uploads || 0;
        if (areaHandle) {
          uploadedPerBlock[areaHandle] = (uploadedPerBlock[areaHandle] || 0) + startUploads;
        }
      });

      // Process each block that has uploads
      Object.keys(uploadedPerBlock).forEach((areaCode) => {
        const totalUploaded = uploadedPerBlock[areaCode];

        // Get real-time progress from pusher (if available)
        const pusherData = pusherProgress[areaCode];
        const detectedCount = pusherData?.detected || 0;
        const undetectedCount = pusherData?.undetected || 0;
        const totalProcessed = pusherData?.total_processed || 0;

        const blockData = {
          area: areaCode,
          processed: totalProcessed,        // From pusher (real-time worker progress)
          total: totalUploaded,             // From UploadDetails (user uploaded count)
          detectedCount: detectedCount,     // From pusher (real-time detected count)
          undetectedCount: undetectedCount, // From pusher (real-time undetected count)
        };

        console.log(`[Monitoring] Block ${areaCode}: ${totalProcessed}/${totalUploaded} (${detectedCount} detected, ${undetectedCount} undetected) [Pusher: ${pusherData ? 'YES' : 'NO'}]`);

        // Categorize as complete or in progress
        if (totalUploaded > 0) {
          if (totalProcessed >= totalUploaded) {
            complete.push(blockData);
          } else {
            inProgress.push(blockData);
          }
        }
      });

      // Sort by area code
      inProgress.sort((a, b) => a.area.localeCompare(b.area));
      complete.sort((a, b) => a.area.localeCompare(b.area));

      setBlockProgress({ inProgress, complete });
      console.log('[Monitoring] Block progress updated:', {
        inProgressCount: inProgress.length,
        completeCount: complete.length,
        inProgress,
        complete,
      });
    } catch (error) {
      console.error('[Monitoring] Error transforming API data:', error);
    }
  }, [pusherProgress]);

  // Fetch monitoring statistics from API (Bird Drop Per Block endpoint + UploadDetails)
  const fetchStatsFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Monitoring] Fetching monitoring data from API...');

      const today = getTodayDate();

      // Fetch BOTH endpoints in parallel for comparison
      const [birdDropsResponse, uploadDetailsResponse] = await Promise.all([
        apiService.getDashboardBDPerBlock('today'),
        apiService.getUploadDetails(today),
      ]);

      console.log('[Monitoring] ✅ Bird Drops API response:', birdDropsResponse);
      console.log('[Monitoring] ✅ Upload Details API response:', uploadDetailsResponse);

      // Calculate metrics from bird_drops_by_block
      let totalInSystem = 0;
      let totalDetected = 0;

      const birdDropsData = (birdDropsResponse.success && birdDropsResponse.data) ? birdDropsResponse.data : [];
      const uploadDetailsData = (uploadDetailsResponse.success && uploadDetailsResponse.data) ? uploadDetailsResponse.data : [];

      birdDropsData.forEach((block) => {
        totalInSystem += block.total || 0;
        totalDetected += (block.true_detection || 0) + (block.false_detection || 0);
      });

      // Calculate metrics from UploadDetails
      let totalUploaded = 0;
      let sessionCount = uploadDetailsData.length;

      uploadDetailsData.forEach((session) => {
        totalUploaded += session.start_uploads || 0;
      });

      // Transform API data to block progress format (PASS BOTH DATASETS)
      transformAPIDataToBlockProgress(birdDropsData, uploadDetailsData);

      // Calculate completion rate
      const completionRate = totalUploaded > 0
        ? Math.round((totalDetected / totalUploaded) * 100)
        : 0;

      // Update comparison metrics
      setComparisonMetrics({
        totalUploaded,
        totalInSystem,
        totalDetected,
        completionRate,
        sessionCount,
      });

      console.log('[Monitoring] 📊 Comparison Metrics:', {
        totalUploaded,
        totalInSystem,
        totalDetected,
        completionRate: `${completionRate}%`,
        sessionCount,
      });

      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('[Monitoring] Error fetching stats from API:', error);

      // Don't show alert on background refresh errors
      if (refreshing) {
        Alert.alert('Error', 'Failed to fetch monitoring data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, getTodayDate, transformAPIDataToBlockProgress]);

  // Start polling (every 5 minutes)
  const startPolling = useCallback(() => {
    console.log('[Monitoring] Starting polling interval (5 minutes)...');

    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Setup new polling interval
    pollingIntervalRef.current = setInterval(() => {
      console.log('[Monitoring] 🔄 Polling: Fetching data from API...');
      fetchStatsFromAPI();
    }, POLLING_INTERVAL);
  }, [fetchStatsFromAPI]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[Monitoring] Polling stopped');
    }
  }, []);

  // Initial load and setup polling-only system (NO WebSocket/Pusher)
  useEffect(() => {
    console.log('[Monitoring] Initializing polling-based monitoring system...');

    // Initial data fetch
    fetchStatsFromAPI();

    // DISABLED: WebSocket/Pusher connection (not needed for production)
    // Only use API polling every 5 minutes
    // initializePusher(); // ❌ DISABLED - WebSocket not available

    // Setup polling as primary mechanism (every 5 minutes)
    startPolling();

    // Cleanup on unmount
    return () => {
      console.log('[Monitoring] Cleaning up monitoring system...');
      stopPolling();
      // disconnectPusher(); // ❌ DISABLED - No Pusher connection
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatsFromAPI();
  }, [fetchStatsFromAPI]);

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

  // Calculate total stats from block progress (for display)
  const totalUploaded = comparisonMetrics.totalUploaded || 0;
  const totalProcessed = comparisonMetrics.totalDetected || 0;
  const progress = comparisonMetrics.completionRate || 0;

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

            {/* Last Update Time & Data Source */}
            <View style={styles.lastUpdateContainer}>
              <View>
                <Text style={styles.lastUpdateText}>Last Update: {getTimeAgo()}</Text>
                <Text style={styles.dataSourceText}>
                  📊 Hybrid: Pusher (real-time progress) + API (total uploaded)
                </Text>
              </View>
              <TouchableOpacity onPress={fetchStatsFromAPI} style={styles.refreshButton}>
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

        {/* Detailed Comparison Metrics */}
        {comparisonMetrics.sessionCount > 0 && (
          <BlurView intensity={90} tint="light" style={styles.metricsDetailBlur}>
            <LinearGradient
              colors={['rgba(30,144,255,0.05)', 'rgba(0,191,255,0.03)']}
              style={styles.metricsDetailGradient}
            >
              <Text style={styles.metricsDetailTitle}>📊 Detailed Metrics</Text>
              <View style={styles.metricsDetailRow}>
                <View style={styles.metricsDetailItem}>
                  <Text style={styles.metricsDetailLabel}>Upload Sessions</Text>
                  <Text style={styles.metricsDetailValue}>{comparisonMetrics.sessionCount}</Text>
                </View>
                <View style={styles.metricsDetailDivider} />
                <View style={styles.metricsDetailItem}>
                  <Text style={styles.metricsDetailLabel}>Total Uploaded</Text>
                  <Text style={styles.metricsDetailValue}>{comparisonMetrics.totalUploaded}</Text>
                </View>
                <View style={styles.metricsDetailDivider} />
                <View style={styles.metricsDetailItem}>
                  <Text style={styles.metricsDetailLabel}>In System</Text>
                  <Text style={styles.metricsDetailValue}>{comparisonMetrics.totalInSystem}</Text>
                </View>
                <View style={styles.metricsDetailDivider} />
                <View style={styles.metricsDetailItem}>
                  <Text style={styles.metricsDetailLabel}>Detected</Text>
                  <Text style={styles.metricsDetailValue}>{comparisonMetrics.totalDetected}</Text>
                </View>
              </View>
              <Text style={styles.metricsDetailFootnote}>
                Data synced from UploadDetails & Bird Drops by Block APIs
              </Text>
            </LinearGradient>
          </BlurView>
        )}

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
                      blockProgress.inProgress.map((block) => {
                        const progressPercentage = block.total > 0 ? Math.round((block.processed / block.total) * 100) : 0;
                        return (
                          <View key={block.area} style={[styles.blockItem, { borderColor: '#FFC107' }]}>
                            <View style={styles.blockItemHeader}>
                              <Text style={[styles.blockAreaLabel, { color: '#FFC107' }]}>Block {block.area}</Text>
                              <Text style={[styles.blockProgressText, { color: '#FFC107' }]}>
                                {block.processed}/{block.total} ({progressPercentage}%)
                              </Text>
                            </View>

                            {/* Detection breakdown */}
                            <View style={styles.blockDetailRow}>
                              <Text style={styles.blockDetailText}>
                                ✅ Detected: <Text style={styles.blockDetailValue}>{block.detectedCount || 0}</Text>
                              </Text>
                              <Text style={styles.blockDetailText}>
                                ⚪ Undetected: <Text style={styles.blockDetailValue}>{block.undetectedCount || 0}</Text>
                              </Text>
                            </View>

                            <View style={styles.blockProgressBar}>
                              <LinearGradient
                                colors={['#FFC107', '#FF9800']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.blockProgressFill, { width: `${progressPercentage}%` }]}
                              />
                            </View>
                          </View>
                        );
                      })
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
                              {block.processed}/{block.total} (100%)
                            </Text>
                          </View>

                          {/* Detection breakdown */}
                          <View style={styles.blockDetailRow}>
                            <Text style={styles.blockDetailText}>
                              ✅ Detected: <Text style={styles.blockDetailValue}>{block.detectedCount || 0}</Text>
                            </Text>
                            <Text style={styles.blockDetailText}>
                              ⚪ Undetected: <Text style={styles.blockDetailValue}>{block.undetectedCount || 0}</Text>
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
  dataSourceText: {
    fontSize: 8,
    color: '#0EA5E9',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
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
  metricsDetailBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  metricsDetailGradient: {
    padding: 16,
  },
  metricsDetailTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  metricsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricsDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricsDetailLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#00BFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricsDetailValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E90FF',
  },
  metricsDetailDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(30,144,255,0.2)',
  },
  metricsDetailFootnote: {
    fontSize: 8,
    color: '#0EA5E9',
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
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
  blockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  blockDetailText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0047AB',
  },
  blockDetailValue: {
    fontWeight: '900',
    color: '#1E90FF',
    fontSize: 11,
  },
  sessionCountBadge: {
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
  },
  sessionCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF8F00',
    textAlign: 'center',
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
