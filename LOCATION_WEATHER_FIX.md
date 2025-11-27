# Location & Weather Error Fix

## Problem

Error saat load DynamicHeader:
```
ERROR [DynamicHeader] Gagal memuat cuaca:
[Error: Current location is unavailable. Make sure that location services are enabled]
```

**Impact**:
- Header tidak load dengan sempurna
- User experience terganggu
- Dashboard bisa crash jika error tidak di-handle

---

## Root Cause

1. **Location Permission**: App mencoba request location tanpa fallback
2. **GPS Unavailable**: Device location services mungkin disabled
3. **No Timeout**: `getCurrentPositionAsync()` bisa hang forever
4. **No Graceful Degradation**: Error location = error weather = crash

---

## Solution Implemented

### 1. **Default Fallback Location**

Jika location tidak tersedia, gunakan Jakarta sebagai default:
```javascript
const defaultLocation = {
  latitude: -6.2088,
  longitude: 106.8456,
  name: 'Jakarta',
};
```

### 2. **Nested Try-Catch Pattern**

```javascript
try {
  // Main try block
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      try {
        // Get current location with timeout
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 5000, // 5 second timeout
        });
        // Success - use actual location
      } catch (locationError) {
        console.warn('Failed to get location, using default');
        // Use default location
      }
    } else {
      console.log('Permission denied, using default location');
      // Use default location
    }
  } catch (permissionError) {
    console.warn('Permission request failed, using default');
    // Use default location
  }

  // Get weather (always executes with either real or default location)
  try {
    const weatherResponse = await apiService.getWeather(lat, lng);
    // Set weather info
  } catch (weatherError) {
    console.warn('Weather fetch failed');
    // Set basic info without weather
  }
} catch (error) {
  console.error('Unexpected error');
  // Fallback to Jakarta
}
```

### 3. **Timeout for Location**

```javascript
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced,
  timeout: 5000, // Won't hang forever
});
```

### 4. **Graceful Degradation**

**Scenario 1: Everything Works**
```
Header displays: Jakarta • 28°C
```

**Scenario 2: Permission Denied**
```
Header displays: Jakarta • Cuaca tidak tersedia
Console: ℹ️ Location permission denied, using default location
```

**Scenario 3: Location Timeout**
```
Header displays: Jakarta • 28°C (from default coords)
Console: ⚠️ Failed to get location, using default
```

**Scenario 4: Weather API Down**
```
Header displays: Jakarta • Cuaca tidak tersedia
Console: ⚠️ Weather fetch failed
```

**Scenario 5: Complete Failure**
```
Header displays: Jakarta • Cuaca tidak tersedia
Console: ❌ Error in loadLocationAndWeather
```

---

## Console Output (Normal Flow)

### Success Case:
```
[DynamicHeader] ✅ Location obtained: Tangerang
[DynamicHeader] ✅ Weather loaded successfully
```

### Permission Denied:
```
[DynamicHeader] ℹ️ Location permission denied, using default location
[DynamicHeader] ✅ Weather loaded successfully
```

### Location Unavailable:
```
[DynamicHeader] ⚠️ Failed to get location, using default: Location request timed out
[DynamicHeader] ✅ Weather loaded successfully
```

### Weather API Failed:
```
[DynamicHeader] ✅ Location obtained: Jakarta
[DynamicHeader] ⚠️ Weather fetch failed: Network request failed
```

---

## User Experience Improvements

### Before Fix:
```
❌ App crashes on location error
❌ Header tidak muncul sama sekali
❌ User stuck di loading screen
```

### After Fix:
```
✅ App selalu load dengan Jakarta sebagai fallback
✅ Header muncul dengan atau tanpa permission
✅ Weather optional (tidak memblokir UI)
✅ Better user experience
```

---

## Permission Flow

### First Launch (No Permission):
1. App requests permission via popup
2. User can **Allow** or **Deny**
3. If **Allow**: Use real location
4. If **Deny**: Use Jakarta (default)

### Subsequent Launches:
1. If permission previously granted: Use real location
2. If permission previously denied: Use Jakarta (no popup)
3. User can change in Settings → App Permissions → Location

### Android Settings Path:
```
Settings → Apps → [App Name] → Permissions → Location
```

---

## Testing Checklist

### Test 1: First Launch - Allow Permission
- [ ] Launch app
- [ ] Permission popup appears
- [ ] Press "Allow"
- [ ] Header shows real location (e.g., "Tangerang")
- [ ] Weather displays correctly

### Test 2: First Launch - Deny Permission
- [ ] Launch app
- [ ] Permission popup appears
- [ ] Press "Deny"
- [ ] Header shows "Jakarta" (default)
- [ ] Weather displays for Jakarta
- [ ] No error messages

### Test 3: Location Services Disabled
- [ ] Disable GPS in device settings
- [ ] Launch app
- [ ] Header shows "Jakarta" (default)
- [ ] Console: "Failed to get location, using default"
- [ ] App works normally

### Test 4: Weather API Down
- [ ] Disconnect from internet
- [ ] Launch app
- [ ] Header shows location (real or default)
- [ ] Weather shows "Cuaca tidak tersedia"
- [ ] App works normally

### Test 5: Complete Offline Mode
- [ ] Disable GPS
- [ ] Disable internet
- [ ] Launch app
- [ ] Header shows "Jakarta • Cuaca tidak tersedia"
- [ ] App works normally

---

## Configuration

### Default Location (Jakarta):
```javascript
const defaultLocation = {
  latitude: -6.2088,   // Jakarta latitude
  longitude: 106.8456, // Jakarta longitude
  name: 'Jakarta',
};
```

**To Change Default Location:**
1. Open `src/components/shared/DynamicHeader.js`
2. Line 49-53: Update coordinates
3. Example for Bandung:
```javascript
const defaultLocation = {
  latitude: -6.9175,
  longitude: 107.6191,
  name: 'Bandung',
};
```

### Location Timeout:
```javascript
timeout: 5000, // 5 seconds (line 67)
```

**To Adjust:**
- Increase for slower GPS: `timeout: 10000` (10 seconds)
- Decrease for faster response: `timeout: 3000` (3 seconds)

---

## Error Handling Strategy

### Level 1: Permission Error
```javascript
try {
  const { status } = await Location.requestForegroundPermissionsAsync();
} catch (permissionError) {
  // Fallback to default location
}
```

### Level 2: Location Error
```javascript
try {
  const location = await Location.getCurrentPositionAsync({ timeout: 5000 });
} catch (locationError) {
  // Fallback to default location
}
```

### Level 3: Weather Error
```javascript
try {
  const weather = await apiService.getWeather(lat, lng);
} catch (weatherError) {
  // Show "Cuaca tidak tersedia"
}
```

### Level 4: Catastrophic Error
```javascript
try {
  // All above code
} catch (error) {
  // Fallback to basic Jakarta display
}
```

---

## Impact on Dashboard

### Before Fix:
```
Dashboard loads → DynamicHeader requests location → Error → Crash
```

### After Fix:
```
Dashboard loads → DynamicHeader requests location → Falls back to Jakarta → Success
```

**Result**: Dashboard **always loads** regardless of location availability.

---

## Summary

✅ **Fallback to Jakarta**: App always has a valid location
✅ **Timeout Protection**: Location request won't hang forever (5s max)
✅ **Graceful Degradation**: Weather is optional, not blocking
✅ **Better Logging**: Clear console messages for debugging
✅ **User-Friendly**: No crashes, smooth experience
✅ **Permission Handling**: Respects user's choice to deny location

**Status**: ✅ FIXED - DynamicHeader now handles all location error scenarios gracefully

**Testing Required**: Verify that Dashboard loads correctly with location permission denied
