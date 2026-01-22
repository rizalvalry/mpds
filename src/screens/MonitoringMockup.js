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
import pusherProgressService from '../services/PusherProgressService'; // NEW: For API sync
import monitoringDataService from '../services/MonitoringDataService';
import apiService from '../services/ApiService';
// AsyncStorage removed - all data comes from real API only

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

  // Real-time progress from Pusher (block-progress channel)
  // Format: { 'A': { detected: 50, undetected: 30, total_processed: 80 }, 'B': {...} }
  const [pusherProgress, setPusherProgress] = useState({});

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
  const AGGRESSIVE_POLLING = 2 * 60 * 1000; // 2 minutes (fallback when Pusher degraded)
  const PUSHER_SILENCE_THRESHOLD = 3 * 60 * 1000; // 3 minutes without events

  // Countdown is managed purely by React state - no AsyncStorage
  // All data comes from real API only

  // Function to start/stop polling based on Pusher health
  const managePolling = useCallback((shouldPoll) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (shouldPoll) {
      // Start aggressive polling (2 minutes) when Pusher is degraded/offline
      console.log('[MonitoringMockup] 🔄 Starting aggressive polling (2 min)');

      pollingIntervalRef.current = setInterval(() => {
        console.log('[MonitoringMockup] 🔄 Polling: Fetching data from API...');
        loadData(false);
        setCountdown(120); // Reset to 2 minutes
      }, AGGRESSIVE_POLLING);

      // Set initial countdown
      setCountdown(120);
      setPollingMode('aggressive');
    } else {
      // Stop polling - pure real-time mode
      console.log('[MonitoringMockup] ✅ Stopping polling - pure real-time mode');
      setPollingMode('normal');
      setCountdown(0); // No countdown in real-time mode
    }
  }, [AGGRESSIVE_POLLING, loadData]);

  // Setup initial data load and 5-minute polling (PRIMARY mechanism)
  useEffect(() => {
    console.log('[MonitoringMockup] Component mounted, loading initial data...');
    isMountedRef.current = true;

    // Initial load
    loadData();

    // START PusherProgressService for cross-device sync (real-time updates)
    if (session) {
      console.log('[MonitoringMockup] 🚀 Starting PusherProgressService...');
      pusherProgressService.start(session);
    }

    // START 5-minute polling as PRIMARY mechanism
    // This ensures database values (end_uploads, end_detections) are regularly updated
    console.log('[MonitoringMockup] 📊 Starting 5-minute polling as PRIMARY mechanism');
    pollingIntervalRef.current = setInterval(() => {
      console.log('[MonitoringMockup] 🔄 5-min polling: Fetching data from API...');
      loadData(false);
      setCountdown(300); // Reset to 5 minutes
    }, NORMAL_POLLING);
    setCountdown(300); // Initial countdown
    setPollingMode('normal');

    // Setup countdown timer (always runs for 5-min polling)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const newValue = prev > 0 ? prev - 1 : 300;
        return newValue;
      });
    }, 1000);

    return () => {
      console.log('[MonitoringMockup] Component unmounting, cleaning up...');
      isMountedRef.current = false;

      // Stop PusherProgressService
      pusherProgressService.stop();

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
  }, [loadData, session, NORMAL_POLLING]);

  // RE-ENABLED: Pusher/WebSocket connection for real-time updates
  useEffect(() => {
    console.log('[MonitoringMockup] Setting up Pusher connection...');

    const handleFileDetected = (data) => {
      console.log('[MonitoringMockup] 📡 file-detected event received:', data);

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

    const handleBlockProgress = (data) => {
      console.log('[MonitoringMockup] 📊 block-progress event received:', data);

      // Update last event timestamp
      setLastPusherEvent(Date.now());
      setPusherStatus('connected');

      // Stop polling if we're in aggressive mode - back to pure real-time
      if (pollingMode === 'aggressive') {
        console.log('[MonitoringMockup] ✅ Pusher recovered, stopping polling');
        managePolling(false); // Stop polling, go back to real-time
      }

      // Update progress state with real-time data from backend worker
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

        console.log(`[MonitoringMockup] Updated progress for Block ${areaCode}:`, {
          detected: detectedCount,
          undetected: undetectedCount,
          total_processed: totalProcessed,
        });

        // Trigger data reload to recalculate panels
        loadData(false);
      }
    };

    pusherService.connect(handleFileDetected, handleBlockProgress);

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
          managePolling(true); // Start 2min polling
        }
        return;
      }

      // Scenario 2: Pusher connected but silent for too long (possibly rate limited)
      if (timeSinceLastEvent > PUSHER_SILENCE_THRESHOLD) {
        console.warn(`[MonitoringMockup] ⚠️ Pusher silent for ${Math.round(timeSinceLastEvent / 1000)}s, assuming degraded/limited`);
        setPusherStatus('degraded');
        if (pollingMode !== 'aggressive') {
          managePolling(true); // Start 2min polling
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

      // NEW CORRECT LOGIC:
      // 1. Group UploadDetails by area_code + phase
      // 2. Match with bird_drops_by_block detection count
      // 3. Calculate progress per phase: (detected / start_uploads) * 100%
      // 4. Separate phases for same area (e.g., Block C phase 0 & phase 1)

      const uploadSessions = {}; // Key: "area_code-phase", Value: {start_uploads, phase, operator}
      let totalUploaded = 0;

      // Get user's area_code list from login session for filtering
      const userAreaCodes = session?.area_code || [];
      console.log('[MonitoringMockup] 🔐 User area_codes from session:', userAreaCodes);

      if (uploadDetailsResponse.success && uploadDetailsResponse.data) {
        uploadDetailsResponse.data.forEach((uploadSession) => {
          // Handle area_handle being an array (e.g. ["T"]) or string
          let areaHandle = uploadSession.area_handle;
          if (Array.isArray(areaHandle)) {
            // If it's an array, take the first element (assuming single block per session)
            // or join them if needed, but usually it's single letter
            areaHandle = areaHandle.length > 0 ? areaHandle[0] : '';
          }
          const phase = uploadSession.phase || 0;
          const key = `${areaHandle}-${phase}`;
          const createdAt = uploadSession.created_at ? new Date(uploadSession.created_at) : null;
          const detectionStartedAt = uploadSession.detection_started_at ? new Date(uploadSession.detection_started_at) : null;
          const detectionCompletedAt = uploadSession.detection_completed_at ? new Date(uploadSession.detection_completed_at) : null;

          // FILTER: Only show blocks that belong to user's area_code
          // If userAreaCodes is empty, show all (admin view)
          if (userAreaCodes.length > 0 && !userAreaCodes.includes(areaHandle)) {
            console.log(`[MonitoringMockup] ⏭️ Skipping Block ${areaHandle} - not in user's area_codes`);
            return; // Skip this session
          }

          // Store session data grouped by area_code + phase
          if (!uploadSessions[key]) {
            uploadSessions[key] = {
              areaCode: areaHandle,
              phase: phase,
              startUploads: 0,
              operator: uploadSession.operator,
              sessionId: uploadSession.id,
              totalDetected: 0,
              totalUndetected: 0,
              createdAt: createdAt, // Track upload start time
              detectionStartedAt: detectionStartedAt, // Track when detection started
              detectionCompletedAt: detectionCompletedAt, // Track when detection completed
            };
          }

          uploadSessions[key].startUploads += (uploadSession.start_uploads || 0);
          uploadSessions[key].totalDetected += (uploadSession.total_detected || 0);
          uploadSessions[key].totalUndetected += (uploadSession.total_undetected || 0);
          totalUploaded += (uploadSession.start_uploads || 0);

          // Track oldest created_at for this area-phase combination
          if (createdAt && (!uploadSessions[key].createdAt || createdAt < uploadSessions[key].createdAt)) {
            uploadSessions[key].createdAt = createdAt;
          }

          // Track detection timestamps (use the latest non-null values)
          if (detectionStartedAt && (!uploadSessions[key].detectionStartedAt || detectionStartedAt < uploadSessions[key].detectionStartedAt)) {
            uploadSessions[key].detectionStartedAt = detectionStartedAt;
          }
          if (detectionCompletedAt) {
            uploadSessions[key].detectionCompletedAt = detectionCompletedAt;
          }
        });
      }

      console.log(`[MonitoringMockup] 📊 Filtered to ${Object.keys(uploadSessions).length} block sessions for user`);

      console.log('[MonitoringMockup] 📊 Upload Sessions Grouped:', uploadSessions);

      // HYBRID APPROACH: Use Pusher real-time progress if available, fallback to API
      // Pusher progress_tracker.py provides real-time detected/undetected counts
      // bird_drops_by_block API provides fallback if Pusher is not available
      const detectionCounts = {}; // Key: area_code, Value: { detected, undetected, total_processed }
      let totalProcessed = 0;

      // First, try to get real-time data from Pusher
      Object.keys(pusherProgress).forEach((areaCode) => {
        const pusherData = pusherProgress[areaCode];
        detectionCounts[areaCode] = {
          detected: pusherData.detected || 0,
          undetected: pusherData.undetected || 0,
          total_processed: pusherData.total_processed || 0,
        };
        totalProcessed += (pusherData.total_processed || 0);
      });

      // Fallback: If no Pusher data for an area, use bird_drops_by_block API
      if (birdDropsResponse.success && birdDropsResponse.data) {
        birdDropsResponse.data.forEach((block) => {
          const areaCode = block.area_code;
          const apiDetected = block.total || 0;

          // Only use API data if we don't have Pusher data for this area
          if (!detectionCounts[areaCode]) {
            detectionCounts[areaCode] = {
              detected: apiDetected,
              undetected: 0, // API doesn't provide undetected count
              total_processed: apiDetected,
            };
            totalProcessed += apiDetected;
          }
        });

        // ========================================
        // FRONTEND-AS-BRIDGE: Sync detected counts to Backend
        // Since cluster cannot hit public Bird Drop API, frontend pushes detection counts
        // Uses PATCH /UploadDetails/detection endpoint
        // Includes operator from session for proper backend query
        // ========================================
        const operatorCode = session?.drone?.drone_code || null;
        birdDropsResponse.data.forEach((block) => {
          const areaCode = block.area_code;
          const trueDetection = block.true_detection || 0;
          const falseDetection = block.false_detection || 0;
          const totalDetected = trueDetection + falseDetection;

          if (areaCode && totalDetected > 0) {
            // Fire and forget - background sync with operator
            apiService.updateDetectionCounts(areaCode, totalDetected, operatorCode)
              .then(() => console.log(`[MonitoringMockup] ✅ Synced Block ${areaCode}: ${totalDetected} detected`))
              .catch(e => console.log(`[MonitoringMockup] ⚠️ Sync failed for ${areaCode}:`, e.message));
          }
        });
      }

      console.log('[MonitoringMockup] 🎯 Detection Counts (Pusher + API fallback):', detectionCounts);

      // Now calculate progress for each upload session (per area_code + phase)
      const completed = [];
      const inProgress = [];
      const now = new Date();

      Object.keys(uploadSessions).forEach((key) => {
        const session = uploadSessions[key];
        const areaCode = session.areaCode;
        const phase = session.phase;
        const startUploads = session.startUploads;
        const createdAt = session.createdAt;

        // Get detection count for this area_code
        const areaProgress = detectionCounts[areaCode] || { detected: 0, undetected: 0, total_processed: 0 };

        // PERSISTENCE LOGIC:
        // Use database counts (upload_details) as fallback/baseline if Pusher/API counts are missing or lower.
        // This handles app reloads where Pusher data is lost but DB is up to date (via backend worker).
        const dbDetected = session.totalDetected || 0;
        const dbUndetected = session.totalUndetected || 0;
        const dbProcessed = dbDetected + dbUndetected;

        const pusherProcessed = areaProgress.total_processed || 0;

        // Use the larger value to ensure we show maximum known progress
        let processed = Math.max(pusherProcessed, dbProcessed);

        let detected, undetected;

        if (pusherProcessed >= dbProcessed) {
          detected = areaProgress.detected || 0;
          undetected = areaProgress.undetected || 0;
        } else {
          detected = dbDetected;
          undetected = dbUndetected;
        }

        // REMOVED: 60-minute auto-complete logic
        // Now relying on 5-minute polling to get accurate data from API
        // Backend.worker will update detection timestamps directly via API

        // Calculate progress: (detected + undetected) / startUploads * 100%
        // This matches the formula user requested: (detected + undetected) / total
        const progress = startUploads > 0
          ? Math.round((processed / startUploads) * 100)
          : 0;

        // Clamp progress to max 100%
        const clampedProgress = Math.min(progress, 100);

        const blockData = {
          areaCode: areaCode,
          phase: phase,
          processed: processed, // detected + undetected from API
          detectedCount: detected,
          undetectedCount: undetected,
          total: startUploads, // Show as "processed / startUploads"
          progress: clampedProgress,
          operator: session.operator,
          sessionId: session.sessionId,
          // Calculate queued items - if detection_completed_at is set, queue is effectively 0
          // (detection done even if counter has slight mismatch due to message loss)
          queued: session.detectionCompletedAt ? 0 : Math.max(0, startUploads - processed),
          createdAt: session.createdAt, // Upload start time
          detectionStartedAt: session.detectionStartedAt, // Detection start time
          detectionCompletedAt: session.detectionCompletedAt, // Detection complete time
        };

        // Determine if completed or in progress
        // IMPORTANT: Use detection_completed_at as primary completion signal
        // This handles cases where counter may have missed some messages but detection is actually done
        const isDetectionComplete = session.detectionCompletedAt !== null && session.detectionCompletedAt !== undefined;
        const isDataComplete = processed >= startUploads;

        if (isDetectionComplete || isDataComplete) {
          // Mark as complete if EITHER:
          // 1. Backend explicitly set detection_completed_at (detection done, blob storage empty)
          // 2. OR all uploads have been processed (100% complete by count)
          completed.push(blockData);
        } else {
          // Still in progress - detection not yet complete
          inProgress.push(blockData);
        }
      });

      console.log('[MonitoringMockup] ✅ Calculated Progress:', {
        inProgress: inProgress.length,
        completed: completed.length,
        totalUploaded,
        totalProcessed,
      });

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
  }, [pusherProgress]); // Depend on pusherProgress for real-time updates

  // Handle pull-to-refresh
  const onRefresh = async () => {
    console.log('[MonitoringMockup] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setCountdown(300); // Reset countdown when manually refreshing

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
            {/* Always show 5-minute polling countdown - PRIMARY mechanism */}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>
                {pusherStatus === 'connected' ? '✓ Real-time + polling' : '⚠️ Polling only'} • Next refresh:
              </Text>
              <Text style={styles.countdownTimer}>{formatCountdown()}</Text>
            </View>
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
                  const blockQueued = area.queued || Math.max(0, area.total - area.processed);
                  return (
                    <View key={index} style={styles.blockCard}>
                      <View style={styles.blockHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.blockTitle}>Block {area.areaCode}</Text>
                          {area.phase > 0 && (
                            <View style={{
                              backgroundColor: '#3B82F6',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                                Phase {area.phase}
                              </Text>
                            </View>
                          )}
                        </View>
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
                      {/* Detection breakdown - show detected count only (backend doesn't send undetected) */}
                      {area.detectedCount > 0 && (
                        <View style={styles.detectionBreakdown}>
                          <Text style={styles.detectionText}>
                            ✅ Detected: <Text style={styles.detectionValue}>{area.detectedCount || 0}</Text>
                          </Text>
                        </View>
                      )}
                      {/* Detection Timestamps */}
                      <View style={styles.timestampContainer}>
                        <View style={styles.timestampRow}>
                          <Text style={styles.timestampLabel}>🚀 Start Detection:</Text>
                          <Text style={styles.timestampValue}>
                            {area.detectionStartedAt
                              ? area.detectionStartedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : 'Waiting...'}
                          </Text>
                        </View>
                        <View style={styles.timestampRow}>
                          <Text style={styles.timestampLabel}>✅ End Detection:</Text>
                          <Text style={styles.timestampValue}>
                            {area.detectionCompletedAt
                              ? area.detectionCompletedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : 'In progress...'}
                          </Text>
                        </View>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.blockTitle}>Block {area.areaCode}</Text>
                        {area.phase > 0 && (
                          <View style={{
                            backgroundColor: '#3B82F6',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                              Phase {area.phase}
                            </Text>
                          </View>
                        )}
                      </View>
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
                    {/* Detection breakdown - show detected count only (backend doesn't send undetected) */}
                    {area.detectedCount > 0 && (
                      <View style={styles.detectionBreakdown}>
                        <Text style={styles.detectionText}>
                          ✅ Detected: <Text style={styles.detectionValue}>{area.detectedCount || 0}</Text>
                        </Text>
                      </View>
                    )}
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
              {pusherStatus === 'connected' && `Real-time + 5min polling`}
              {pusherStatus === 'degraded' && '⚠️ Pusher degraded - 5min polling active'}
              {pusherStatus === 'disconnected' && '⚠️ Pusher offline - 5min polling active'}
              {pusherStatus === 'connecting' && 'Connecting...'}
            </Text>
          </View>
          <Text style={[styles.lastUpdateText, { color: theme.secondaryText }]}>
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString('id-ID') : 'Never'} • Next refresh: {formatCountdown()}
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
  detectionBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  detectionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  detectionValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5E9',
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
  // Timestamp styles for detection start/end times
  timestampContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestampLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  timestampValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0EA5E9',
  },
});
