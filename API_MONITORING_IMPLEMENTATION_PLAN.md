# API-Based Monitoring Implementation - Complete Plan

## Overview
Implementasi sistem monitoring yang terintegrasi dengan API backend untuk tracking upload progress secara real-time dengan Pusher events.

---

## Architecture

### Data Flow Complete:

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPLOAD FLOW                                   │
└─────────────────────────────────────────────────────────────────┘

1. User selects 300 images
2. User clicks "Start Upload"
   ↓
3. POST /api/UploadDetails
   {
     operator: "Drone-001",
     status: "active",
     start_uploads: 300,
     end_uploads: 0,
     area_handle: ["C", "D", "K", "L"]
   }
   ↓
4. Upload images via ChunkedUploadService
   ↓
5. Images processed by backend.worker
   ↓
6. Pusher sends "file-detected" events
   {
     area_code: "C",
     line_number: 1,
     slot_number: 5
   }

┌─────────────────────────────────────────────────────────────────┐
│                  MONITORING FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1. User goes to Monitoring tab
   ↓
2. GET /api/UploadDetails?createdAt=2025-11-11
   Returns:
   {
     data: [{
       id: 1,
       operator: "DP003",
       start_uploads: 300,
       end_uploads: 0,
       area_handle: ["C", "D", "K", "L"],
       status: "active"
     }]
   }
   ↓
3. Display in panels:
   - Total: 300 files (from start_uploads)
   - Processed: X files (from Pusher events count)
   - Per area: Distribute 300/4 = 75 per area
   ↓
4. Pusher updates incrementally
   - Block C: 5/75
   - Block D: 3/75
   - Block K: 0/75
   - Block L: 0/75
   ↓
5. When all processed (C+D+K+L = 300)
   → Move to "Completed" panel
   → Status: "Finished"
```

---

## Implementation Steps

### ✅ Step 1: API Service (COMPLETED)

**File**: `src/services/ApiService.js`

Added methods:
```javascript
// GET upload details by date
async getUploadDetails(createdAt)

// POST create upload session
async createUploadDetails({
  operator,
  status,
  startUploads,
  endUploads,
  areaHandle
})
```

---

### Step 2: Update UploadScreen.js

**Location**: After successful upload, before showing Alert

**Add**:
```javascript
// After upload success
try {
  const uploadData = {
    operator: session?.drone?.drone_code || 'Unknown',
    status: 'active',
    startUploads: result.summary.success,
    endUploads: 0,
    areaHandle: session?.area_code || [],
  };

  const apiResponse = await apiService.createUploadDetails(uploadData);

  if (apiResponse.success) {
    console.log('[UploadScreen] ✅ Upload session created in API:', apiResponse.data);
  } else {
    console.warn('[UploadScreen] ⚠️ Failed to create API session:', apiResponse.message);
  }
} catch (error) {
  console.error('[UploadScreen] ❌ API session creation error:', error);
  // Don't block user flow
}
```

**Placement**: Insert after line 256 (after `setOverallProgress(100)`)

---

### Step 3: Create MonitoringDataService.js

**New File**: `src/services/MonitoringDataService.js`

**Purpose**: Centralize monitoring data logic

```javascript
import apiService from './ApiService';
import { updateAreaProgress, getTodaySession } from '../utils/uploadSessionStorage';

class MonitoringDataService {
  /**
   * Get today's date in YYYY-MM-DD format (Jakarta timezone)
   */
  getTodayDate() {
    const now = new Date();
    const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

    const year = jakartaTime.getFullYear();
    const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
    const day = String(jakartaTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Fetch upload sessions from API
   */
  async fetchTodayUploads() {
    try {
      const today = this.getTodayDate();
      const response = await apiService.getUploadDetails(today);

      if (response.success && response.data.length > 0) {
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        data: [],
        message: 'No uploads found for today',
      };
    } catch (error) {
      console.error('[MonitoringData] Error fetching uploads:', error);
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  /**
   * Calculate monitoring panels data from API + AsyncStorage
   * @param {Array} apiData - Data from API
   * @param {Array} areaCodes - User's area codes
   */
  async calculatePanelsData(apiData, areaCodes) {
    if (!apiData || apiData.length === 0 || !areaCodes || areaCodes.length === 0) {
      return {
        inProgress: [],
        completed: [],
        totalUploaded: 0,
        totalProcessed: 0,
      };
    }

    // Get latest upload session
    const latestSession = apiData[0]; // Most recent
    const totalUploaded = latestSession.start_uploads;

    // Get processed count from AsyncStorage (Pusher events)
    const localSession = await getTodaySession();
    let totalProcessed = 0;
    const areaBreakdown = {};

    if (localSession && localSession.batches.length > 0) {
      // Count processed from Pusher events
      localSession.batches.forEach(batch => {
        Object.entries(batch.byArea).forEach(([area, count]) => {
          if (!areaBreakdown[area]) {
            areaBreakdown[area] = 0;
          }
          areaBreakdown[area] += count;
          totalProcessed += count;
        });
      });
    }

    // Calculate expected files per area
    const filesPerArea = Math.ceil(totalUploaded / areaCodes.length);

    const inProgress = [];
    const completed = [];

    areaCodes.forEach((areaCode) => {
      const processedInArea = areaBreakdown[areaCode] || 0;
      const expectedInArea = filesPerArea;
      const progress = expectedInArea > 0 ? (processedInArea / expectedInArea) * 100 : 0;

      const areaData = {
        areaCode,
        processed: processedInArea,
        total: expectedInArea,
        progress: Math.min(Math.round(progress), 100),
      };

      // If processed >= expected, move to completed
      if (processedInArea >= expectedInArea) {
        completed.push(areaData);
      } else {
        inProgress.push(areaData);
      }
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
  }
}

export default new MonitoringDataService();
```

---

### Step 4: Update MonitoringMockup.js

**Replace** `loadData()` function:

```javascript
const loadData = async (showLoading = true) => {
  try {
    if (showLoading) {
      setLoading(true);
    }

    // Get area codes from session
    const areaCodes = session?.area_code || [];

    // Fetch from API
    const apiResponse = await monitoringDataService.fetchTodayUploads();

    if (apiResponse.success && apiResponse.data.length > 0) {
      // Calculate panels data
      const panels = await monitoringDataService.calculatePanelsData(
        apiResponse.data,
        areaCodes
      );

      setPanelsData(panels);

      // Also get local statistics for backward compatibility
      const statistics = await getTodayStatistics();
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
      // No API data, fallback to local AsyncStorage
      const panels = await getMonitoringPanelsData(areaCodes);
      const statistics = await getTodayStatistics();

      setPanelsData(panels);
      setStats(statistics);
      setLastUpdate(new Date());

      console.log('[MonitoringMockup] No API data, using local storage');
    }
  } catch (error) {
    console.error('[MonitoringMockup] Error loading data:', error);
  } finally {
    if (showLoading) {
      setLoading(false);
    }
    setRefreshing(false);
  }
};
```

**Add import**:
```javascript
import monitoringDataService from '../services/MonitoringDataService';
```

---

### Step 5: Update uploadSessionStorage.js

**Add function** to sync with Pusher events:

```javascript
/**
 * Record processed file from Pusher event
 * This increments the counter for specific area
 * @param {string} areaCode - Area code from Pusher event
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
```

---

### Step 6: Update PusherService.js

**Modify** `file-detected` event handler:

```javascript
// Bind to file-detected event
this.channel.bind(PUSHER_CONFIG.EVENT, async (data) => {
  console.log('[PusherService] 📥 File detected event:', data);

  try {
    const { area_code, line_number, slot_number, status } = data;

    // Update AsyncStorage with area progress
    if (area_code) {
      const newCount = await recordProcessedFile(area_code);
      console.log('[PusherService] Updated area progress:', {
        area_code,
        count: newCount,
      });
    }

    // Call user callback if provided
    if (onFileDetected && typeof onFileDetected === 'function') {
      onFileDetected(data);
    }
  } catch (error) {
    console.error('[PusherService] Error handling file-detected event:', error);
  }
});
```

**Add import**:
```javascript
import { recordProcessedFile } from '../utils/uploadSessionStorage';
```

---

## Testing Plan

### Test 1: Upload Session Creation
1. Select 20 files in Upload tab
2. Click "Start Upload"
3. Check console:
   ```
   [UploadScreen] ✅ Upload session created in API: { id: 1, operator: "Drone-001", ... }
   ```
4. Verify API received data (check backend logs or database)

### Test 2: Monitoring Data Load
1. Go to Monitoring tab
2. Check console:
   ```
   [API] GET https://droneark.bsi.co.id/services/cases/api/UploadDetails?createdAt=2025-11-11
   [API] Response: { data: [...], success: true }
   [MonitoringMockup] Data loaded from API: { totalUploaded: 300, totalProcessed: 0 }
   ```
3. Verify UI shows:
   - UPLOADED: 300 (from API)
   - PROCESSED: 0 (from Pusher events)
   - IN PROGRESS: Block C, D, K, L (each 0/75)

### Test 3: Pusher Event Processing
1. Backend.worker processes file in area C
2. Pusher sends event
3. Check console:
   ```
   [PusherService] 📥 File detected event: { area_code: "C", ... }
   [PusherService] Updated area progress: { area_code: "C", count: 1 }
   ```
4. Wait for auto-refresh (10 seconds)
5. Verify UI updates:
   - PROCESSED: 1
   - Block C: 1/75 (1%)

### Test 4: Complete Flow
1. Upload 20 files
2. Monitor processes all 20 files
3. Pusher sends 20 events (5 per area for C, D, K, L)
4. Verify final state:
   - PROCESSED: 20/20 (100%)
   - All blocks moved to COMPLETED panel
   - Status: "Finished"

---

## Key Points

### API Integration:
- ✅ GET uploads on Monitoring tab mount
- ✅ POST upload session on "Start Upload"
- ✅ Use `start_uploads` as source of truth for total count
- ✅ Use Pusher events count for processed count

### Data Priority:
1. **Total Uploaded**: FROM API (`start_uploads`)
2. **Total Processed**: FROM AsyncStorage (Pusher events count)
3. **Per Area**: Calculated distribution (total/area_count)

### Panel Logic:
- **In Progress**: `processed < expected`
- **Completed**: `processed >= expected`
- **Finished**: All areas completed (`total_processed >= total_uploaded`)

### Error Handling:
- If API fails: Fallback to AsyncStorage (local tracking)
- If Pusher disconnects: Auto-reconnect + manual refresh
- If count mismatch: Log warning, continue operation

---

## Status

✅ API endpoints added to ApiService
✅ UploadScreen integration (COMPLETED)
✅ uploadSessionStorage updated with recordProcessedFile (COMPLETED)
✅ PusherService updated to use recordProcessedFile (COMPLETED)
✅ MonitoringDataService created (COMPLETED)
✅ MonitoringMockup updated to GET from API (COMPLETED)
⏳ Complete testing (ready for testing)

**Current Status**: All implementation steps completed! Ready for end-to-end testing.

---

## Files Modified

1. ✅ `src/services/ApiService.js` - Added API methods (getUploadDetails, createUploadDetails)
2. ✅ `src/screens/UploadScreen.js` - Added POST on upload success
3. ✅ `src/services/MonitoringDataService.js` - Created new service (NEW FILE)
4. ✅ `src/screens/MonitoringMockup.js` - Updated load logic to use API
5. ✅ `src/utils/uploadSessionStorage.js` - Added recordProcessedFile function
6. ✅ `src/services/PusherService.js` - Updated event handler to use recordProcessedFile

**Total**: 6 files (ALL COMPLETED - 1 new file created, 5 files modified)
