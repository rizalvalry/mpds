import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@upload_sessions';

/**
 * Get today's date string in YYYYMMDD format (Jakarta timezone)
 * @returns {string} Date string in format YYYYMMDD
 */
export const getTodayDateString = () => {
  const now = new Date();
  // Convert to Jakarta timezone (UTC+7)
  const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

  const year = jakartaTime.getFullYear();
  const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
  const day = String(jakartaTime.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

/**
 * Load upload sessions from AsyncStorage
 * @returns {Promise<Object>} Upload sessions object
 */
export const loadUploadSessions = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue != null) {
      const sessions = JSON.parse(jsonValue);
      console.log('[UploadSessionStorage] Loaded sessions:', sessions);
      return sessions;
    }
    console.log('[UploadSessionStorage] No sessions found, returning empty object');
    return {};
  } catch (error) {
    console.error('[UploadSessionStorage] Error loading sessions:', error);
    return {};
  }
};

/**
 * Save upload sessions to AsyncStorage
 * @param {Object} sessions - Upload sessions object
 * @returns {Promise<void>}
 */
export const saveUploadSessions = async (sessions) => {
  try {
    const jsonValue = JSON.stringify(sessions);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    console.log('[UploadSessionStorage] Saved sessions:', sessions);
  } catch (error) {
    console.error('[UploadSessionStorage] Error saving sessions:', error);
  }
};

/**
 * Get today's upload session
 * @returns {Promise<Object|null>} Today's session or null if not exists
 */
export const getTodaySession = async () => {
  try {
    const sessions = await loadUploadSessions();
    const todayDate = getTodayDateString();

    if (sessions[todayDate]) {
      console.log('[UploadSessionStorage] Found today session:', sessions[todayDate]);
      return sessions[todayDate];
    }

    console.log('[UploadSessionStorage] No session for today');
    return null;
  } catch (error) {
    console.error('[UploadSessionStorage] Error getting today session:', error);
    return null;
  }
};

/**
 * Add a new upload batch to today's session
 * @param {number} totalFiles - Total files in the batch
 * @param {string} droneCode - Drone code from session
 * @param {Array<string>} areaCodes - Area codes for this upload (e.g., ['C', 'D', 'K', 'L'])
 * @returns {Promise<Object>} Updated session
 */
export const addUploadBatch = async (totalFiles, droneCode = 'N/A', areaCodes = []) => {
  try {
    const sessions = await loadUploadSessions();
    const todayDate = getTodayDateString();

    // Initialize today's session if doesn't exist
    if (!sessions[todayDate]) {
      sessions[todayDate] = {
        date: todayDate,
        droneCode,
        batches: [],
        totalUploaded: 0,
        areaUploadTotals: {}, // NEW: Track total uploads per area
      };
    }

    // Calculate uploads per area (distribute equally)
    const uploadsPerArea = areaCodes.length > 0 ? Math.ceil(totalFiles / areaCodes.length) : totalFiles;

    // Update total uploads per area
    if (!sessions[todayDate].areaUploadTotals) {
      sessions[todayDate].areaUploadTotals = {};
    }
    areaCodes.forEach(area => {
      if (!sessions[todayDate].areaUploadTotals[area]) {
        sessions[todayDate].areaUploadTotals[area] = 0;
      }
      sessions[todayDate].areaUploadTotals[area] += uploadsPerArea;
    });

    // Create new batch
    const batchId = sessions[todayDate].batches.length + 1;
    const newBatch = {
      id: batchId,
      timestamp: new Date().toISOString(),
      totalFiles,
      uploadedFiles: totalFiles, // All files uploaded when batch is created
      areaCodes, // Store area codes for this batch
      byArea: {}, // Will be filled by Pusher events: { 'A': 5, 'B': 3, etc. }
    };

    // Add batch and update total
    sessions[todayDate].batches.push(newBatch);
    sessions[todayDate].totalUploaded += totalFiles;
    sessions[todayDate].droneCode = droneCode; // Update drone code

    // Save to storage
    await saveUploadSessions(sessions);

    console.log('[UploadSessionStorage] Added batch:', newBatch);
    console.log('[UploadSessionStorage] Total uploaded today:', sessions[todayDate].totalUploaded);
    console.log('[UploadSessionStorage] Upload totals per area:', sessions[todayDate].areaUploadTotals);

    return sessions[todayDate];
  } catch (error) {
    console.error('[UploadSessionStorage] Error adding batch:', error);
    throw error;
  }
};

/**
 * Update area progress for today's batches
 * @param {string} areaCode - Area code (e.g., 'A', 'B', 'C')
 * @param {number} count - Number of files processed in this area
 * @returns {Promise<Object>} Updated session
 */
export const updateAreaProgress = async (areaCode, count) => {
  try {
    const sessions = await loadUploadSessions();
    const todayDate = getTodayDateString();

    if (!sessions[todayDate]) {
      console.warn('[UploadSessionStorage] No session for today, cannot update area');
      return null;
    }

    // Update the latest batch (most recent upload)
    const latestBatch = sessions[todayDate].batches[sessions[todayDate].batches.length - 1];
    if (latestBatch) {
      if (!latestBatch.byArea[areaCode]) {
        latestBatch.byArea[areaCode] = 0;
      }
      latestBatch.byArea[areaCode] += count;

      await saveUploadSessions(sessions);
      console.log('[UploadSessionStorage] Updated area progress:', { areaCode, count, total: latestBatch.byArea[areaCode] });
    }

    return sessions[todayDate];
  } catch (error) {
    console.error('[UploadSessionStorage] Error updating area progress:', error);
    throw error;
  }
};

/**
 * Record processed file from Pusher event
 * This increments the counter for specific area
 * @param {string} areaCode - Area code from Pusher event
 * @returns {Promise<number>} New count for this area
 */
export const recordProcessedFile = async (areaCode) => {
  try {
    const sessions = await loadUploadSessions();
    const todayDate = getTodayDateString();

    if (!sessions[todayDate]) {
      console.warn('[UploadSessionStorage] No session for today, creating one');
      sessions[todayDate] = {
        date: todayDate,
        droneCode: 'Unknown',
        batches: [{
          id: 1,
          timestamp: new Date().toISOString(),
          totalFiles: 0,
          uploadedFiles: 0,
          byArea: {},
        }],
        totalUploaded: 0,
      };
    }

    // Get latest batch
    const latestBatch = sessions[todayDate].batches[sessions[todayDate].batches.length - 1];

    if (!latestBatch.byArea[areaCode]) {
      latestBatch.byArea[areaCode] = 0;
    }
    latestBatch.byArea[areaCode] += 1;

    await saveUploadSessions(sessions);

    console.log('[UploadSessionStorage] Recorded processed file:', {
      areaCode,
      newCount: latestBatch.byArea[areaCode],
    });

    return latestBatch.byArea[areaCode];
  } catch (error) {
    console.error('[UploadSessionStorage] Error recording processed file:', error);
    throw error;
  }
};

/**
 * Get total processed count for today (sum of all area counts)
 * @returns {Promise<number>} Total processed files
 */
export const getTotalProcessedToday = async () => {
  try {
    const todaySession = await getTodaySession();
    if (!todaySession) return 0;

    let total = 0;
    todaySession.batches.forEach(batch => {
      Object.values(batch.byArea).forEach(count => {
        total += count;
      });
    });

    console.log('[UploadSessionStorage] Total processed today:', total);
    return total;
  } catch (error) {
    console.error('[UploadSessionStorage] Error getting total processed:', error);
    return 0;
  }
};

/**
 * Get area breakdown for today (e.g., { 'A': 10, 'B': 5 })
 * @returns {Promise<Object>} Area breakdown
 */
export const getAreaBreakdownToday = async () => {
  try {
    const todaySession = await getTodaySession();
    if (!todaySession) return {};

    const areaBreakdown = {};
    todaySession.batches.forEach(batch => {
      Object.entries(batch.byArea).forEach(([areaCode, count]) => {
        if (!areaBreakdown[areaCode]) {
          areaBreakdown[areaCode] = 0;
        }
        areaBreakdown[areaCode] += count;
      });
    });

    console.log('[UploadSessionStorage] Area breakdown:', areaBreakdown);
    return areaBreakdown;
  } catch (error) {
    console.error('[UploadSessionStorage] Error getting area breakdown:', error);
    return {};
  }
};

/**
 * Clear old sessions (keep only today)
 * @returns {Promise<void>}
 */
export const clearOldSessions = async () => {
  try {
    const sessions = await loadUploadSessions();
    const todayDate = getTodayDateString();

    // Keep only today's session
    const cleanedSessions = {};
    if (sessions[todayDate]) {
      cleanedSessions[todayDate] = sessions[todayDate];
    }

    await saveUploadSessions(cleanedSessions);
    console.log('[UploadSessionStorage] Cleared old sessions, kept only:', todayDate);
  } catch (error) {
    console.error('[UploadSessionStorage] Error clearing old sessions:', error);
  }
};

/**
 * Reset all sessions (for testing)
 * @returns {Promise<void>}
 */
export const resetAllSessions = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[UploadSessionStorage] Reset all sessions');
  } catch (error) {
    console.error('[UploadSessionStorage] Error resetting sessions:', error);
  }
};

/**
 * Get statistics for today
 * @returns {Promise<Object>} Statistics object
 */
export const getTodayStatistics = async () => {
  try {
    const todaySession = await getTodaySession();

    if (!todaySession) {
      return {
        totalUploaded: 0,
        totalProcessed: 0,
        batchCount: 0,
        areaBreakdown: {},
        progress: 0,
      };
    }

    const totalProcessed = await getTotalProcessedToday();
    const areaBreakdown = await getAreaBreakdownToday();
    const progress = todaySession.totalUploaded > 0
      ? Math.round((totalProcessed / todaySession.totalUploaded) * 100)
      : 0;

    return {
      totalUploaded: todaySession.totalUploaded,
      totalProcessed,
      batchCount: todaySession.batches.length,
      areaBreakdown,
      progress,
      droneCode: todaySession.droneCode,
    };
  } catch (error) {
    console.error('[UploadSessionStorage] Error getting statistics:', error);
    return {
      totalUploaded: 0,
      totalProcessed: 0,
      batchCount: 0,
      areaBreakdown: {},
      progress: 0,
    };
  }
};

/**
 * Get monitoring panels data (In Progress vs Completed)
 * @param {Array<string>} areaCodes - Area codes from session (e.g., ['C', 'D', 'K', 'L'])
 * @returns {Promise<Object>} Panels data with inProgress and completed arrays
 */
export const getMonitoringPanelsData = async (areaCodes = []) => {
  try {
    const todaySession = await getTodaySession();

    if (!todaySession) {
      return {
        inProgress: [],
        completed: [],
        totalUploaded: 0,
        totalProcessed: 0,
      };
    }

    const areaBreakdown = await getAreaBreakdownToday();
    const totalUploaded = todaySession.totalUploaded;
    const totalProcessed = await getTotalProcessedToday();
    const areaUploadTotals = todaySession.areaUploadTotals || {}; // NEW: Get upload totals per area

    // Get all unique area codes from uploads and Pusher events
    const uploadedAreas = Object.keys(areaUploadTotals);
    const pusherAreas = Object.keys(areaBreakdown);
    const allAreas = [...new Set([...uploadedAreas, ...pusherAreas])];

    // If no areaCodes provided, use all areas from uploads + Pusher events
    let finalAreaCodes = areaCodes;
    if (!finalAreaCodes || finalAreaCodes.length === 0) {
      finalAreaCodes = allAreas;
      console.log('[UploadSessionStorage] No area codes from session, using areas from uploads + Pusher:', finalAreaCodes);
    }

    // If still no areas, return empty
    if (finalAreaCodes.length === 0) {
      return {
        inProgress: [],
        completed: [],
        totalUploaded,
        totalProcessed,
      };
    }

    const inProgress = [];
    const completed = [];

    finalAreaCodes.forEach((areaCode) => {
      const processedInArea = areaBreakdown[areaCode] || 0;
      // Use upload total from AsyncStorage if available, otherwise fallback to processed count
      const expectedInArea = areaUploadTotals[areaCode] || processedInArea;
      const progress = expectedInArea > 0 ? (processedInArea / expectedInArea) * 100 : 0;

      const areaData = {
        areaCode,
        processed: processedInArea,
        total: expectedInArea,
        progress: Math.min(Math.round(progress), 100),
      };

      // Determine if area is completed or in progress
      // If uploaded total exists for this area, use it to determine completion
      if (areaUploadTotals[areaCode] && areaUploadTotals[areaCode] > 0) {
        // Upload-based mode: compare processed vs uploaded total
        if (processedInArea >= areaUploadTotals[areaCode]) {
          completed.push(areaData);
        } else {
          inProgress.push(areaData);
        }
      } else {
        // Real-time mode (no upload yet): show areas with Pusher data as in-progress
        if (processedInArea > 0) {
          inProgress.push(areaData);
        }
      }
    });

    console.log('[UploadSessionStorage] Monitoring panels data:', {
      inProgress: inProgress.length,
      completed: completed.length,
      totalUploaded,
      totalProcessed,
      areaCodes: finalAreaCodes,
    });

    return {
      inProgress,
      completed,
      totalUploaded,
      totalProcessed,
    };
  } catch (error) {
    console.error('[UploadSessionStorage] Error getting monitoring panels data:', error);
    return {
      inProgress: [],
      completed: [],
      totalUploaded: 0,
      totalProcessed: 0,
    };
  }
};
