# Upload Tracking Implementation - Mobile App

## Overview
Implementasi upload tracking dengan localStorage (AsyncStorage) untuk mobile app `frontend.appdrone-expo`. Sistem ini menghitung jumlah file yang diupload oleh user dan menampilkan progress block di Monitoring screen.

## Fitur Utama

### 1. Upload Session Tracking
- Setiap kali user upload file, sistem menyimpan batch info ke AsyncStorage
- Data tersimpan per hari (format: YYYYMMDD)
- Mendukung multiple upload sessions dalam satu hari (Batch 1, 2, 3, dst.)

### 2. Block Progress Display
Format: **Block A ~ 17/300**
- **300**: Total file yang diupload oleh user (dari AsyncStorage)
- **17**: Jumlah file yang sudah diproses di area A (dari Pusher events atau polling)

### 3. Daily Auto-Clear
- Setiap kali app diluncurkan, data upload session hari sebelumnya otomatis dihapus
- Hanya data hari ini yang disimpan di device

### 4. 2-Panel Block Progress View
- **In Progress Panel** (Yellow): Blocks yang masih dalam proses (processed < uploaded)
- **Complete Panel** (Green): Blocks yang sudah selesai (processed >= uploaded)

---

## File Yang Dimodifikasi

### 1. **NEW FILE**: `src/utils/uploadSessionStorage.js`
Helper utilities untuk mengelola upload sessions di AsyncStorage.

**Fungsi Utama:**
- `getTodayDateString()` - Get date string YYYYMMDD (Jakarta timezone)
- `loadUploadSessions()` - Load semua sessions dari AsyncStorage
- `saveUploadSessions(sessions)` - Save sessions ke AsyncStorage
- `getTodaySession()` - Get session hari ini
- `addUploadBatch(totalFiles, droneCode)` - Tambah batch upload baru
- `updateAreaProgress(areaCode, count)` - Update progress per area (untuk Pusher integration)
- `getTotalProcessedToday()` - Hitung total file yang sudah diproses
- `getAreaBreakdownToday()` - Get breakdown per area (e.g., { 'A': 10, 'B': 5 })
- `clearOldSessions()` - Hapus session hari lama (daily auto-clear)
- `getTodayStatistics()` - Get statistik lengkap hari ini

**Data Structure:**
```javascript
{
  "uploadSessions": {
    "20251111": {
      "date": "20251111",
      "droneCode": "D-001",
      "batches": [
        {
          "id": 1,
          "timestamp": "2025-11-11T10:00:00Z",
          "totalFiles": 300,
          "uploadedFiles": 300,
          "byArea": {
            "A": 17,  // Updated by Pusher
            "B": 5,
            "C": 0
          }
        },
        {
          "id": 2,
          "timestamp": "2025-11-11T14:00:00Z",
          "totalFiles": 150,
          "uploadedFiles": 150,
          "byArea": {
            "A": 50,
            "D": 10
          }
        }
      ],
      "totalUploaded": 450  // Sum of all batches
    }
  }
}
```

---

### 2. **MODIFIED**: `src/screens/UploadScreen.js`

**Changes:**
1. Import helper: `import { addUploadBatch } from '../utils/uploadSessionStorage';`
2. Setelah upload berhasil, save batch info ke AsyncStorage:
```javascript
// Save upload batch to AsyncStorage for monitoring
try {
  const droneCode = session?.drone?.drone_code || 'N/A';
  await addUploadBatch(result.summary.success, droneCode);
  console.log('[Upload] Saved batch to AsyncStorage');
} catch (error) {
  console.error('[Upload] Failed to save batch:', error);
  // Don't block user flow if storage fails
}
```

3. Update Alert message untuk memberitahu user:
```javascript
Alert.alert(
  'Upload Complete! ✅',
  `Successfully uploaded ${result.summary.success} images!\n\nTrack progress in Monitoring tab.`
);
```

---

### 3. **REPLACED**: `src/screens/MonitoringScreen.js`

**Major Changes:**
- Removed Azure Blob Storage polling
- Added AsyncStorage-based upload tracking
- Implemented 2-panel block progress display
- Auto-refresh every 10 seconds
- Pull-to-refresh support

**New UI Components:**

#### a. Summary Cards
```
┌─────────────┬─────────────┬─────────────┐
│   UPLOADED  │  PROCESSED  │   BATCHES   │
│     📤      │      ✅     │      📦     │
│     300     │     67      │      2      │
└─────────────┴─────────────┴─────────────┘
```

#### b. Overall Progress Bar
```
OVERALL PROGRESS                    22%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░
67 / 300 files completed
```

#### c. 2-Panel Block Progress
```
┌──────────────────┬──────────────────┐
│  ⏳ IN PROGRESS │    ✅ COMPLETE   │
├──────────────────┼──────────────────┤
│ Block A ~ 17/300 │ Block B ~ 250/250│
│ ████░░░░░░ 5.6%  │ ██████████ 100%  │
│                  │                  │
│ Block C ~ 5/300  │ Block D ~ 150/150│
│ █░░░░░░░░░ 1.6%  │ ██████████ 100%  │
└──────────────────┴──────────────────┘
```

**Backup:**
- Original file backed up to: `MonitoringScreen.backup.js`

---

### 4. **MODIFIED**: `App.js`

**Changes:**
1. Import helper: `import { clearOldSessions } from './src/utils/uploadSessionStorage';`
2. Add daily auto-clear logic di app launch:
```javascript
useEffect(() => {
  async function prepare() {
    try {
      // Clear old upload sessions on app launch (daily auto-clear)
      console.log('[App] Clearing old upload sessions...');
      await clearOldSessions();
      console.log('[App] Old sessions cleared successfully');

      // ... rest of code
    } catch (e) {
      console.warn('Error during preparation:', e);
    }
  }

  prepare();
}, []);
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────┐
         │   1. User selects 300      │
         │      images in Upload tab  │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   2. User hits Upload      │
         │      button                │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   3. ChunkedUploadService  │
         │      uploads in batches    │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   4. Upload success!       │
         │      addUploadBatch()      │
         │      called                │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   5. AsyncStorage stores:  │
         │      {                     │
         │        totalFiles: 300,    │
         │        droneCode: "D-001", │
         │        byArea: {}          │
         │      }                     │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   6. Alert shows:          │
         │      "Track progress in    │
         │       Monitoring tab"      │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   7. User switches to      │
         │      Monitoring tab        │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   8. MonitoringScreen      │
         │      reads AsyncStorage    │
         │      via getTodayStats()   │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   9. Display shows:        │
         │      UPLOADED: 300 files   │
         │      PROCESSED: 0 files    │
         │      (waiting for worker)  │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  10. backend.worker        │
         │      processes files       │
         │      (sends Pusher events) │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  11. [FUTURE] Pusher       │
         │      listener updates      │
         │      byArea: { 'A': 17 }   │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  12. Block progress shows: │
         │      Block A ~ 17/300      │
         │      (In Progress panel)   │
         └────────────────────────────┘
```

---

## Implementation Status

### ✅ Completed:
1. AsyncStorage helper utilities (`uploadSessionStorage.js`)
2. UploadScreen integration (save batch on upload success)
3. MonitoringScreen redesign with 2-panel block progress
4. Daily auto-clear logic in App.js
5. UI/UX implementation (summary cards, progress bar, block panels)

### ⏳ Pending (Optional Enhancements):
1. **Pusher Integration** (untuk real-time updates dari backend.worker)
   - Saat ini system sudah siap menerima Pusher events
   - Fungsi `updateAreaProgress(areaCode, count)` sudah tersedia
   - Tinggal install library dan setup listener

2. **Backend Changes** (TIDAK WAJIB):
   - System ini bekerja WITHOUT backend changes
   - Backend.worker tetap mengirim Pusher events seperti biasa
   - Frontend hanya perlu subscribe ke channel

---

## Testing Checklist

### Test 1: Upload Tracking
- [ ] Upload 6 files di Upload tab
- [ ] Check console log: `[Upload] Saved batch to AsyncStorage`
- [ ] Switch ke Monitoring tab
- [ ] Verify: UPLOADED card shows "6 files"
- [ ] Verify: BATCHES card shows "1 today"

### Test 2: Multiple Batches
- [ ] Upload 10 files (Batch 1)
- [ ] Upload 5 files (Batch 2)
- [ ] Check Monitoring tab
- [ ] Verify: UPLOADED shows "15 files"
- [ ] Verify: BATCHES shows "2 today"

### Test 3: Daily Auto-Clear
- [ ] Upload files today
- [ ] Close app completely
- [ ] Change device date to tomorrow (in Settings)
- [ ] Relaunch app
- [ ] Check console: `[App] Clearing old upload sessions...`
- [ ] Switch to Monitoring tab
- [ ] Verify: All stats reset to 0

### Test 4: Pull to Refresh
- [ ] Upload 6 files
- [ ] Go to Monitoring tab
- [ ] Pull down to refresh
- [ ] Verify: Stats reload correctly
- [ ] Check console: `[Monitoring] Stats updated`

### Test 5: Auto-Refresh
- [ ] Go to Monitoring tab
- [ ] Wait 10 seconds
- [ ] Check console: Stats should auto-refresh every 10s
- [ ] Verify: "Last Update" time changes

### Test 6: Empty State
- [ ] Fresh app (no uploads today)
- [ ] Go to Monitoring tab
- [ ] Verify: Shows empty state with message
- [ ] Message: "No Uploads Today"

### Test 7: Block Progress (Manual)
- [ ] Upload 300 files
- [ ] Monitoring shows Block A ~ 0/300 (In Progress)
- [ ] Manually call: `updateAreaProgress('A', 17)`
- [ ] Verify: Block A ~ 17/300 (still In Progress)
- [ ] Call: `updateAreaProgress('A', 283)` (total 300)
- [ ] Verify: Block A ~ 300/300 moves to Complete panel

---

## Future: Pusher Integration

Untuk menambahkan Pusher real-time updates:

### 1. Install Pusher Library
```bash
npm install pusher-js
```

### 2. Create Pusher Service
```javascript
// src/services/PusherService.js
import Pusher from 'pusher-js';
import { updateAreaProgress } from '../utils/uploadSessionStorage';

const PUSHER_KEY = '56f392033b1ff203c45a';
const PUSHER_CLUSTER = 'ap1';
const PUSHER_CHANNEL = 'detection-events';

class PusherService {
  constructor() {
    this.pusher = null;
    this.channel = null;
  }

  connect() {
    this.pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      encrypted: true,
    });

    this.channel = this.pusher.subscribe(PUSHER_CHANNEL);

    // Listen to file-detected event
    this.channel.bind('file-detected', async (data) => {
      const { area_code, line_number, slot_number } = data;
      console.log('[Pusher] File detected:', { area_code, line_number, slot_number });

      // Update area progress in AsyncStorage
      if (area_code) {
        await updateAreaProgress(area_code, 1);
      }
    });
  }

  disconnect() {
    if (this.channel) {
      this.channel.unbind_all();
      this.pusher.unsubscribe(PUSHER_CHANNEL);
    }
    if (this.pusher) {
      this.pusher.disconnect();
    }
  }
}

export default new PusherService();
```

### 3. Use in MonitoringScreen
```javascript
import pusherService from '../services/PusherService';

useEffect(() => {
  // Connect to Pusher
  pusherService.connect();

  return () => {
    // Disconnect on unmount
    pusherService.disconnect();
  };
}, []);
```

---

## Troubleshooting

### Issue: Upload count tidak tersimpan
**Solution:** Check console untuk error di `addUploadBatch()`. Pastikan AsyncStorage permission granted.

### Issue: Auto-clear tidak jalan
**Solution:** Check console log saat app launch. Pastikan `clearOldSessions()` dipanggil.

### Issue: Block progress tidak update
**Solution:** Saat ini manual (menunggu Pusher integration). Call `updateAreaProgress()` secara manual untuk testing.

### Issue: Stats tidak refresh
**Solution:** Pull down di Monitoring screen untuk manual refresh. Auto-refresh setiap 10 detik.

---

## Architecture Benefits

### ✅ No Backend Changes Required
- Backend.worker tetap sama (no changes needed)
- Backend.upload tetap sama (no changes needed)
- Hanya frontend yang berubah

### ✅ Offline-First
- Data tersimpan di device
- Tidak perlu koneksi untuk melihat upload history
- Pull-to-refresh untuk update dari backend (future)

### ✅ Performance
- AsyncStorage sangat cepat (local device)
- No polling ke Azure Blob Storage (hemat bandwidth)
- Auto-clear daily (tidak membebani storage)

### ✅ Scalable
- Support multiple batches per day
- Support multiple areas (A, B, C, D, K, dll.)
- Ready for Pusher integration (optional)

---

## Summary

**Total Files Modified:** 4
1. `src/utils/uploadSessionStorage.js` (NEW)
2. `src/screens/UploadScreen.js` (MODIFIED)
3. `src/screens/MonitoringScreen.js` (REPLACED)
4. `App.js` (MODIFIED)

**Total Files Backed Up:** 1
1. `src/screens/MonitoringScreen.backup.js`

**Lines of Code:**
- uploadSessionStorage.js: ~270 lines
- UploadScreen changes: +15 lines
- MonitoringScreen: ~850 lines (complete rewrite)
- App.js changes: +5 lines

**Deployment:**
- ✅ No database changes
- ✅ No backend.worker changes
- ✅ No backend.upload changes
- ✅ Frontend-only changes
- ✅ Metro bundler will hot-reload automatically

---

**Status:** ✅ READY FOR TESTING
**Risk Level:** ⭐ Very Low (frontend-only, no backend dependencies)
**Testing Required:** Yes (upload 6 files and verify monitoring display)
