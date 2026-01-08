# Area Validation - Frontend Implementation Guide

## Perubahan Strategi

Berdasarkan diskusi, area validation akan dilakukan di **frontend (mobile app)** dengan flow:

```
User pilih images
    ↓
Extract GPS dari image pertama
    ↓
Call API: GET /drone/engine/area/batch?lat=X&long=Y
    ↓
Validate: detected_area == selectedArea?
    ↓
├─ YES → Start upload
└─ NO  → Show alert & block upload
```

## Kendala dengan DocumentPicker

**Problem**: `expo-document-picker` **TIDAK** memberikan akses ke EXIF/GPS data.

**Solution Options**:

### Option 1: Ganti ke expo-image-picker (RECOMMENDED)

```javascript
import * as ImagePicker from 'expo-image-picker';

// Request permission
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

// Pick images with EXIF
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,  // iOS only
  exif: true,  // ← IMPORTANT: Include EXIF data
  quality: 1,
});

// Access GPS data
if (result.assets) {
  result.assets.forEach(asset => {
    if (asset.exif) {
      const { GPSLatitude, GPSLongitude } = asset.exif;
      console.log('GPS:', GPSLatitude, GPSLongitude);
    }
  });
}
```

**Pros:**
- ✅ Native EXIF support
- ✅ GPS data included
- ✅ Officially supported by Expo

**Cons:**
- ❌ `allowsMultipleSelection` only works on iOS
- ❌ Android: need to pick images one by one

### Option 2: Use expo-media-library (ALTERNATIVE)

```javascript
import * as MediaLibrary from 'expo-media-library';

// Get asset info with location
const asset = await MediaLibrary.getAssetInfoAsync(assetId, {
  shouldDownloadFromNetwork: false,
});

// Access location data
if (asset.location) {
  const { latitude, longitude } = asset.location;
  console.log('GPS:', latitude, longitude);
}
```

**Pros:**
- ✅ Can access location data
- ✅ Works on both iOS and Android

**Cons:**
- ❌ Need to get asset ID first
- ❌ More complex workflow

### Option 3: Backend-side validation (FALLBACK)

Jika frontend tidak bisa extract EXIF, kembali ke backend.upload validation seperti implementasi sebelumnya.

## Implementasi dengan expo-image-picker

### 1. Install Dependencies

```bash
npx expo install expo-image-picker
```

### 2. Update UploadMockup.js

```javascript
import * as ImagePicker from 'expo-image-picker';
import { extractGPSFromAsset } from '../utils/exifExtractor';
import { validateFirstImage } from '../utils/areaValidator';

const pickImages = async () => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload images.'
      );
      return;
    }

    // Pick images with EXIF
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,  // iOS only
      exif: true,  // Include EXIF data
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      // Extract GPS from first image
      const firstAsset = result.assets[0];
      const gps = await extractGPSFromAsset(firstAsset);

      if (gps) {
        console.log('[Upload] First image GPS:', gps);

        // Validate area IMMEDIATELY
        if (selectedAreaBlock) {
          const validation = await validateFirstImage(
            { ...firstAsset, ...gps },
            selectedAreaBlock
          );

          if (!validation.valid) {
            // Show error alert
            Alert.alert(
              'Area Mismatch',
              validation.message,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                validation.detectedArea && {
                  text: `Use Block ${validation.detectedArea}`,
                  onPress: () => {
                    setSelectedAreaBlock(validation.detectedArea);
                    setSelectedImages(result.assets);
                  },
                },
              ].filter(Boolean)
            );
            return;
          }

          console.log('[Upload] ✅ Area validated:', validation.detectedArea);
        }
      } else {
        // No GPS data
        if (selectedAreaBlock) {
          Alert.alert(
            'No GPS Data',
            'Selected images do not contain GPS coordinates. Please select images taken with GPS enabled.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Add images to selection
      setSelectedImages(result.assets);
    }
  } catch (error) {
    console.error('[Upload] Error picking images:', error);
    Alert.alert('Error', 'Failed to pick images. Please try again.');
  }
};
```

### 3. Update handleUpload

```javascript
const handleUpload = async () => {
  // Validate area selection
  if (!selectedAreaBlock) {
    Alert.alert(
      'Area Block Required',
      'Please select the area block for this upload session.\n\nSOP: Upload must be done per 1 block area at a time.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Validate files selected
  if (selectedImages.length === 0) {
    Alert.alert('No Files Selected', 'Please select images to upload.', [
      { text: 'OK' },
    ]);
    return;
  }

  // RE-VALIDATE area before upload (in case user changed selection)
  const firstImage = selectedImages[0];
  const gps = await extractGPSFromAsset(firstImage);

  if (gps && selectedAreaBlock) {
    const validation = await validateFirstImage(
      { ...firstImage, ...gps },
      selectedAreaBlock
    );

    if (!validation.valid) {
      Alert.alert(
        'Area Validation Failed',
        validation.message + '\n\nPlease correct your area selection.',
        [{ text: 'OK' }]
      );
      return;
    }
  }

  // Start upload
  try {
    const sessionWithArea = {
      ...session,
      drone: {
        ...session?.drone,
        area_codes: [selectedAreaBlock],
      },
    };

    const result = await startUpload(selectedImages, sessionWithArea);

    if (result.success) {
      Alert.alert(
        'Upload Started',
        `Uploading ${selectedImages.length} images to Block ${selectedAreaBlock}`,
        [{ text: 'OK' }]
      );

      // Reset selection
      setSelectedImages([]);
      setSelectedAreaBlock(null);
    }
  } catch (error) {
    console.error('[Upload] Upload failed:', error);
    Alert.alert('Upload Failed', error.message, [{ text: 'OK' }]);
  }
};
```

## API Integration

### Area Batch Endpoint

```javascript
// src/services/ApiService.js

export const getAreaFromGPS = async (latitude, longitude) => {
  try {
    const url = `https://rnd-dev.bsi.co.id/drone/engine/area/batch?lat=${latitude}&long=${longitude}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return result.data[0]; // { block: "C", description: "Area C", ... }
    }

    return null;
  } catch (error) {
    console.error('[API] Error fetching area:', error);
    return null;
  }
};
```

## User Experience Flow

### Scenario 1: Valid Upload (Happy Path)

```
1. User selects Block C
2. User picks 15 images
3. Frontend extracts GPS from first image
4. API call → detected_area = "C"
5. Validation: "C" == "C" ✅
6. Upload starts
7. Success message shown
```

### Scenario 2: Area Mismatch

```
1. User selects Block C
2. User picks images from Block D by mistake
3. Frontend extracts GPS from first image
4. API call → detected_area = "D"
5. Validation: "D" != "C" ❌
6. Alert shown:
   "Image GPS is in Block D, but you selected Block C"
   [Cancel] [Use Block D]
7. If user taps "Use Block D":
   - Selection changed to Block D
   - Images added
   - Upload can proceed
```

### Scenario 3: No GPS Data

```
1. User selects Block C
2. User picks images without GPS
3. Frontend extracts GPS → null
4. Alert shown:
   "No GPS data found. Please select images with GPS."
5. Upload blocked
```

## Dependencies Required

```json
{
  "dependencies": {
    "expo-image-picker": "~14.3.2",
    "expo-media-library": "~15.4.1"
  }
}
```

## Testing

### Test Case 1: Valid Images

```
Input: 15 images from Block C, user selects Block C
Expected: Upload proceeds without issues
```

### Test Case 2: Wrong Area Selection

```
Input: Images from Block D, user selects Block C
Expected: Alert shown, upload blocked, option to use Block D
```

### Test Case 3: No GPS Data

```
Input: Images without EXIF GPS
Expected: Alert shown, upload blocked
```

### Test Case 4: Mixed Areas

```
Input: 10 images from Block C, 5 from Block D
Expected: Alert shown with breakdown, upload blocked
```

## Limitations

### expo-image-picker Limitations

1. **Multiple selection iOS only**: `allowsMultipleSelection` only works on iOS
2. **Android workaround**: Need to pick images one by one or use custom picker
3. **EXIF data availability**: Not all images have GPS data

### Workarounds

#### For Android Multiple Selection

Use `expo-document-picker` for selection, then use `expo-media-library` to get EXIF:

```javascript
// 1. Pick with DocumentPicker (multiple selection)
const result = await DocumentPicker.getDocumentAsync({ multiple: true });

// 2. Get asset info for each file
for (const file of result.assets) {
  // Find asset by URI
  const album = await MediaLibrary.getAlbumAsync('Camera');
  const { assets } = await MediaLibrary.getAssetsAsync({
    album: album,
    mediaType: 'photo',
  });

  const asset = assets.find(a => a.uri === file.uri);
  if (asset) {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
    // Access location data
  }
}
```

## Fallback Strategy

Jika frontend EXIF extraction terlalu kompleks:

1. **User manual confirmation**: Show detected area to user, ask confirmation
2. **Backend validation**: Keep backend.upload validation as backup
3. **Skip validation**: Trust user selection (not recommended)

## Recommendation

**USE OPTION 1**: Switch to `expo-image-picker` dengan validation di frontend.

**Benefits**:
- ✅ Immediate feedback (no network delay)
- ✅ Simpler architecture (no backend database config)
- ✅ Reuse existing API endpoint
- ✅ Better UX with instant validation

**Tradeoffs**:
- ⚠️ Need to handle Android multiple selection separately
- ⚠️ Depends on GPS data availability in images

---

**Next Steps**:
1. Install `expo-image-picker`
2. Replace `DocumentPicker` with `ImagePicker` in UploadMockup.js
3. Implement area validation flow
4. Test with real drone images
