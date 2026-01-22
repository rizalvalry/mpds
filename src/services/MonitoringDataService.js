import apiService from './ApiService';
import { getTodaySession } from '../utils/uploadSessionStorage';

/**
 * MonitoringDataService
 *
 * Centralized service for monitoring data logic that combines:
 * - API data (total uploaded count from start_uploads)
 * - AsyncStorage data (processed count from Pusher events)
 * - Calculated distribution per area
 */
class MonitoringDataService {
  /**
   * Get today's date in YYYY-MM-DD format (Asia/Jakarta timezone)
   * @returns {string} Date string in format YYYY-MM-DD
   */
  getTodayDate() {
    // Use toLocaleString with Asia/Jakarta timezone to get correct date
    const now = new Date();
    const jakartaDateString = now.toLocaleString('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // toLocaleString with 'en-CA' returns YYYY-MM-DD format directly
    return jakartaDateString.split(',')[0]; // Remove time part if any
  }

  /**
   * Fetch upload sessions from API for today
   * @returns {Promise<Object>} Response with success status and data
   */
  async fetchTodayUploads() {
    try {
      const today = this.getTodayDate();
      console.log('[MonitoringDataService] Fetching uploads for date:', today);

      const response = await apiService.getUploadDetails(today);

      if (response.success && response.data && response.data.length > 0) {
        // Sort by ID to get latest
        const sortedData = [...response.data].sort((a, b) => b.id - a.id);

        console.log('[MonitoringDataService] ✅ API data loaded:', {
          count: response.data.length,
          allSessions: response.data.map(s => ({ id: s.id, start_uploads: s.start_uploads, operator: s.operator })),
          latestSession: sortedData[0],
        });

        return {
          success: true,
          data: response.data,
        };
      }

      console.log('[MonitoringDataService] ℹ️ No uploads found for today');
      return {
        success: false,
        data: [],
        message: 'No uploads found for today',
      };
    } catch (error) {
      console.error('[MonitoringDataService] ❌ Error fetching uploads:', error);
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  /**
   * Calculate monitoring panels data from API + AsyncStorage
   * @param {Array} apiData - Data from API (upload sessions)
   * @param {Array<string>} areaCodes - User's area codes from session
   * @returns {Promise<Object>} Panels data with inProgress and completed arrays
   */
  async calculatePanelsData(apiData, areaCodes) {
    try {
      if (!apiData || apiData.length === 0) {
        console.log('[MonitoringDataService] No API data to calculate panels');
        return {
          inProgress: [],
          completed: [],
          totalUploaded: 0,
          totalProcessed: 0,
        };
      }

      // Get latest upload session from API (most recent by ID or created_at)
      // Sort by ID descending to get the latest session
      const sortedSessions = [...apiData].sort((a, b) => b.id - a.id);
      const latestSession = sortedSessions[0];

      // SUM all start_uploads from ALL sessions today (not just latest)
      // This gives accurate total for all uploads across all operators
      const totalUploaded = apiData.reduce((sum, session) => sum + (session.start_uploads || 0), 0);

      console.log('[MonitoringDataService] Total uploaded from ALL sessions:', {
        sessionCount: apiData.length,
        totalUploaded,
        breakdown: apiData.map(s => ({ id: s.id, operator: s.operator, start_uploads: s.start_uploads })),
      });

      // Get processed count from AsyncStorage (Pusher events) - do this early
      const localSession = await getTodaySession();

      // Extract area codes from ALL API sessions (combine all area_handle arrays)
      // This ensures we show all areas that have uploads today
      const allAreasFromAPI = new Set();
      apiData.forEach(session => {
        if (session.area_handle && Array.isArray(session.area_handle)) {
          session.area_handle.forEach(area => allAreasFromAPI.add(area));
        }
      });

      let finalAreaCodes = areaCodes;
      if (allAreasFromAPI.size > 0) {
        finalAreaCodes = Array.from(allAreasFromAPI);
        console.log('[MonitoringDataService] Using area codes from ALL API sessions:', finalAreaCodes);
      } else if (!finalAreaCodes || finalAreaCodes.length === 0) {
        // Try to get area codes from AsyncStorage (Pusher events)
        if (localSession && localSession.batches && localSession.batches.length > 0) {
          const areasFromPusher = new Set();
          localSession.batches.forEach(batch => {
            if (batch.byArea) {
              Object.keys(batch.byArea).forEach(area => areasFromPusher.add(area));
            }
          });
          if (areasFromPusher.size > 0) {
            finalAreaCodes = Array.from(areasFromPusher);
            console.log('[MonitoringDataService] Using area codes from Pusher events:', finalAreaCodes);
          }
        }
      }

      if (!finalAreaCodes || finalAreaCodes.length === 0) {
        console.log('[MonitoringDataService] No area codes available - cannot calculate panels');
        return {
          inProgress: [],
          completed: [],
          totalUploaded: totalUploaded,
          totalProcessed: 0,
        };
      }

      console.log('[MonitoringDataService] Latest session from API:', {
        id: latestSession.id,
        operator: latestSession.operator,
        totalUploaded,
        status: latestSession.status,
        area_handle: latestSession.area_handle,
        finalAreaCodes: finalAreaCodes,
      });

      // CRITICAL: Build area breakdown from upload_details API (end_uploads field)
      // This is the SINGLE SOURCE OF TRUTH for all devices
      const areaBreakdown = {};
      let totalProcessed = 0;

      // Process each upload session to get end_uploads per area
      apiData.forEach(session => {
        if (session.area_handle && Array.isArray(session.area_handle)) {
          session.area_handle.forEach(area => {
            const endUploads = session.end_uploads || 0;

            // Check if upload is stale (60+ minutes old) → auto-complete to 100%
            const createdAt = new Date(session.created_at);
            const now = new Date();
            const minutesDiff = (now - createdAt) / (1000 * 60); // Convert ms to minutes

            if (minutesDiff >= 60 && endUploads < session.start_uploads) {
              // AUTO-COMPLETE: Force end_uploads = start_uploads after 60 minutes
              console.log(`[MonitoringDataService] ⏰ AUTO-COMPLETE: Block ${area} (${session.id}) is ${minutesDiff.toFixed(0)} min old, marking as 100%`);
              areaBreakdown[area] = (areaBreakdown[area] || 0) + session.start_uploads;
              totalProcessed += session.start_uploads;
            } else {
              // Normal case: use end_uploads from API
              areaBreakdown[area] = (areaBreakdown[area] || 0) + endUploads;
              totalProcessed += endUploads;
            }
          });
        }
      });

      console.log('[MonitoringDataService] Processed from upload_details API (end_uploads):', {
        totalProcessed,
        areaBreakdown,
        totalUploaded,
      });

      const inProgress = [];
      const completed = [];

      // Build panels per area based on their own progress
      apiData.forEach((session) => {
        if (!session.area_handle || !Array.isArray(session.area_handle)) return;

        session.area_handle.forEach((areaCode) => {
          const startUploads = session.start_uploads || 0;
          const endUploads = session.end_uploads || 0;

          // Check if auto-complete needed (60+ minutes old)
          const createdAt = new Date(session.created_at);
          const now = new Date();
          const minutesDiff = (now - createdAt) / (1000 * 60); // Convert ms to minutes

          let processed = endUploads;
          let isAutoCompleted = false;

          if (minutesDiff >= 60 && endUploads < startUploads) {
            // Force complete after 60 minutes
            processed = startUploads;
            isAutoCompleted = true;
          }

          // Calculate progress for THIS area only
          const progress = startUploads > 0 ? Math.round((processed / startUploads) * 100) : 0;

          // Check if detection is complete (backend signals completion via detection_completed_at)
          const isDetectionComplete = session.detection_completed_at !== null && session.detection_completed_at !== undefined;

          const areaData = {
            areaCode,
            processed,
            total: startUploads,
            progress: Math.min(progress, 100),
            sessionId: session.id,
            operator: session.operator,
            createdAt: session.created_at,
            detectionCompletedAt: session.detection_completed_at, // Track detection completion timestamp
            minutesOld: minutesDiff.toFixed(0),  // Changed from hoursOld to minutesOld
            autoCompleted: isAutoCompleted,
          };

          // Move to completed if EITHER:
          // 1. Backend explicitly set detection_completed_at (detection done)
          // 2. OR progress >= 100% OR processed >= startUploads (complete by count)
          if (isDetectionComplete || progress >= 100 || processed >= startUploads) {
            completed.push(areaData);
          } else {
            inProgress.push(areaData);
          }
        });
      });

      console.log('[MonitoringDataService] Panels calculated:', {
        inProgress: inProgress.length,
        completed: completed.length,
        totalUploaded,
        totalProcessed,
      });

      return {
        inProgress,
        completed,
        totalUploaded,
        totalProcessed,
        sessionId: latestSession.id,
        operator: latestSession.operator,
        status: latestSession.status,
      };
    } catch (error) {
      console.error('[MonitoringDataService] Error calculating panels data:', error);
      return {
        inProgress: [],
        completed: [],
        totalUploaded: 0,
        totalProcessed: 0,
      };
    }
  }
}

// Export singleton instance
export default new MonitoringDataService();
