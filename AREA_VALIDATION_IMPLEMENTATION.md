# Area Validation Implementation - Frontend

## Overview

Area validation has been successfully implemented in the mobile app to validate GPS coordinates against selected area blocks before upload. The validation uses the backend API endpoint `/cases/area/validate` from `backend.webservice.case`.

## Architecture

```
User selects area block
    ↓
User picks images
    ↓
Extract GPS from first image (EXIF)
    ↓
Call API: GET /cases/area/validate?lat=X&long=Y
    ↓
Validate: detected_block == selectedAreaBlock?
    ↓
├─ YES → Enable upload button ✅
└─ NO  → Disable upload button, show error ❌
```

## Implementation Details

### Backend API Endpoint

**File**: `backend.webservice.case\ApiVisionCaseList.Presentation\Controllers\AreaController.cs`

**Endpoint**: `GET /cases/area/validate`

**Parameters**:
- `lat` (double, required) - Latitude coordinate
- `long` (double, required) - Longitude coordinate

**Response**:
```json
{
  "data": [
    {
      "lat": -6.38304,
      "long": 107.214912,
      "areaId": 123,
      "description": "Area C",
      "lineNumber": 5,
      "slotNumber": 10,
      "block": "C",
      "distance": 2.5
    }
  ],
  "success": true,
  "message": "Berhasil"
}
```

### Frontend Implementation

**File**: `src/screens/UploadMockup.js`

#### Key Features

1. **Automatic Validation**: Runs automatically when both area and images are selected
2. **Visual Feedback**: Shows validation status with color-coded indicators
3. **Smart Button State**: Upload button disabled until validation passes
4. **Alternative Selection**: Offers to switch to detected area if mismatch occurs

#### State Management

```javascript
const [areaValidation, setAreaValidation] = useState({
  isValid: false,      // Whether validation passed
  checked: false,      // Whether validation has been performed
  detectedBlock: null, // Block detected from GPS
  message: '',         // User-friendly validation message
});

const [isValidatingArea, setIsValidatingArea] = useState(false);
```

#### Validation Flow

```javascript
useEffect(() => {
  const validateAreaSelection = async () => {
    if (!selectedAreaBlock || selectedImages.length === 0) {
      // Reset validation state
      return;
    }

    setIsValidatingArea(true);

    // 1. Extract GPS from first image
    const gps = await extractGPSFromAsset(selectedImages[0]);

    if (!gps) {
      // Handle no GPS data
      setAreaValidation({
        isValid: false,
        checked: true,
        message: '⚠️ Cannot extract GPS from image'
      });
      return;
    }

    // 2. Validate using API
    const validation = await validateFirstImage(
      { ...selectedImages[0], ...gps },
      selectedAreaBlock
    );

    // 3. Update validation state
    setAreaValidation({
      isValid: validation.valid,
      checked: true,
      detectedBlock: validation.detectedArea,
      message: validation.message,
    });

    // 4. Show alert if mismatch
    if (!validation.valid) {
      Alert.alert('Area Mismatch', validation.message, [
        { text: 'Cancel' },
        { text: `Use Block ${validation.detectedArea}`, onPress: () => ... }
      ]);
    }
  };

  validateAreaSelection();
}, [selectedAreaBlock, selectedImages]);
```

#### Upload Button Logic

```javascript
<TouchableOpacity
  onPress={uploadImages}
  disabled={
    !selectedAreaBlock ||
    (areaValidation.checked && !areaValidation.isValid) ||
    isValidatingArea
  }
  style={{
    backgroundColor: (disabled condition) ? '#9CA3AF' : '#10B981',
    opacity: (disabled condition) ? 0.6 : 1,
    // ... other styles
  }}
>
  {isValidatingArea ? (
    <ActivityIndicator color="#FFFFFF" />
    <Text>Validating Area...</Text>
  ) : (
    <Text>Upload {selectedImages.length} Gambar</Text>
  )}
</TouchableOpacity>
```

### Helper Functions

**File**: `src/utils/areaValidator.js`

```javascript
export const validateFirstImage = async (image, selectedAreaBlock) => {
  const { latitude, longitude } = image;

  // Get area from GPS coordinates
  const detectedArea = await getAreaFromGPS(latitude, longitude);

  if (!detectedArea) {
    return {
      valid: false,
      detectedArea: null,
      message: '❌ No area found for GPS coordinates'
    };
  }

  // Compare detected area with selected area
  if (detectedArea.block !== selectedAreaBlock) {
    return {
      valid: false,
      detectedArea: detectedArea.block,
      message: `Image GPS is in Block ${detectedArea.block}, but you selected Block ${selectedAreaBlock}`
    };
  }

  return {
    valid: true,
    detectedArea: detectedArea.block,
    message: `✅ GPS coordinates match Block ${selectedAreaBlock}`
  };
};
```

**File**: `src/services/ApiService.js`

```javascript
async validateArea(latitude, longitude) {
  await this.init(); // Ensure tokens are loaded
  const url = this.buildUrl('/cases/area/validate', {
    lat: latitude,
    long: longitude
  });
  return this.fetchData({ method: 'GET', url });
}
```

## User Experience Flow

### Scenario 1: Valid Upload (Happy Path)

```
1. User selects Block C from dropdown
2. User picks 15 drone images
3. App extracts GPS from first image: lat=-6.38304, long=107.214912
4. App calls API: /cases/area/validate?lat=-6.38304&long=107.214912
5. API returns: { block: "C", ... }
6. Validation: "C" == "C" ✅
7. Upload button becomes ENABLED (green)
8. User clicks upload
9. Upload proceeds successfully
```

### Scenario 2: Area Mismatch

```
1. User selects Block C from dropdown
2. User picks images from Block D by mistake
3. App extracts GPS from first image
4. API returns: { block: "D", ... }
5. Validation: "D" != "C" ❌
6. Upload button remains DISABLED (gray)
7. Alert shown: "Image GPS is in Block D, but you selected Block C"
   - [Cancel] button
   - [Use Block D] button (auto-corrects selection)
8. If user taps "Use Block D":
   - Selection changes to Block D
   - Validation re-runs
   - Upload button becomes ENABLED
```

### Scenario 3: No GPS Data

```
1. User selects Block C
2. User picks images without GPS metadata
3. App attempts GPS extraction → fails
4. Upload button remains DISABLED
5. Warning shown: "⚠️ Cannot extract GPS from image. Please ensure images have location data."
```

## Visual Indicators

### Validation Status Banner

Shows above upload button when validation has been performed:

**Valid (Green)**:
```
✅ Area Validated
   Images match Block C
```

**Invalid (Red)**:
```
❌ Area Validation Failed
   Image GPS is in Block D, but you selected Block C
```

**Validating (Yellow)**:
```
⏳ Validating area...
   Please wait...
```

### Upload Button States

| Condition | Button Color | Button Text | Enabled |
|-----------|-------------|-------------|---------|
| No area selected | Gray | "Upload X Gambar" | ❌ |
| No images selected | Hidden | - | - |
| Validating | Gray | "Validating Area..." | ❌ |
| Validation failed | Gray | "Upload X Gambar" | ❌ |
| Validation passed | Green | "Upload X Gambar" | ✅ |

## Known Limitations

### expo-document-picker Does NOT Support EXIF

**Problem**: The current implementation uses `expo-document-picker` which **does not provide access to EXIF/GPS data**.

**Impact**: GPS extraction will fail, showing "Cannot extract GPS from image" warning.

**Solutions**:

#### Option 1: Switch to expo-image-picker (RECOMMENDED)

```javascript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true, // iOS only
  exif: true, // ← ENABLES EXIF DATA
  quality: 1,
});

// Access GPS data
if (result.assets[0].exif) {
  const { GPSLatitude, GPSLongitude } = result.assets[0].exif;
}
```

**Pros**:
- ✅ Native EXIF support
- ✅ GPS data included
- ✅ Works seamlessly with area validation

**Cons**:
- ⚠️ `allowsMultipleSelection` only works on iOS
- ⚠️ Android users must pick images one by one

#### Option 2: Use expo-media-library

```javascript
import * as MediaLibrary from 'expo-media-library';

const asset = await MediaLibrary.getAssetInfoAsync(assetId);
if (asset.location) {
  const { latitude, longitude } = asset.location;
}
```

#### Option 3: Backend-side validation (Fallback)

If frontend EXIF extraction proves too complex, validation can be moved to `backend.upload` service during upload process.

## Testing

### Manual Testing Steps

1. **Test Valid Upload**:
   - Select Block C from dropdown
   - Pick images from Block C
   - Verify validation passes
   - Verify upload button is enabled
   - Complete upload

2. **Test Area Mismatch**:
   - Select Block C from dropdown
   - Pick images from Block D
   - Verify validation fails
   - Verify upload button is disabled
   - Verify alert shows correct detected block
   - Test "Use Block D" option

3. **Test No GPS Data**:
   - Select any block
   - Pick images without GPS metadata
   - Verify warning message appears
   - Verify upload button is disabled

4. **Test No Area Selected**:
   - Pick images without selecting area
   - Verify upload button shows area selection alert

### Test Coordinates

Use these coordinates to test different blocks:

```javascript
// Block C
{ lat: -6.38304, long: 107.214912 }

// Block D (if available)
{ lat: -6.38350, long: 107.21500 }

// Out of range
{ lat: 0, long: 0 }
```

## API Integration

### Request Example

```bash
curl --location 'https://your-domain.com/cases/area/validate?lat=-6.38304&long=107.214912' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### Response Examples

**Success - Area Found**:
```json
{
  "data": [
    {
      "lat": -6.38304,
      "long": 107.214912,
      "areaId": 123,
      "description": "Area C Description",
      "lineNumber": 5,
      "slotNumber": 10,
      "block": "C",
      "distance": 2.5
    }
  ],
  "success": true,
  "message": "Berhasil"
}
```

**Success - No Area Found**:
```json
{
  "data": [],
  "success": true,
  "message": "No area found for the given coordinates"
}
```

**Error**:
```json
{
  "data": [],
  "success": false,
  "message": "Error: Invalid coordinates"
}
```

## Future Improvements

1. **Switch to expo-image-picker**: Enable proper EXIF extraction
2. **Batch validation**: Validate all images, not just first one
3. **Offline caching**: Cache area boundaries for offline validation
4. **Distance indicator**: Show distance from selected area center
5. **Map preview**: Show image location on map for visual confirmation

## Troubleshooting

### Upload button stays disabled

**Causes**:
- No area selected → Select area from dropdown
- Validation failed → Check alert message for details
- No GPS data in images → Use images with location metadata
- Still validating → Wait for validation to complete

### Validation always fails with "Cannot extract GPS"

**Cause**: `expo-document-picker` doesn't support EXIF

**Solution**: Switch to `expo-image-picker` with `exif: true` option

### API returns no area found

**Causes**:
- GPS coordinates out of range → Check image location
- Database not configured → Verify `loc.get_area_batch` function exists
- Wrong coordinates format → Verify decimal degrees format

## Summary

✅ **Implemented**:
- Backend API endpoint `/cases/area/validate`
- Frontend validation logic in UploadMockup.js
- Visual feedback and button state management
- Alternative area selection on mismatch
- Comprehensive error handling

⚠️ **Known Issue**:
- GPS extraction requires switching from DocumentPicker to ImagePicker

📋 **Next Steps**:
1. Switch to `expo-image-picker` for EXIF support
2. Test with real drone images
3. Monitor validation success rate
4. Adjust based on user feedback
