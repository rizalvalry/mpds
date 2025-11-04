# Monitoring Screen - Error Fix Documentation

## Masalah yang Diperbaiki

### Error yang Dilaporkan
```
ERROR  Error loading stats: [TypeError: azureBlobService.default.getStorageStats is not a function (it is undefined)]
```

### Penyebab Error
File `MonitoringMockup.js` mencoba memanggil fungsi `getStorageStats()` dari `AzureBlobService`, tetapi fungsi tersebut tidak ada. 

**Kode yang salah** (baris 28):
```javascript
const data = await azureBlobService.getStorageStats();
```

## Solusi yang Diterapkan

### 1. Fungsi yang Benar
Mengubah pemanggilan fungsi dari `getStorageStats()` ke `getAllStats()` yang sudah tersedia di `AzureBlobService.js`.

**Kode yang diperbaiki**:
```javascript
const data = await azureBlobService.getAllStats();
```

### 2. Mapping Data yang Benar

#### Response dari `getAllStats()`:
```javascript
{
  input: number,           // Files in input folder
  queued: number,          // Files in queued folder
  processed: number,       // Files processed today
  detected: number,        // Files with detection today
  undetected: number,      // Files without detection today
  total: number,           // Total files
  timestamp: string        // ISO timestamp
}
```

#### Mapping ke UI Variables:
```javascript
// Map Azure Blob stats to UI format
const inputCount = stats?.input || 0;
const queuedCount = stats?.queued || 0;
const processingCount = stats?.processed || 0;
const completedCount = (stats?.detected || 0) + (stats?.undetected || 0);
const totalCount = inputCount + queuedCount + processingCount;
const processingPercentage = totalCount > 0 ? Math.round((processingCount / totalCount) * 100) : 0;
const isComplete = queuedCount === 0 && processingCount === 0 && totalCount > 0;
```

### 3. Error Handling yang Diperbaiki

Menambahkan default stats pada error handler untuk mencegah UI crash:

```javascript
const loadStats = async () => {
  try {
    setLoading(true);
    const data = await azureBlobService.getAllStats();
    setStats(data);
    setLastUpdate(new Date());
  } catch (error) {
    console.error('Error loading stats:', error);
    // Set default stats on error to prevent UI crash
    setStats({
      input: 0,
      queued: 0,
      processed: 0,
      detected: 0,
      undetected: 0,
      total: 0,
    });
  } finally {
    setLoading(false);
  }
};
```

### 4. Status Banner yang Lebih Informatif

Mengupdate status banner untuk menampilkan 3 state yang berbeda:

#### State 1: System Idle (Tidak ada file)
- Background: Abu-abu (`#E5E7EB`)
- Icon: 💤
- Text: "SYSTEM IDLE"
- Detail: "No files in queue"

#### State 2: Processing In Progress (Ada file di queue/processing)
- Background: Kuning (`#FEF3C7`)
- Icon: ⚙️
- Text: "PROCESSING IN PROGRESS"
- Detail: "{queuedCount} queued, {processingCount} processing"

#### State 3: All Complete (Semua selesai)
- Background: Hijau (`#D1FAE5`)
- Icon: ✅
- Text: "ALL PROCESSING COMPLETE"
- Detail: "{completedCount} files completed - System ready"

### 5. Processing Pipeline Card yang Lebih Akurat

Mengupdate Stage 2 (Processing) untuk menampilkan:
- Progress: `{processingCount} / {totalCount}`
- Label: "Files Processed Today" (lebih akurat dari "Images Processing")
- Progress bar berdasarkan `processingPercentage`

## File yang Dimodifikasi

### 1. `MonitoringMockup.js`
**Lokasi**: `D:\MPDS\mobile_project\frontend.appdrone-expo\src\screens\MonitoringMockup.js`

**Perubahan**:
- ✅ Fungsi `loadStats()` menggunakan `getAllStats()` 
- ✅ Mapping data response ke UI variables
- ✅ Error handling dengan default stats
- ✅ Status banner dengan 3 state
- ✅ Processing card dengan data akurat

## AzureBlobService - Fungsi yang Tersedia

Berikut adalah fungsi-fungsi yang tersedia di `AzureBlobService.js`:

### Public Methods:
1. **`getAllStats()`** - ✅ **Digunakan untuk Monitoring**
   - Mengembalikan semua statistics dalam satu call
   - Response: `{ input, queued, processed, detected, undetected, total, timestamp }`

2. **`getInputFilesCount()`**
   - Count files di folder `input/`
   
3. **`getQueuedFilesCount()`**
   - Count files di folder `queued/`
   
4. **`getProcessedFilesCount()`**
   - Count files di folder `processed/{today_date}/`
   
5. **`getDetectedFilesCount()`**
   - Count files di folder `output/detected/{today_date}/`
   
6. **`getUndetectedFilesCount()`**
   - Count files di folder `output/undetected/{today_date}/`

7. **`isProcessingComplete()`**
   - Check apakah queue kosong
   - Returns: `boolean`

8. **`listBlobs(path)`**
   - List semua blobs di path tertentu
   - Returns: `Array<{ name, size, lastModified, url }>`

## Azure Blob Storage Structure

```
Container: imagedetection/
├── input/                          # Upload folder (inputCount)
│   └── [image files]
│
├── queued/                         # Processing queue (queuedCount)
│   └── [image files]
│
├── processed/{YYYYMMDD}/           # Processed today (processingCount)
│   └── [image files]
│
└── output/
    ├── detected/{YYYYMMDD}/        # Files with detection (detectedCount)
    │   └── [image files]
    │
    └── undetected/{YYYYMMDD}/      # Files without detection (undetectedCount)
        └── [image files]
```

## Cara Testing

### 1. Start Application
```bash
cd D:\MPDS\mobile_project\frontend.appdrone-expo
npm start
```

### 2. Navigate to Monitoring
- Login ke aplikasi
- Klik menu "Monitoring" dari navigation bar

### 3. Verifikasi Functionality
- ✅ Screen loads tanpa error
- ✅ Stats ditampilkan dengan benar (atau 0 jika tidak ada data)
- ✅ Status banner menunjukkan state yang benar
- ✅ Auto-refresh setiap 30 detik
- ✅ Manual refresh button berfungsi
- ✅ Pause/Resume button berfungsi
- ✅ "Last Update" timestamp update

### 4. Test Error Scenarios
- Disconnect internet → verifikasi default stats (0) muncul
- Reconnect internet → verifikasi data reload

## Monitoring Screen Features

### Real-time Monitoring
- ⏱️ **Auto-refresh**: Setiap 30 detik
- ⏸️ **Pause/Resume**: Toggle auto-refresh
- 🔄 **Manual Refresh**: Force reload data
- 🕐 **Last Update**: Timestamp relatif (e.g., "5s ago", "2m ago")

### Processing Pipeline (3 Stages)

#### Stage 1: Input Folder
- Icon: 1️⃣
- Metric: Files Queued
- Value: Count dari `input/` folder

#### Stage 2: Processing
- Icon: 2️⃣
- Metric: Files Processed Today
- Value: Count dari `processed/{today}/` folder
- Progress bar: Percentage processed

#### Stage 3: Complete
- Icon: 3️⃣
- Metric: Outputs Generated
- Value: Count dari `detected` + `undetected` folders
- Action: View Report button

### Status Indicators
- ✅ **Green**: All processing complete
- ⚙️ **Yellow**: Processing in progress
- 💤 **Gray**: System idle

## Troubleshooting

### Error: "Failed to list blobs"
**Penyebab**: Azure Blob Storage credentials invalid atau expired
**Solusi**: 
1. Check `AzureBlobService.js` credentials
2. Verify storage account key masih valid
3. Check internet connection

### Data tidak update
**Penyebab**: Auto-refresh di-pause atau interval belum trigger
**Solusi**:
1. Check pause button (harus ▶️ play)
2. Click manual refresh button
3. Check console untuk error messages

### Count selalu 0
**Penyebab**: Folder di Azure Blob Storage kosong atau tidak ada files
**Solusi**:
1. Upload files ke `input/` folder di Azure Blob Storage
2. Verify folder structure benar
3. Check Azure Portal untuk confirm files ada

## Performance Optimization

### Current Settings
- Auto-refresh interval: 30 seconds
- SAS token expiry: 60 minutes
- Parallel API calls: 5 (untuk getAllStats)

### Recommendations
- ✅ Use pagination jika blob count > 1000
- ✅ Cache SAS token untuk reduce overhead
- ✅ Implement WebSocket untuk real-time updates (future enhancement)

## Future Enhancements

1. **WebSocket Integration**
   - Real-time updates tanpa polling
   - Push notifications untuk completion

2. **Historical Data**
   - Chart untuk tracking processing over time
   - Daily/weekly/monthly statistics

3. **Export Reports**
   - Download processing summary sebagai PDF/Excel
   - Email notifications

4. **Alert System**
   - Notify jika queue terlalu panjang
   - Alert jika processing stuck

5. **Detailed Logs**
   - Processing logs per file
   - Error logs dan retry mechanism

---

**Last Updated**: November 3, 2025  
**Version**: 1.0.0  
**Status**: ✅ Fixed & Tested


