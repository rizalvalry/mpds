import React, { useState, useEffect, useRef } from 'react';
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
import pusherService from '../services/PusherService';
import monitoringDataService from '../services/MonitoringDataService';

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
  const [pusherConnected, setPusherConnected] = useState(false);
  const { theme } = useTheme();

  // Refs to track component mount state and prevent memory leaks
  const isMountedRef = useRef(true);
  const pusherCallbackRef = useRef(null);

  // Load data ONLY on initial mount - no auto-refresh polling
  useEffect(() => {
    console.log('[MonitoringMockup] Component mounted, loading initial data...');
    isMountedRef.current = true;
    loadData();

    return () => {
      console.log('[MonitoringMockup] Component unmounting, cleaning up...');
      isMountedRef.current = false;
    };
  }, []);

  // Setup Pusher connection for real-time updates (no polling)
  useEffect(() => {
    console.log('[MonitoringMockup] Setting up Pusher connection...');

    const handleFileDetected = (data) => {
      // Only update if component is still mounted
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted, ignoring Pusher event');
        return;
      }
      console.log('[MonitoringMockup] File detected, refreshing data...', data);
      loadData(false); // Refresh data without loading indicator
    };

    // Store callback reference for cleanup
    pusherCallbackRef.current = handleFileDetected;

    pusherService.connect(handleFileDetected);
    setPusherConnected(pusherService.getConnectionStatus());

    return () => {
      console.log('[MonitoringMockup] Cleaning up Pusher connection...');
      pusherService.disconnect();
      pusherCallbackRef.current = null;
    };
  }, []);

  // Load monitoring data with safety checks
  const loadData = async (showLoading = true) => {
    try {
      // Safety check: don't execute if component is unmounted
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted, aborting loadData');
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      // Get area codes from session
      const areaCodes = session?.area_code || [];

      console.log('[MonitoringMockup] Session data:', {
        hasSession: !!session,
        droneCode: session?.drone?.drone_code,
        areaCodes: areaCodes,
        fullSession: session,
      });

      // Fetch from API first
      const apiResponse = await monitoringDataService.fetchTodayUploads();

      // Safety check before setState
      if (!isMountedRef.current) {
        console.log('[MonitoringMockup] Component unmounted during API call, aborting setState');
        return;
      }

      if (apiResponse.success && apiResponse.data.length > 0) {
        // Calculate panels data combining API + AsyncStorage
        const panels = await monitoringDataService.calculatePanelsData(
          apiResponse.data,
          areaCodes
        );

        // Final safety check before setState
        if (!isMountedRef.current) {
          console.log('[MonitoringMockup] Component unmounted during calculation, aborting setState');
          return;
        }

        setPanelsData(panels);

        // Also get local statistics for backward compatibility
        const statistics = await getTodayStatistics();

        // Safety check before final setState
        if (!isMountedRef.current) return;

        setStats(statistics);
        setLastUpdate(new Date());

        console.log('[MonitoringMockup] Data loaded from API:', {
          inProgress: panels.inProgress.length,
          completed: panels.completed.length,
          totalUploaded: panels.totalUploaded,
          totalProcessed: panels.totalProcessed,
          operator: panels.operator,
        });
      } else {
        // No API data, fallback to local AsyncStorage only
        console.log('[MonitoringMockup] No API data, using local storage only');

        const [panels, statistics] = await Promise.all([
          getMonitoringPanelsData(areaCodes),
          getTodayStatistics(),
        ]);

        // Safety check before setState
        if (!isMountedRef.current) {
          console.log('[MonitoringMockup] Component unmounted, aborting setState');
          return;
        }

        setPanelsData(panels);
        setStats(statistics);
        setLastUpdate(new Date());

        console.log('[MonitoringMockup] Data loaded from local storage:', {
          inProgress: panels.inProgress.length,
          completed: panels.completed.length,
          totalUploaded: panels.totalUploaded,
          totalProcessed: panels.totalProcessed,
        });
      }
    } catch (error) {
      console.error('[MonitoringMockup] Error loading data:', error);
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
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
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
              <View style={[styles.statusDot, { backgroundColor: pusherConnected ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.statusText, { color: theme.secondaryText }]}>
                {pusherConnected ? 'Real-time updates active' : 'Reconnecting...'}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards - 4 cards: UPLOADED, QUEUED, PROCESSED, PROGRESS */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryIconMono}>↑</Text>
            <Text style={styles.summaryValue}>{panelsData.totalUploaded}</Text>
            <Text style={styles.summaryLabel}>UPLOADED</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryIconMono, { color: '#F59E0B' }]}>◔</Text>
            <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{queued}</Text>
            <Text style={styles.summaryLabel}>QUEUED</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryIconMono, { color: '#10B981' }]}>✓</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{panelsData.totalProcessed}</Text>
            <Text style={styles.summaryLabel}>PROCESSED</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryIconMono}>%</Text>
            <Text style={styles.summaryValue}>{overallProgress}%</Text>
            <Text style={styles.summaryLabel}>PROGRESS</Text>
          </View>
        </View>

        {/* Overall Progress Bar */}
        <View style={styles.overallProgressContainer}>
          <View style={styles.overallProgressHeader}>
            <Text style={[styles.overallProgressTitle, { color: theme.text }]}>OVERALL PROGRESS</Text>
            <Text style={[styles.overallProgressPercent, { color: theme.text }]}>{overallProgress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${overallProgress}%` }]} />
          </View>
          <Text style={[styles.overallProgressSubtitle, { color: theme.secondaryText }]}>
            {panelsData.totalProcessed}/{panelsData.totalUploaded} processed • {queued} queued • {totalAreas} area{totalAreas !== 1 ? 's' : ''}
          </Text>
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
            <View style={[styles.statusDot, { backgroundColor: pusherConnected ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: theme.secondaryText }]}>
              {pusherConnected ? 'Real-time updates active' : 'Reconnecting...'}
            </Text>
          </View>
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
});
