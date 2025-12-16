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
      let totalProcessed = 0;
      const areaBreakdown = {};

      if (localSession && localSession.batches && localSession.batches.length > 0) {
        // Count processed from Pusher events stored in AsyncStorage
        localSession.batches.forEach(batch => {
          if (batch.byArea) {
            Object.entries(batch.byArea).forEach(([area, count]) => {
              if (!areaBreakdown[area]) {
                areaBreakdown[area] = 0;
              }
              areaBreakdown[area] += count;
              totalProcessed += count;
            });
          }
        });
      }

      console.log('[MonitoringDataService] Processed from AsyncStorage (Pusher events):', {
        totalProcessed,
        areaBreakdown,
      });

      // Use total start_uploads as the denominator for ALL areas
      // This means each area shows: processed_in_area / total_start_uploads
      // Example: If 695 files uploaded across C,D,K, then:
      //   - Block C: 1/695
      //   - Block D: 64/695
      //   - Block K: 233/695

      const inProgress = [];
      const completed = [];

      finalAreaCodes.forEach((areaCode) => {
        const processedInArea = areaBreakdown[areaCode] || 0; // From Pusher events (detected + undetected)

        // Progress calculation: (processed_in_area / total_start_uploads) * 100%
        const progress = totalUploaded > 0 ? (processedInArea / totalUploaded) * 100 : 0;

        const areaData = {
          areaCode,
          processed: processedInArea,        // Processed files in this area (from Pusher)
          total: totalUploaded,              // TOTAL start_uploads for ALL areas
          progress: Math.min(Math.round(progress), 100),
        };

        // Only show areas that have processed files OR are in area_handle from API
        const areaInAPI = allAreasFromAPI.has(areaCode);

        if (areaInAPI || processedInArea > 0) {
          // If processed equals total uploaded, move to completed panel
          if (processedInArea >= totalUploaded) {
            completed.push(areaData);
          } else {
            inProgress.push(areaData);
          }
        }
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
