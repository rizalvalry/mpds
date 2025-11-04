# Upload - Dual Panel dengan Batch System

## ✅ Status: IMPLEMENTED & WORKING

Upload sekarang menggunakan **Dual Panel Layout** dengan **Batch Upload System** (5 images per batch) yang terintegrasi dengan ChunkedUploadService.

---

## 🎯 Layout & Design

### Dual Panel System

```
┌───────────────────────────────────────────────┐
│  LEFT PANEL: File List (Text Only)          │
│  - No thumbnails (performa ringan)          │
│  - File name + size + batch number          │
│  - Upload progress per file                 │
│  - Remove button per file                   │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│  RIGHT PANEL: Browse File                   │
│  - Big circular button (📄)                 │
│  - Multiple file selection                  │
│  - Batch info display                       │
└───────────────────────────────────────────────┘
```

---

## 📦 Batch Upload System

### Konfigurasi
- **Batch Size**: 5 images per batch
- **Processing**: Batches diproses **sequentially** (satu per satu)
- **Files in Batch**: Upload **parallel** (tidak saling tunggu)

### Flow Diagram
```
Batch 1: [Image1, Image2, Image3, Image4, Image5]
         ↓ (parallel upload - tidak saling tunggu)
         ✅ All complete
         
Batch 2: [Image6, Image7, Image8, Image9, Image10]
         ↓ (parallel upload)
         ✅ All complete
         
Batch 3: [Image11, Image12, ...]
```

### Keuntungan
✅ **Fast**: Files dalam batch upload parallel  
✅ **Stable**: Batches diproses satu per satu (tidak overload)  
✅ **Efficient**: Optimal use of network bandwidth  
✅ **Trackable**: Progress per file dan per batch  

---

## 🎨 LEFT PANEL: File List

### Features

#### File Item Display
```
┌─────────────────────────────────────────────┐
│ 📄  filename.jpg                  Batch 1  │
│     1.2 MB                        25%      │
│     ████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ×        │
└─────────────────────────────────────────────┘
```

#### Status Indicators

| Icon | Status | Background | Border |
|------|--------|-----------|--------|
| 📄 | Pending | Gray (`#F9FAFB`) | Gray |
| ⏳ | Uploading | Yellow (`#FEF3C7`) | Orange |
| ✅ | Complete | Green (`#D1FAE5`) | Green |

#### Information Displayed
- **File name** (truncated if long)
- **File size** (formatted: KB, MB, GB)
- **Batch number** (calculated: Math.floor(index / 5) + 1)
- **Upload progress** (0-100%)
- **Status text** (25%, 100%, Complete)

#### Progress Bar
- Appears saat uploading
- Orange color (`#F59E0B`)
- Width: 0-100% sesuai progress
- Height: 3px
- Smooth animation

#### Remove Button
- Visible hanya saat **tidak uploading**
- Icon: × (times)
- Background: Light red (`#FEE2E2`)
- Confirmation sebelum remove

#### Empty State
```
      ⬆️
  Preview Mode
  
Select images to initialize
upload sequence
```

---

## 🎨 RIGHT PANEL: Browse File

### Main Button
- **Icon**: 📄 (document)
- **Size**: 120x120 circular
- **Background**: Blue (`#0EA5E9`)
- **Plus badge**: + di bottom-right corner
- **Text**: "Browse File"
- **Subtitle**: "Pilih dari pengelola file (multiple files support)"

### Batch Info Box
```
┌─────────────────────────────────┐
│ 📦 Batch Upload System         │
│                                 │
│ • 5 images per batch           │
│ • Batches processed sequentially│
│ • Files in batch upload parallel│
│ • Fast & efficient processing  │
└─────────────────────────────────┘
```

### Interaction
- **Click**: Opens file manager
- **Multiple selection**: Enabled
- **Filter**: JPG, JPEG, PNG only
- **Copy to cache**: Enabled for performance

---

## ⬆️ Upload Button

### Position
- Below both panels
- Full width
- Only visible jika ada files selected

### States

#### Normal (Ready to Upload)
- **Background**: Green (`#10B981`)
- **Icon**: ⬆️
- **Text**: "Upload {n} Gambar ({m} Batch)"
- **Shadow**: Green glow effect

#### Uploading
- **Background**: Gray (`#9CA3AF`)
- **Icon**: Loading spinner
- **Text**: "Uploading {n} gambar..."
- **Disabled**: true

---

## 📊 Batch Progress Indicator

### Banner (Saat Uploading)
Muncul di atas dual panel:

```
┌──────────────────────────────────────────┐
│ ⏳ Processing Batch 2 of 4             │
│    Uploading 5 images per batch        │
│    (parallel processing)                │
└──────────────────────────────────────────┘
```

**Style**:
- Background: Yellow (`#FEF3C7`)
- Border left: 4px orange (`#F59E0B`)
- Loading spinner di kiri
- Real-time update

---

## 🔧 Technical Implementation

### ChunkedUploadService Integration

```javascript
import chunkedUploadService from '../services/ChunkedUploadService';

const BATCH_SIZE = 5; // 1 batch = 5 images

const uploadImages = async () => {
  const result = await chunkedUploadService.uploadBatch(
    selectedImages,
    BATCH_SIZE,
    (batchInfo) => {
      // Batch progress callback
      setCurrentBatch(batchInfo.currentBatch);
    },
    (fileId, progress, fileName) => {
      // Per-file progress callback
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: progress
      }));
    }
  );
};
```

### State Management
```javascript
const [selectedImages, setSelectedImages] = useState([]);
const [uploading, setUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState({}); // { fileId: progress% }
const [currentBatch, setCurrentBatch] = useState(0);
const [totalBatches, setTotalBatches] = useState(0);
```

### Data Structure
```javascript
{
  id: number,           // Unique ID (timestamp)
  uri: string,          // Local file URI
  fileName: string,     // File name
  type: string,         // MIME type
  size: number,         // File size in bytes
  fileSize: number      // Duplicate for compatibility
}
```

---

## 🎯 User Flow

### 1. Pilih Files
```
User → Click "Browse File" di RIGHT PANEL
     → File manager opens
     → Select multiple images
     → Files appear di LEFT PANEL (file list)
```

### 2. Review Files
```
LEFT PANEL:
- See all file names
- Check file sizes
- See batch assignment
- Remove unwanted files (×)
- Or Clear All
```

### 3. Upload
```
User → Click "Upload X Gambar (Y Batch)"
     → Batch banner appears di atas
     → LEFT PANEL shows progress per file:
        📄 → ⏳ (dengan progress bar) → ✅
     → Upload in batches (5 per batch)
     → Success alert saat selesai
```

---

## 📱 Responsive Layout

### Desktop (width > 600px)
```
┌─────────────┬─────────────┐
│             │             │
│  LEFT       │   RIGHT     │
│  PANEL      │   PANEL     │
│             │             │
└─────────────┴─────────────┘
     [Upload Button]
```

### Mobile (width ≤ 600px)
```
┌─────────────┐
│             │
│  LEFT       │
│  PANEL      │
│             │
└─────────────┘

┌─────────────┐
│             │
│   RIGHT     │
│   PANEL     │
│             │
└─────────────┘

[Upload Button]
```

---

## ⚙️ Batch Upload Process (Detail)

### Sequential Batch Processing
```javascript
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  const batch = batches[batchIndex];
  
  // Update UI: "Processing Batch X of Y"
  setCurrentBatch(batchIndex + 1);
  
  // Upload all files in batch PARALLEL
  const batchPromises = batch.map(file => uploadFile(file));
  await Promise.all(batchPromises);
  
  // Small delay before next batch
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

### Parallel File Upload (dalam Batch)
```javascript
// All 5 files dalam batch ini upload bersamaan
Promise.all([
  uploadFile(image1), // Tidak tunggu yang lain
  uploadFile(image2), // Upload parallel
  uploadFile(image3), // Upload parallel
  uploadFile(image4), // Upload parallel
  uploadFile(image5), // Upload parallel
]);
```

---

## 📊 Progress Tracking

### Per-File Progress
```javascript
uploadProgress = {
  123456789: 45,  // File ID 1: 45%
  123456790: 78,  // File ID 2: 78%
  123456791: 100, // File ID 3: 100%
  ...
}
```

### Batch Progress
```javascript
currentBatch = 2;  // Currently processing batch 2
totalBatches = 4;  // Total 4 batches
```

### UI Update
- Progress bar per file (orange, 3px height)
- Percentage text (e.g., "45%")
- Status text ("Complete" saat 100%)
- Background color change (gray → yellow → green)
- Icon change (📄 → ⏳ → ✅)

---

## 🎨 Color System

| Element | Color | Code |
|---------|-------|------|
| **Pending** | Gray | `#F9FAFB` |
| **Uploading** | Yellow | `#FEF3C7` |
| **Complete** | Green | `#D1FAE5` |
| **Progress Bar** | Orange | `#F59E0B` |
| **Primary** | Blue | `#0EA5E9` |
| **Success** | Green | `#10B981` |
| **Error** | Red | `#DC2626` |

---

## ⚡ Performance Optimizations

### 1. No Thumbnails
- **Reason**: Loading thumbnails dari URI itu heavy
- **Solution**: Hanya tampilkan file names (text)
- **Result**: Fast rendering, smooth scroll

### 2. Batch System
- **Reason**: Upload 100 files sekaligus bisa overload
- **Solution**: Process 5 files at a time
- **Result**: Stable, predictable performance

### 3. Parallel Upload (dalam Batch)
- **Reason**: Sequential upload terlalu lambat
- **Solution**: Upload all 5 files dalam batch bersamaan
- **Result**: Fast upload speed

### 4. Progress Tracking
- **Reason**: User perlu feedback
- **Solution**: Real-time progress per file
- **Result**: Good UX, user tahu status

---

## 📝 Error Handling

### Upload Errors
```javascript
const result = await chunkedUploadService.uploadBatch(...);

if (result.summary.error > 0) {
  Alert.alert(
    'Upload Selesai dengan Error ⚠️',
    `${result.summary.success} berhasil\n${result.summary.error} gagal`
  );
}
```

### Network Errors
- Automatic retry (di ChunkedUploadService)
- Error message di console
- Alert untuk user

### File Errors
- Invalid file type: Filtered saat picker
- File too large: Warning (jika perlu)
- Corrupt file: Caught di upload

---

## ✅ Testing Checklist

### Basic Functionality
- [x] Browse File button dapat diklik
- [x] Multiple file selection works
- [x] Files appear di LEFT PANEL (text only)
- [x] File info accurate (name, size, batch)
- [x] Remove individual file works
- [x] Clear all files works

### Batch Upload
- [x] Upload button shows batch count
- [x] Batch banner appears saat uploading
- [x] Current batch number updates
- [x] Files dalam batch upload parallel
- [x] Batches processed sequentially
- [x] 500ms delay between batches

### Progress Tracking
- [x] Progress bar appears per file
- [x] Percentage text updates (0-100%)
- [x] Background color changes by status
- [x] Icon changes by status (📄→⏳→✅)
- [x] "Complete" text saat 100%

### UI/UX
- [x] Dual panel layout responsive
- [x] Empty state di LEFT PANEL
- [x] Batch info di RIGHT PANEL
- [x] Success alert setelah upload
- [x] Auto-clear setelah success

---

## 📖 Quick Reference

| Feature | Value | Description |
|---------|-------|-------------|
| **Batch Size** | 5 images | Fixed, defined di top |
| **Batch Processing** | Sequential | One batch at a time |
| **File Upload** | Parallel | All files in batch upload together |
| **Batch Delay** | 500ms | Delay between batches |
| **Max Files** | Unlimited | No limit (was 20) |
| **File Types** | JPG, JPEG, PNG | Filtered di picker |
| **Thumbnails** | Disabled | Text-only for performance |

---

## 🚀 Future Enhancements

### 1. Pause/Resume
```javascript
const pauseUpload = () => {
  // Stop current batch
  // Save progress
};

const resumeUpload = () => {
  // Continue from last batch
};
```

### 2. Retry Failed Files
```javascript
const retryFailed = () => {
  const failedFiles = results.filter(r => !r.success);
  uploadBatch(failedFiles, BATCH_SIZE, ...);
};
```

### 3. Drag & Drop (Web)
```javascript
const onDrop = (files) => {
  setSelectedImages(prev => [...prev, ...files]);
};
```

### 4. Queue System
```javascript
// Save queue to AsyncStorage
// Resume on app restart
```

---

**Last Updated**: November 3, 2025  
**Version**: 2.0.0 (Dual Panel + Batch System)  
**Status**: ✅ **PRODUCTION READY**

---

## 💡 Key Points

✅ **Dual Panel**: Left (file list) + Right (browse button)  
✅ **No Thumbnails**: Text-only untuk performa  
✅ **Batch Size 5**: Optimal untuk stability dan speed  
✅ **Sequential Batches**: Predictable processing  
✅ **Parallel Files**: Fast upload dalam batch  
✅ **Real-time Progress**: Per file dan per batch  
✅ **ChunkedUploadService**: Production-ready backend integration  

---

**Ready to use!** 🚀

