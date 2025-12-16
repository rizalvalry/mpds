# Quick Guide: Switch from DocumentPicker to ImagePicker

## Why This Change is Required

**Current Issue**: `expo-document-picker` does NOT provide EXIF/GPS metadata from images.

**Result**: Area validation always fails with "Cannot extract GPS from image"

**Solution**: Use `expo-image-picker` which supports EXIF data extraction.

## Step-by-Step Implementation

### Step 1: Install Dependency

```bash
cd frontend.appdrone-expo
npx expo install expo-image-picker
```

### Step 2: Update UploadMockup.js

**File**: `src/screens/UploadMockup.js`

#### Change 1: Update Import Statement

**Replace this** (line 4):
```javascript
import * as DocumentPicker from 'expo-document-picker';
```

**With this**:
```javascript
import * as ImagePicker from 'expo-image-picker';
```

#### Change 2: Replace pickFiles Function

**Replace this** (lines 71-97):
```javascript
const pickFiles = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/jpg', 'image/png'],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.type === 'success' || !result.canceled) {
      const files = result.assets || [result];
      const newImages = files.map((file, index) => ({
        id: Date.now() + index,
        uri: file.uri,
        fileName: file.name,
        type: file.mimeType || 'image/jpeg',
        size: file.size || 0,
        fileSize: file.size || 0,
      }));

      setSelectedImages(prev => [...prev, ...newImages]);
      console.log(`[Upload] ${newImages.length} files selected`);
    }
  } catch (error) {
    console.error('Error picking files:', error);
    Alert.alert('Error', 'Gagal memilih file. Silakan coba lagi.');
  }
};
```

**With this**:
```javascript
const pickFiles = async () => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to select images.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Pick images with EXIF data
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // NOTE: iOS only - see Android workaround below
      exif: true, // ← CRITICAL: This enables GPS extraction
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset, index) => ({
        id: Date.now() + index,
        uri: asset.uri,
        fileName: asset.fileName || asset.uri.split('/').pop(),
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
        fileSize: asset.fileSize || 0,
        // NEW: Include EXIF and location data
        exif: asset.exif,       // ← Contains GPSLatitude, GPSLongitude, etc.
        location: asset.location, // ← Some platforms provide direct location
      }));

      setSelectedImages(prev => [...prev, ...newImages]);
      console.log(`[Upload] ${newImages.length} files selected with EXIF data`);
    }
  } catch (error) {
    console.error('Error picking files:', error);
    Alert.alert('Error', 'Gagal memilih file. Silakan coba lagi.');
  }
};
```

### Step 3: Test the Implementation

1. Run the app
2. Navigate to Upload screen
3. Select an area from dropdown
4. Pick images (must have GPS metadata)
5. Observe validation banner:
   - ✅ Should show "Area Validated" if GPS matches
   - ❌ Should show "Area Mismatch" if GPS doesn't match
6. Upload button should be enabled only when validation passes

## Android Limitation & Workaround

### The Problem

`allowsMultipleSelection: true` **only works on iOS**.

On Android, users can only pick one image at a time.

### Workaround Option 1: Loop Picker (Simple)

Allow users to pick multiple times:

```javascript
const [pickingMode, setPickingMode] = useState(false);

const pickFiles = async () => {
  // ... permission check

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true, // Works on iOS only
    exif: true,
    quality: 1,
  });

  if (!result.canceled && result.assets) {
    const newImages = result.assets.map((asset, index) => ({ ... }));
    setSelectedImages(prev => [...prev, ...newImages]);

    // On Android, ask if user wants to pick more
    if (Platform.OS === 'android' && result.assets.length === 1) {
      Alert.alert(
        'Add More Images?',
        'Android only allows picking one image at a time. Do you want to add more?',
        [
          { text: 'Done', style: 'cancel' },
          { text: 'Add More', onPress: () => pickFiles() }
        ]
      );
    }
  }
};
```

### Workaround Option 2: expo-image-multiple-picker

Use community library for multiple selection on Android:

```bash
npx expo install expo-image-multiple-picker
```

However, this requires more setup and may not provide EXIF data.

### Workaround Option 3: expo-media-library

Use MediaLibrary to get asset info after selection:

```javascript
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

const pickFiles = async () => {
  // Pick single image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    exif: true,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];

    // If no EXIF, try to get from MediaLibrary
    if (!asset.exif || !asset.exif.GPSLatitude) {
      try {
        const mediaAsset = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (mediaAsset.location) {
          asset.location = mediaAsset.location;
        }
      } catch (err) {
        console.warn('[Upload] Could not get asset info from MediaLibrary');
      }
    }

    // Add to selection
    setSelectedImages(prev => [...prev, {
      id: Date.now(),
      uri: asset.uri,
      fileName: asset.fileName,
      exif: asset.exif,
      location: asset.location,
    }]);
  }
};
```

## Recommended Approach

**For MVP / Quick Implementation**:
- Use ImagePicker with `allowsMultipleSelection: true`
- Accept iOS limitation (one-by-one on Android)
- Add "Add More" button to pick additional images

**For Production**:
- Implement custom multi-picker for Android
- OR use hybrid: ImagePicker for iOS, custom picker for Android
- Ensure all solutions provide EXIF data

## Testing EXIF Extraction

### Verify GPS Data is Available

Add debug logging to `extractGPSFromAsset`:

```javascript
// In src/utils/exifExtractor.js

export const extractGPSFromAsset = async (asset) => {
  console.log('[ExifExtractor] Asset received:', {
    hasExif: !!asset.exif,
    hasLocation: !!asset.location,
    exifKeys: asset.exif ? Object.keys(asset.exif) : [],
  });

  try {
    // Check if asset has location data (some platforms)
    if (asset.location) {
      const { latitude, longitude } = asset.location;
      if (latitude && longitude) {
        console.log('[ExifExtractor] GPS found in asset.location:', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    // Check if asset has EXIF data
    if (asset.exif) {
      const { GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef } = asset.exif;

      console.log('[ExifExtractor] EXIF GPS data:', {
        GPSLatitude,
        GPSLongitude,
        GPSLatitudeRef,
        GPSLongitudeRef
      });

      if (GPSLatitude && GPSLongitude) {
        // Convert DMS to decimal degrees
        const lat = convertDMSToDD(GPSLatitude, GPSLatitudeRef);
        const lon = convertDMSToDD(GPSLongitude, GPSLongitudeRef);

        console.log('[ExifExtractor] GPS extracted from EXIF:', { latitude: lat, longitude: lon });
        return { latitude: lat, longitude: lon };
      }
    }

    console.warn('[ExifExtractor] No GPS data found in asset');
    return null;

  } catch (error) {
    console.error('[ExifExtractor] Error extracting GPS from asset:', error);
    return null;
  }
};
```

### Test with Real Images

1. **Use drone images**: Test with actual images taken by drone with GPS
2. **Check EXIF data**: Use EXIF viewer to confirm images have GPS coordinates
3. **Compare results**: Verify extracted coordinates match EXIF data

### Expected EXIF Structure

ImagePicker should provide:
```javascript
asset.exif = {
  GPSLatitude: [6, 22, 58.944],      // [degrees, minutes, seconds]
  GPSLatitudeRef: "S",                // North or South
  GPSLongitude: [107, 12, 53.6832],  // [degrees, minutes, seconds]
  GPSLongitudeRef: "E",               // East or West
  // ... other EXIF data
}

// Or directly:
asset.location = {
  latitude: -6.38304,
  longitude: 107.214912
}
```

## Common Issues & Solutions

### Issue 1: "Permission Denied"

**Cause**: User denied photo library access

**Solution**:
```javascript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Permission Required',
    'Please enable photo library access in Settings > Privacy > Photos',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  );
  return;
}
```

### Issue 2: "asset.exif is undefined"

**Cause**: Forgot to set `exif: true` in launchImageLibraryAsync

**Solution**: Verify config:
```javascript
const result = await ImagePicker.launchImageLibraryAsync({
  exif: true, // ← MUST be true
  // ...
});
```

### Issue 3: "GPSLatitude is undefined"

**Cause**: Image doesn't have GPS metadata

**Solution**: Use images taken with location services enabled

### Issue 4: Android only allows one image

**Cause**: `allowsMultipleSelection` not supported on Android

**Solution**: Implement workaround (see above)

## Verification Checklist

After implementing the changes:

- [ ] Import changed from DocumentPicker to ImagePicker
- [ ] pickFiles() function updated with permission request
- [ ] exif: true set in launchImageLibraryAsync config
- [ ] asset.exif and asset.location preserved in newImages mapping
- [ ] Debug logging added to verify GPS extraction
- [ ] Tested on iOS device with real drone images
- [ ] Tested on Android device (aware of single-selection limitation)
- [ ] Area validation passes when GPS matches selected area
- [ ] Upload button enables after successful validation
- [ ] Alert shows correct detected block on mismatch

## Expected Behavior After Switch

### Before (DocumentPicker)
```
User picks images
    ↓
extractGPSFromAsset(asset) → null (no EXIF data)
    ↓
Validation: "Cannot extract GPS from image"
    ↓
Upload button: DISABLED (gray)
```

### After (ImagePicker)
```
User picks images with GPS
    ↓
extractGPSFromAsset(asset) → { latitude: -6.38304, longitude: 107.214912 }
    ↓
API call: /cases/area/validate?lat=-6.38304&long=107.214912
    ↓
API response: { block: "C", ... }
    ↓
Validation: "C" == selectedBlock?
    ↓
├─ YES → Upload button: ENABLED (green) ✅
└─ NO  → Upload button: DISABLED, show alert ❌
```

## Summary

1. **Install**: `npx expo install expo-image-picker`
2. **Replace import**: DocumentPicker → ImagePicker
3. **Update pickFiles()**: Add permission + set `exif: true`
4. **Test**: Pick images and verify GPS extraction works
5. **Deploy**: Area validation now fully functional

**Estimated time**: 15-30 minutes

**Impact**: Area validation feature becomes fully operational

---

**Need Help?** Check:
- `AREA_VALIDATION_IMPLEMENTATION.md` - Full implementation details
- `AREA_VALIDATION_SUMMARY.md` - Overall architecture
- expo-image-picker docs: https://docs.expo.dev/versions/latest/sdk/imagepicker/
