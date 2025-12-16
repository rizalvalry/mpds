/**
 * EXIF GPS Extractor for React Native
 * Extracts GPS coordinates from image metadata
 */

import * as ImageManipulator from 'expo-image-manipulator';
import RNExif from 'react-native-exif';

/**
 * Extract GPS coordinates from image EXIF data using react-native-exif
 *
 * @param {string} imageUri - Image URI from document picker or file system
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export const extractGPSFromImage = async (imageUri) => {
  try {
    console.log('[ExifExtractor] Extracting GPS from:', imageUri);

    // Convert file:// URI to platform-specific path
    let filePath = imageUri;
    if (imageUri.startsWith('file://')) {
      filePath = imageUri.replace('file://', '');
    }

    // Read EXIF data using react-native-exif
    const exifData = await RNExif.getExif(filePath);

    console.log('[ExifExtractor] EXIF data keys:', Object.keys(exifData));

    // Check for GPS coordinates
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      let latitude = exifData.GPSLatitude;
      let longitude = exifData.GPSLongitude;

      // Handle reference (N/S for latitude, E/W for longitude)
      if (exifData.GPSLatitudeRef === 'S') {
        latitude = -Math.abs(latitude);
      }
      if (exifData.GPSLongitudeRef === 'W') {
        longitude = -Math.abs(longitude);
      }

      console.log('[ExifExtractor] GPS extracted from file:', { latitude, longitude });
      return { latitude, longitude };
    }

    // Fallback: Check for original GPS data
    if (exifData.latitude && exifData.longitude) {
      console.log('[ExifExtractor] GPS found in exifData:', {
        latitude: exifData.latitude,
        longitude: exifData.longitude
      });
      return {
        latitude: exifData.latitude,
        longitude: exifData.longitude
      };
    }

    console.warn('[ExifExtractor] No GPS data found in EXIF');
    return null;

  } catch (error) {
    console.error('[ExifExtractor] Error extracting GPS:', error);
    return null;
  }
};

/**
 * Extract GPS from image using expo-media-library (recommended)
 *
 * @param {object} asset - Asset object from expo-image-picker
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export const extractGPSFromAsset = async (asset) => {
  try {
    // Check if asset has location data
    if (asset.location) {
      const { latitude, longitude } = asset.location;

      if (latitude && longitude) {
        console.log('[ExifExtractor] GPS found in asset:', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    // Check if asset has EXIF data
    if (asset.exif) {
      const { GPSLatitude, GPSLongitude, GPSLatitudeRef, GPSLongitudeRef } = asset.exif;

      if (GPSLatitude && GPSLongitude) {
        // Convert DMS to decimal degrees
        const lat = convertDMSToDD(GPSLatitude, GPSLatitudeRef);
        const lon = convertDMSToDD(GPSLongitude, GPSLongitudeRef);

        console.log('[ExifExtractor] GPS extracted from EXIF:', { latitude: lat, longitude: lon });
        return { latitude: lat, longitude: lon };
      }
    }

    // Fallback: Try to extract from file URI directly (for DocumentPicker)
    if (asset.uri) {
      console.log('[ExifExtractor] No EXIF in asset object, trying to read from URI...');
      const gpsFromFile = await extractGPSFromImage(asset.uri);

      if (gpsFromFile) {
        console.log('[ExifExtractor] GPS extracted from file URI:', gpsFromFile);
        return gpsFromFile;
      }
    }

    console.warn('[ExifExtractor] No GPS data found in asset');
    return null;

  } catch (error) {
    console.error('[ExifExtractor] Error extracting GPS from asset:', error);
    return null;
  }
};

/**
 * Convert GPS coordinates from DMS (Degrees, Minutes, Seconds) to DD (Decimal Degrees)
 *
 * @param {Array} dms - [degrees, minutes, seconds]
 * @param {string} ref - Reference (N/S for latitude, E/W for longitude)
 * @returns {number}
 */
const convertDMSToDD = (dms, ref) => {
  if (!dms || dms.length < 3) return 0;

  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];

  let dd = degrees + (minutes / 60) + (seconds / 3600);

  // Apply reference (negative for S and W)
  if (ref === 'S' || ref === 'W') {
    dd = -dd;
  }

  return dd;
};

/**
 * Batch extract GPS from multiple images
 *
 * @param {Array} assets - Array of asset objects from expo-image-picker
 * @returns {Promise<Array>} Array of {uri, latitude, longitude, hasGPS}
 */
export const extractGPSBatch = async (assets) => {
  const results = [];

  for (const asset of assets) {
    const gps = await extractGPSFromAsset(asset);

    results.push({
      uri: asset.uri,
      filename: asset.filename || asset.uri.split('/').pop(),
      latitude: gps?.latitude || null,
      longitude: gps?.longitude || null,
      hasGPS: gps !== null,
    });
  }

  return results;
};
