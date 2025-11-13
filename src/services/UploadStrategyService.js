import AsyncStorage from '@react-native-async-storage/async-storage';
import chunkedUploadService from './ChunkedUploadService';
import directUploadService from './DirectUploadService';

/**
 * UploadStrategyService
 * Dynamically switches between chunking and direct upload methods
 * based on login response (upload_method field)
 */
class UploadStrategyService {
  constructor() {
    this.uploadMethod = null; // Will be 'chunking' or 'direct'
    this.maxImagesPerBatch = 8; // Default value
    this.isInitialized = false;
  }

  /**
   * Initialize upload strategy from AsyncStorage
   * Should be called after login
   */
  async init() {
    try {
      const uploadMethod = await AsyncStorage.getItem('upload_method');
      const maxBatch = await AsyncStorage.getItem('max_images_per_batch');

      this.uploadMethod = uploadMethod || 'chunking'; // Default to chunking
      this.maxImagesPerBatch = maxBatch ? parseInt(maxBatch, 10) : 8;

      console.log('[UploadStrategy] Initialized with:');
      console.log(`[UploadStrategy] - Method: ${this.uploadMethod}`);
      console.log(`[UploadStrategy] - Max batch size: ${this.maxImagesPerBatch}`);

      this.isInitialized = true;
    } catch (error) {
      console.error('[UploadStrategy] Initialization error:', error);
      // Fallback to defaults
      this.uploadMethod = 'chunking';
      this.maxImagesPerBatch = 8;
      this.isInitialized = true;
    }
  }

  /**
   * Get current upload method
   * @returns {string} 'chunking' or 'direct'
   */
  getUploadMethod() {
    if (!this.isInitialized) {
      console.warn('[UploadStrategy] Not initialized, returning default method');
      return 'chunking';
    }
    return this.uploadMethod;
  }

  /**
   * Get max images per batch
   * @returns {number} Maximum number of images per batch
   */
  getMaxImagesPerBatch() {
    if (!this.isInitialized) {
      console.warn('[UploadStrategy] Not initialized, returning default batch size');
      return 8;
    }
    return this.maxImagesPerBatch;
  }

  /**
   * Get display name for upload method (for UI)
   * @returns {string} Display name
   */
  getUploadMethodDisplayName() {
    if (!this.isInitialized) {
      return 'Batch Upload';
    }

    switch (this.uploadMethod) {
      case 'chunking':
        return 'Chunked Upload';
      case 'direct':
        return 'Direct Upload';
      default:
        return 'Batch Upload';
    }
  }

  /**
   * Upload batch using the configured method
   * @param {Array} files - Array of file objects
   * @param {function} onBatchProgress - Batch progress callback
   * @param {function} onFileProgress - Per-file progress callback
   */
  async uploadBatch(files, onBatchProgress, onFileProgress) {
    if (!this.isInitialized) {
      await this.init();
    }

    console.log('[UploadStrategy] ========================================');
    console.log('[UploadStrategy] Starting batch upload');
    console.log(`[UploadStrategy] Method: ${this.uploadMethod}`);
    console.log(`[UploadStrategy] Batch size: ${this.maxImagesPerBatch}`);
    console.log(`[UploadStrategy] Total files: ${files.length}`);
    console.log('[UploadStrategy] ========================================');

    if (this.uploadMethod === 'direct') {
      // Use DirectUploadService - uploads directly to blob storage (input folder)
      console.log('[UploadStrategy] Using DIRECT upload method (to blob storage)');
      return await directUploadService.uploadBatch(
        files,
        this.maxImagesPerBatch,
        onBatchProgress,
        onFileProgress
      );
    } else {
      // Use ChunkedUploadService - uploads via backend chunking endpoint
      console.log('[UploadStrategy] Using CHUNKING upload method (via backend)');
      return await chunkedUploadService.uploadBatch(
        files,
        this.maxImagesPerBatch,
        onBatchProgress,
        onFileProgress
      );
    }
  }

  /**
   * Reset strategy (useful for testing or logout)
   */
  reset() {
    this.uploadMethod = null;
    this.maxImagesPerBatch = 8;
    this.isInitialized = false;
    console.log('[UploadStrategy] Strategy reset');
  }
}

// Export singleton instance
export default new UploadStrategyService();
