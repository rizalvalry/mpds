import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { getMonitoringPanelsData, getTodayStatistics } from '../utils/uploadSessionStorage';
import pusherService from '../services/PusherService'; // RE-ENABLED for real-time updates
import monitoringDataService from '../services/MonitoringDataService';
import apiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function MonitoringMockup({
  session,
  setActiveMenu,
  setSession,
  embedded = false,
  onNavigate,
}) {
  const [panelsData, setPanelsData] = useState({
    inProgress: [],
    completed: [],
    totalUploaded: 0,
    totalProcessed: 0,
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes = 300 seconds
  const { theme } = useTheme();

  // Pusher health monitoring
  const [pusherStatus, setPusherStatus] = useState('connecting'); // 'connected', 'disconnected', 'degraded'
  const [lastPusherEvent, setLastPusherEvent] = useState(Date.now());
  const [pollingMode, setPollingMode] = useState('normal'); // 'normal' (5min) or 'aggressive' (1min)

  // Refs to track component mount state and prevent memory leaks
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const pusherHealthCheckRef = useRef(null);

  // Polling intervals
  const NORMAL_POLLING = 5 * 60 * 1000;    // 5 minutes
  const AGGRESSIVE_POLLING = 1 * 60 * 1000; // 1 minute
  const PUSHER_SILENCE_THRESHOLD = 3 * 60 * 1000; // 3 minutes without events

  // Initialize countdown from global shared storage (persistent across all devices)
  useEffect(() => {
    const initCountdown = async () => {
      try {
        // Fetch current server time from API to sync countdown
        const response = await apiService.getDashboardBDPerBlock('today');
        // Use countdown based on last fetch, not device time
        // This ensures all devices show similar countdown
        const savedCountdown = await AsyncStorage.getItem('monitoring_countdown_value');
        if (savedCountdown) {
          const savedValue = parseInt(savedCountdown, 10);
          // Only use saved value if it's reasonable (0-300)
          if (savedValue >= 0 && savedValue <= 300) {
            setCountdown(savedValue);
          }
        }
      } catch (error) {
        console.error('[MonitoringMockup] Error loading countdown:', error);
      }
    };
    initCountdown();
  }, []);

  // Function to start/stop polling based on Pusher health
  const managePolling = useCallback((shouldPoll) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (shouldPoll) {
      // Start aggressive polling (1 minute) when Pusher is degraded/offline
      console.log('[MonitoringMockup] 🔄 Starting aggressive polling (1 min)');

      pollingIntervalRef.current = setInterval(() => {
        console.log('[MonitoringMockup] 🔄 Polling: Fetching data from API...');
        loadData(false);
        setCountdown(60); // Reset to 1 minute
        AsyncStorage.setItem('monitoring_countdown_value', '60');
      }, AGGRESSIVE_POLLING);

      // Set initial countdown
      setCountdown(60);
      AsyncStorage.setItem('monitoring_countdown_value', '60');
      setPollingMode('aggressive');
    } else {
      // Stop polling - pure real-time mode
      console.log('[MonitoringMockup] ✅ Stopping polling - pure real-time mode');
      setPollingMode('normal');
      setCountdown(0); // No countdown in real-time mode
    }
  }, [AGGRESSIVE_POLLING, loadData]);

  // Setup initial data load and countdown timer
  useEffect(() => {
    console.log('[MonitoringMockup] Component mounted, loading initial data...');
    isMountedRef.current = true;

    // Initial load
    loadData();

    // DON'T start polling - wait for Pusher health check to determine if needed
    console.log('[MonitoringMockup] Starting in pure real-time mode (no polling)');

    // Setup countdown timer (only runs when in aggressive polling mode)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        // Only decrement if in aggressive mode (degraded/disconnected)
        if (pollingMode === 'aggressive') {
          const newValue = prev > 0 ? prev - 1 : 60;
          AsyncStorage.setItem('monitoring_countdown_value', newValue.toString());
          return newValue;
        }
        return 0; // No countdown in real-time mode
      });
    }, 1000);

    return () => {
      console.log('[MonitoringMockup] Component unmounting, cleaning up...');
      isMountedRef.current = false;

      // Clear intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (pusherHealthCheckRef.current) {
        clearInterval(pusherHealthCheckRef.current);
      }
    };
  }, [loadData, pollingMode]);

  // RE-ENABLED: Pusher/WebSocket connection for real-time updates
  useEffect(() => {
    console.log('[MonitoringMockup] Setting up Pusher connection...');

    const handleFileDetected = (data) => {
      console.log('[MonitoringMockup] 📡 Pusher event received:', data);

      // Update last event timestamp
      setLastPusherEvent(Date.now());
      setPusherStatus('connected');

      // Stop polling if we're in aggressive mode - back to pure real-time
      if (pollingMode === 'aggressive') {
        console.log('[MonitoringMockup] ✅ Pusher recovered, stopping polling');
        managePolling(false); // Stop polling, go back to real-time
      }

      // Reload data when file detected
      loadData(false);
    };

    pusherService.connect(handleFileDetected);

    return () => {
      console.log('[MonitoringMockup] Disconnecting Pusher...');
      pusherService.disconnect();
    };
  }, [loadData, pollingMode, managePolling]);

  // Pusher health check - detect silence and connection issues
  useEffect(() => {
    console.log('[MonitoringMockup] Starting Pusher health monitoring...');

    // Check Pusher health every 30 seconds
    pusherHealthCheckRef.current = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastPusherEvent;
      const pusherConnected = pusherService.getConnectionStatus();

      console.log('[MonitoringMockup] 🏥 Health check:', {
        timeSinceLastEvent: `${Math.round(timeSinceLastEvent / 1000)}s`,
        pusherConnected,
        currentMode: pollingMode,
      });

      // Scenario 1: Pusher disconnected
      if (!pusherConnected) {
        console.warn('[MonitoringMockup] ⚠️ Pusher disconnected, starting polling');
        setPusherStatus('disconnected');
        if (pollingMode !== 'aggressive') {
          managePolling(true); // Start 1min polling
        }
        return;
      }

      // Scenario 2: Pusher connected but silent for too long (possibly rate limited)
      if (timeSinceLastEvent > PUSHER_SILENCE_THRESHOLD) {
        console.warn(`[MonitoringMockup] ⚠️ Pusher silent for ${Math.round(timeSinceLastEvent / 1000)}s, assuming degraded/limited`);
        setPusherStatus('degraded');
        if (pollingMode !== 'aggressive') {
          managePolling(true); // Start 1min polling
        }
        return;
      }

      // Scenario 3: Everything is fine - Pure real-time mode
      if (pusherConnected && timeSinceLastEvent <= PUSHER_SILENCE_THRESHOLD) {
        setPusherStatus('connected');
        if (pollingMode !== 'normal') {
          console.log('[MonitoringMockup] ✅ Pusher healthy, stopping polling');
          managePolling(false); // Stop polling, pure real-time
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (pusherHealthCheckRef.current) {
        clearInterval(pusherHealthCheckRef.current);
      }
    };
  }, [lastPusherEvent, pollingMode, managePolling, PUSHER_SILENCE_THRESHOLD]);

  // Load monitoring data directly from bird_drops_by_block API
  const loadData = useCallback(async (showLoading = true) => {
    try {
      // Safety check: don't execute if component is unmounted
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted, aborting loadData');
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      console.log('[MonitoringMockup] Fetching data from API...');

      // Get today's date in Jakarta timezone
      const today = monitoringDataService.getTodayDate();

      // Fetch BOTH APIs in parallel
      const [birdDropsResponse, uploadDetailsResponse] = await Promise.all([
        apiService.getDashboardBDPerBlock('today'),
        apiService.getUploadDetails(today),
      ]);

      console.log('[MonitoringMockup] ✅ Bird Drops response:', birdDropsResponse);
      console.log('[MonitoringMockup] ✅ Upload Details response:', uploadDetailsResponse);

      // Safety check before setState
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted during API call, aborting setState');
        return;
      }

      // Calculate metrics from bird_drops_by_block
      // LOGIC EXPLANATION:
      // - totalProcessed = SUM of all blocks (C=27, D=37, E=35, F=51, K=24, L=27) = 201
      // - totalUploaded = from UploadDetails = 2764
      // - Overall Progress = (201 / 2764) * 100% = 7%
      // - Block progress = (blockValue / totalProcessed) * 100%
      //   Example: Block C = (27 / 201) * 100% = 13%
      // - When totalProcessed >= totalUploaded → All blocks move to COMPLETED

      let totalProcessed = 0; // Sum of all "Total Case List" from bird_drops_by_block
      const blocksData = []; // Temporary storage for block data

      if (birdDropsResponse.success && birdDropsResponse.data) {
        birdDropsResponse.data.forEach((block) => {
          // block.total is "Total Case List" - the number that grows as detection runs
          const blockValue = block.total || 0;

          totalProcessed += blockValue;

          // Store block data
          if (blockValue > 0) {
            blocksData.push({
              areaCode: block.area_code,
              value: blockValue,
            });
          }
        });
      }

      // Calculate total uploaded from UploadDetails
      let totalUploaded = 0;
      if (uploadDetailsResponse.success && uploadDetailsResponse.data) {
        uploadDetailsResponse.data.forEach((session) => {
          totalUploaded += session.start_uploads || 0;
        });
      }

      // Now calculate progress for each block
      // Block progress shows: "this block represents X% of total work done"
      const completed = [];
      const inProgress = [];

      blocksData.forEach((block) => {
        // Block progress = (blockValue / totalProcessed) * 100%
        // This shows the block's contribution to the total detection work
        const blockProgress = totalProcessed > 0
          ? Math.round((block.value / totalProcessed) * 100)
          : 0;

        const blockData = {
          areaCode: block.areaCode,
          processed: block.value,
          total: totalProcessed, // Show as "X / totalProcessed"
          progress: blockProgress,
        };

        // All blocks stay in "IN PROGRESS" until totalProcessed >= totalUploaded
        // Individual blocks don't complete separately
        inProgress.push(blockData);
      });

      // If totalProcessed >= totalUploaded, move ALL blocks to COMPLETED
      if (totalProcessed >= totalUploaded && totalUploaded > 0) {
        completed.push(...inProgress);
        inProgress.length = 0; // Clear in progress
      }

      // Final safety check before setState
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted during calculation, aborting setState');
        return;
      }

      // Update state with calculated data
      setPanelsData({
        inProgress,
        completed,
        totalUploaded,
        totalProcessed, // This is sum of "Total Case List" from bird_drops_by_block
      });

      setLastUpdate(new Date());

      console.log('[MonitoringMockup] ✅ Data loaded successfully:', {
        inProgress: inProgress.length,
        completed: completed.length,
        totalUploaded,
        totalProcessed,
        overallProgress: totalUploaded > 0 ? Math.round((totalProcessed / totalUploaded) * 100) : 0,
      });

    } catch (error) {
      console.error('[MonitoringMockup] ❌ Error loading data:', error);
      // Don't crash the app, just log the error
    } finally {
      // Safety check before final setState
      if (isMountedRef.current) {
        if (showLoading) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    }
  }, []); // Empty deps - loadData doesn't depend on any props or state

  // Handle pull-to-refresh
  const onRefresh = async () => {
    console.log('[MonitoringMockup] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setCountdown(300); // Reset countdown when manually refreshing
    await AsyncStorage.setItem('monitoring_countdown_value', '300');

    await loadData(false);
    console.log('[MonitoringMockup] ✅ Manual refresh completed');
  };

  // Format countdown timer
  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render empty state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading monitoring data...</Text>
        </View>
      </View>
    );
  }

  // Render empty state only when no processed files from Pusher
  // Don't check totalUploaded - use totalProcessed instead (from Pusher events)
  if (panelsData.totalProcessed === 0 && panelsData.inProgress.length === 0 && panelsData.completed.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⟳</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Waiting for Detection Events</Text>
            <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
              Monitoring real-time file detection from backend worker. Data will appear automatically when files are detected.
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#FFC107' }]} />
              <Text style={[styles.statusText, { color: theme.secondaryText }]}>
                Manual refresh only - Pull down to update
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Calculate overall progress based on total processed / total uploaded
  // This gives accurate percentage of files processed across all areas
  const totalAreas = panelsData.inProgress.length + panelsData.completed.length;
  const overallProgress = panelsData.totalUploaded > 0
    ? Math.min(Math.round((panelsData.totalProcessed / panelsData.totalUploaded) * 100), 100)
    : 0;

  // Calculate queued (files still waiting to be processed)
  const queued = Math.max(0, panelsData.totalUploaded - panelsData.totalProcessed);

  // Debug logging for progress calculation
  console.log('[MonitoringMockup] 🎯 Rendering with progress:', {
    totalProcessed: panelsData.totalProcessed,
    totalUploaded: panelsData.totalUploaded,
    overallProgress: overallProgress,
    queued: queued,
    totalAreas: totalAreas,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card - Single UPLOADED card with countdown */}
        <View style={styles.summaryContainerSingle}>
          <View style={styles.summaryCardLarge}>
            <View style={styles.uploadedHeader}>
              <Text style={styles.summaryIconLarge}>↑</Text>
              <View style={styles.uploadedTextContainer}>
                <Text style={styles.summaryValueLarge}>{panelsData.totalUploaded}</Text>
                <Text style={styles.summaryLabelLarge}>UPLOADED - Today</Text>
              </View>
            </View>
            {/* Only show countdown when NOT in real-time mode (Pusher degraded/offline) */}
            {(pusherStatus === 'degraded' || pusherStatus === 'disconnected') && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownLabel}>⚠️ Fallback polling in</Text>
                <Text style={styles.countdownTimer}>{formatCountdown()}</Text>
              </View>
            )}
            {pusherStatus === 'connected' && (
              <View style={styles.countdownContainer}>
                <Text style={styles.realtimeLabel}>✓ Real-time updates active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Overall Progress Bar */}
        <View style={styles.marginProgressIndicator}>
          {/* <View style={styles.overallProgressHeader}>
            <Text style={[styles.overallProgressTitle, { color: theme.text }]}>OVERALL PROGRESS</Text>
            <Text style={[styles.overallProgressPercent, { color: theme.text }]}>{overallProgress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${overallProgress}%`,
                  minWidth: overallProgress > 0 ? '2%' : '0%', // Ensure visibility even at 1%
                }
              ]}
            />
          </View>
          <Text style={[styles.overallProgressSubtitle, { color: theme.secondaryText }]}>
            {panelsData.totalProcessed}/{panelsData.totalUploaded} processed • {queued} queued • {totalAreas} area{totalAreas !== 1 ? 's' : ''}
          </Text> */}
        </View>

        {/* 2-Panel Block Progress */}
        <View style={styles.panelsContainer}>
          {/* In Progress Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>⏳</Text>
              <Text style={styles.panelTitle}>IN PROGRESS</Text>
            </View>
            <View style={styles.panelContent}>
              {panelsData.inProgress.length === 0 ? (
                <Text style={[styles.emptyPanelText, { color: theme.secondaryText }]}>
                  No blocks in progress
                </Text>
              ) : (
                panelsData.inProgress.map((area, index) => {
                  const blockQueued = Math.max(0, area.total - area.processed);
                  return (
                    <View key={index} style={styles.blockCard}>
                      <View style={styles.blockHeader}>
                        <Text style={styles.blockTitle}>Block {area.areaCode}</Text>
                        <Text style={styles.blockCount}>
                          {area.processed}/{area.total}
                        </Text>
                      </View>
                      <View style={styles.blockProgressBar}>
                        <View
                          style={[
                            styles.blockProgressFill,
                            { width: `${area.progress}%`, backgroundColor: '#F59E0B' },
                          ]}
                        />
                      </View>
                      <View style={styles.blockFooter}>
                        <Text style={styles.blockPercent}>{area.progress}%</Text>
                        <Text style={styles.blockQueued}>{blockQueued} queued</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Completed Panel */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelIcon}>✅</Text>
              <Text style={styles.panelTitle}>COMPLETED</Text>
            </View>
            <View style={styles.panelContent}>
              {panelsData.completed.length === 0 ? (
                <Text style={[styles.emptyPanelText, { color: theme.secondaryText }]}>
                  No blocks completed yet
                </Text>
              ) : (
                panelsData.completed.map((area, index) => (
                  <View key={index} style={styles.blockCard}>
                    <View style={styles.blockHeader}>
                      <Text style={styles.blockTitle}>Block {area.areaCode}</Text>
                      <Text style={styles.blockCount}>
                        {area.processed}/{area.total}
                      </Text>
                    </View>
                    <View style={styles.blockProgressBar}>
                      <View
                        style={[
                          styles.blockProgressFill,
                          { width: '100%', backgroundColor: '#10B981' },
                        ]}
                      />
                    </View>
                    <Text style={styles.blockPercent}>100%</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* Status Footer */}
        <View style={styles.statusFooter}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    pusherStatus === 'connected' ? '#10B981' :
                    pusherStatus === 'degraded' ? '#F59E0B' :
                    '#EF4444'
                }
              ]}
            />
            <Text style={[styles.statusText, { color: theme.secondaryText }]}>
              {pusherStatus === 'connected' && pollingMode === 'normal' && 'Real-time updates'}
              {pusherStatus === 'connected' && pollingMode === 'aggressive' && 'Recovering to real-time...'}
              {pusherStatus === 'degraded' && '⚠️ Pusher degraded - 1min polling'}
              {pusherStatus === 'disconnected' && '⚠️ Pusher offline - 1min polling'}
              {pusherStatus === 'connecting' && 'Connecting...'}
            </Text>
          </View>
          <Text style={[styles.lastUpdateText, { color: theme.secondaryText }]}>
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString('id-ID') : 'Never'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryIconMono: {
    fontSize: 24,
    fontWeight: '300',
    color: '#0EA5E9',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  summaryContainerSingle: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadedTextContainer: {
    marginLeft: 16,
  },
  summaryIconLarge: {
    fontSize: 48,
    fontWeight: '300',
    color: '#0EA5E9',
  },
  summaryValueLarge: {
    fontSize: 42,
    fontWeight: '700',
    color: '#0EA5E9',
    lineHeight: 48,
  },
  summaryLabelLarge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  countdownTimer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  realtimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    width: '100%',
  },
  overallProgressContainer: {
    margin: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marginProgressIndicator: {
    margin: 5,
    padding: 5,
    // backgroundColor: '#FFFFFF',
    // borderRadius: 16,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    elevation: 3,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallProgressTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overallProgressPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0EA5E9',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0EA5E9',
    borderRadius: 6,
  },
  overallProgressSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  panelsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  panelIcon: {
    fontSize: 20,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  panelContent: {
    padding: 16,
    gap: 12,
  },
  emptyPanelText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 24,
  },
  blockCard: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  blockCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  blockProgressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  blockProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  blockPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  blockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockQueued: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F59E0B',
  },
  statusFooter: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  lastUpdateText: {
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
