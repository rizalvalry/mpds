/**
 * Area Validator - Validates image GPS against expected area block
 * Uses backend.webservice.case API endpoint: /area/validate
 */

import apiService from '../services/ApiService';

// Use backend.webservice.case API (same base as other endpoints)
const AREA_API_BASE = apiService.API_BASE_URL;

/**
 * Query area information from GPS coordinates
 *
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {Promise<{block: string, area_id: number, description: string, line_number: number, slot_number: number, distance: number} | null>}
 */
export const getAreaFromGPS = async (latitude, longitude) => {
  try {
    console.log('[AreaValidator] Querying area API:', { latitude, longitude });

    // Use apiService to call backend.webservice.case endpoint
    const result = await apiService.validateArea(latitude, longitude);

    console.log('[AreaValidator] API response:', result);

    if (result.success && result.data && result.data.length > 0) {
      const areaData = result.data[0];

      console.log('[AreaValidator] Area detected:', {
        block: areaData.block,
        description: areaData.description,
        distance: areaData.distance,
      });

      return {
        block: areaData.block,
        area_id: areaData.areaId,
        description: areaData.description,
        line_number: areaData.lineNumber,
        slot_number: areaData.slotNumber,
        distance: areaData.distance,
      };
    }

    console.warn('[AreaValidator] No area found for coordinates:', { latitude, longitude });
    return null;

  } catch (error) {
    console.error('[AreaValidator] Error querying area API:', error);
    return null;
  }
};

/**
 * Validate if image GPS matches expected area block
 *
 * @param {number} latitude - GPS latitude from image EXIF
 * @param {number} longitude - GPS longitude from image EXIF
 * @param {string} expectedArea - Expected area block code (e.g., "C")
 * @returns {Promise<{valid: boolean, detectedArea: string | null, message: string, areaInfo: object | null}>}
 */
export const validateImageArea = async (latitude, longitude, expectedArea) => {
  try {
    console.log('[AreaValidator] Validating image area:', {
      latitude,
      longitude,
      expectedArea,
    });

    // Query area from GPS
    const areaInfo = await getAreaFromGPS(latitude, longitude);

    if (!areaInfo) {
      return {
        valid: false,
        detectedArea: null,
        message: `Could not determine area from GPS coordinates (${latitude}, ${longitude}). The image may be outside mapped areas.`,
        areaInfo: null,
        error: 'area_not_found',
      };
    }

    const detectedArea = areaInfo.block;

    // Validate against expected area
    if (detectedArea !== expectedArea) {
      return {
        valid: false,
        detectedArea: detectedArea,
        message: `Image GPS location is in Block ${detectedArea}, but you selected Block ${expectedArea}. Please check your selection or image location.`,
        areaInfo: areaInfo,
        error: 'area_mismatch',
      };
    }

    // Valid!
    return {
      valid: true,
      detectedArea: detectedArea,
      message: `✓ Image location validated: Block ${detectedArea}`,
      areaInfo: areaInfo,
    };

  } catch (error) {
    console.error('[AreaValidator] Validation error:', error);
    return {
      valid: false,
      detectedArea: null,
      message: `Validation error: ${error.message}`,
      areaInfo: null,
      error: 'validation_error',
    };
  }
};

/**
 * Validate first image using backend GPS extraction (recommended)
 * Backend extracts GPS from EXIF, eliminating frontend library issues
 *
 * @param {object} firstImage - First image asset with URI
 * @param {string} expectedArea - Expected area block code
 * @returns {Promise<{valid: boolean, detectedArea: string | null, message: string}>}
 */
export const validateFirstImage = async (firstImage, expectedArea) => {
  try {
    console.log('[AreaValidator] Validating image using backend extraction:', {
      uri: firstImage.uri,
      expectedArea,
    });

    // Use backend to extract GPS and validate
    const result = await apiService.validateAreaFromImage(firstImage.uri, expectedArea);

    console.log('[AreaValidator] Backend validation response:', result);

    if (!result.success) {
      return {
        valid: false,
        detectedArea: null,
        message: result.message || 'Failed to extract GPS from image',
        error: 'backend_validation_failed',
      };
    }

    // Extract area block from response
    const detectedArea = result.data && result.data.length > 0 ? result.data[0].block : null;

    if (!detectedArea) {
      return {
        valid: false,
        detectedArea: null,
        message: 'No area detected from image GPS coordinates',
        error: 'no_area_detected',
      };
    }

    // Check if area matches expected
    const isValid = detectedArea === expectedArea;

    return {
      valid: isValid,
      detectedArea: detectedArea,
      message: isValid
        ? `✓ Image location validated: Block ${detectedArea}`
        : `Image GPS location is in Block ${detectedArea}, but you selected Block ${expectedArea}`,
      areaInfo: result.data[0],
    };

  } catch (error) {
    console.error('[AreaValidator] Backend validation error:', error);
    return {
      valid: false,
      detectedArea: null,
      message: `Validation error: ${error.message}`,
      error: 'validation_error',
    };
  }
};

/**
 * Analyze batch of images and group by detected area
 *
 * @param {Array} images - Array of image objects with GPS data
 * @returns {Promise<{areaDistribution: object, summary: string, allMatch: boolean, primaryArea: string}>}
 */
export const analyzeImageBatch = async (images) => {
  const areaDistribution = {};
  let totalWithGPS = 0;
  let totalWithoutGPS = 0;

  for (const image of images) {
    if (!image.latitude || !image.longitude) {
      totalWithoutGPS++;
      continue;
    }

    totalWithGPS++;

    // Query area
    const areaInfo = await getAreaFromGPS(image.latitude, image.longitude);

    if (areaInfo) {
      const areaCode = areaInfo.block;

      if (!areaDistribution[areaCode]) {
        areaDistribution[areaCode] = {
          count: 0,
          files: [],
          areaInfo: areaInfo,
        };
      }

      areaDistribution[areaCode].count++;
      areaDistribution[areaCode].files.push(image.filename || image.uri);
    } else {
      // Unknown area
      if (!areaDistribution['UNKNOWN']) {
        areaDistribution['UNKNOWN'] = {
          count: 0,
          files: [],
          areaInfo: null,
        };
      }

      areaDistribution['UNKNOWN'].count++;
      areaDistribution['UNKNOWN'].files.push(image.filename || image.uri);
    }
  }

  // Generate summary
  const areaCodes = Object.keys(areaDistribution).filter((code) => code !== 'UNKNOWN');
  const primaryArea = areaCodes.length === 1 ? areaCodes[0] : null;
  const allMatch = areaCodes.length === 1 && totalWithoutGPS === 0;

  const summaryParts = [];
  for (const [areaCode, data] of Object.entries(areaDistribution)) {
    summaryParts.push(`${data.count} in Block ${areaCode}`);
  }

  if (totalWithoutGPS > 0) {
    summaryParts.push(`${totalWithoutGPS} without GPS`);
  }

  const summary = summaryParts.join(', ');

  console.log('[AreaValidator] Batch analysis:', {
    areaDistribution,
    summary,
    allMatch,
    primaryArea,
  });

  return {
    areaDistribution,
    summary,
    allMatch,
    primaryArea,
    totalWithGPS,
    totalWithoutGPS,
  };
};
