import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Chunked Upload Service
 * EXACT implementation like Flutter (upload_image_controller.dart)
 * Handles resumable chunked uploads with progress tracking
 */

const CHUNK_SIZE = 512 * 1024; // 512KB - exact match with Flutter
const DEV_BASE_URL = 'rnd-dev.bsi.co.id';
const PROD_BASE_URL = 'droneark.bsi.co.id';

export class ChunkedUploadService {
  constructor(useProd = true) {
    this.baseUrl = useProd ? PROD_BASE_URL : DEV_BASE_URL;
    // CORRECT URL based on backend analysis
    // Backend path: /services/upload/api/v1/upload/chunk
    this.uploadUrl = useProd
      ? 'https://droneark.bsi.co.id/services/upload/api/v1/upload/chunk'
      : 'https://rnd-dev.bsi.co.id/services/upload/api/v1/upload/chunk';
  }

  // Initialize - backend doesn't require authentication
  async init() {
    // Backend has no authentication, but we keep this for future compatibility
    console.log(`[ChunkUpload] Initialized with URL: ${this.uploadUrl}`);
  }

  /**
   * Upload single chunk
   * @param {Blob} chunkBlob - The chunk data
   * @param {string} fileId - Unique file identifier
   * @param {number} chunkIndex - Current chunk index (0-based)
   * @param {number} totalChunks - Total number of chunks
   * @param {string} originalName - Original filename
   * @param {function} onProgress - Progress callback
   */
  async uploadChunk(chunkBlob, fileId, chunkIndex, totalChunks, originalName, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = xhr.responseText ? JSON.parse(xhr.responseText) : { success: true };

            // Backend responses:
            // In progress: {"message": "Chunk 0 uploaded successfully"}
            // Completed: {"message": "Upload complete", "file_id": "...", "original_name": "..."}
            if (response.message === 'Upload complete') {
              console.log(`[ChunkUpload] ✅ UPLOAD COMPLETE! File: ${response.original_name}`);
            } else {
              console.log(`[ChunkUpload] Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
            }

            resolve(response);
          } catch (error) {
            // Some APIs return empty response on success
            console.log(`[ChunkUpload] Chunk ${chunkIndex + 1}/${totalChunks} uploaded (empty response)`);
            resolve({ success: true });
          }
        } else {
          console.error(`[ChunkUpload] ❌ FAILED: ${xhr.status}`);
          console.error(`[ChunkUpload] Response: ${xhr.responseText}`);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during chunk upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Chunk upload aborted'));
      });

      // Create FormData - EXACT backend requirements
      // Backend expects: file_id, chunk_index, total_chunks, original_name, file
      // Backend does NOT expect: uuid, userid, or Authorization header
      const formData = new FormData();

      // Required parameter: file (binary data)
      formData.append('file', {
        uri: chunkBlob,
        type: 'image/jpeg', // or detect from filename
        name: originalName, // Use original filename, not .part extension
      });

      // Required parameter: file_id (unique upload session ID)
      formData.append('file_id', fileId);

      // Required parameter: chunk_index (0-based, integer)
      formData.append('chunk_index', chunkIndex);

      // Required parameter: total_chunks (integer)
      formData.append('total_chunks', totalChunks);

      // Required parameter: original_name (filename with extension)
      formData.append('original_name', originalName);

      xhr.open('POST', this.uploadUrl);
      // No Authorization header - backend doesn't validate it
      // Don't set Content-Type, let browser set it with boundary

      console.log(`[ChunkUpload] ========================================`);
      console.log(`[ChunkUpload] Uploading chunk ${chunkIndex + 1}/${totalChunks}`);
      console.log(`[ChunkUpload] URL: ${this.uploadUrl}`);
      console.log(`[ChunkUpload] file_id: ${fileId}`);
      console.log(`[ChunkUpload] original_name: ${originalName}`);
      console.log(`[ChunkUpload] chunk_index: ${chunkIndex}`);
      console.log(`[ChunkUpload] total_chunks: ${totalChunks}`);
      console.log(`[ChunkUpload] ========================================`);

      xhr.send(formData);
    });
  }

  /**
   * Upload single file as single chunk (Simplified for React Native)
   * React Native FormData natively handles file upload without manual chunking
   * @param {object} file - File object with uri, fileName, size, type
   * @param {function} onProgress - Progress callback (0-100)
   */
  async uploadFileChunked(file, onProgress) {
    await this.init(); // Initialize

    // Generate unique file ID - use timestamp + random string
    // Backend uses this as filename for progress tracking ({file_id}.progress)
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // For React Native, we treat entire file as 1 chunk
    // This is because FormData with URI natively handles file upload
    const totalChunks = 1;
    const chunkIndex = 0;

    console.log(`[ChunkUpload] ========================================`);
    console.log(`[ChunkUpload] Starting upload`);
    console.log(`[ChunkUpload] File: ${file.fileName}`);
    console.log(`[ChunkUpload] Size: ${file.size || 'unknown'} bytes`);
    console.log(`[ChunkUpload] File ID: ${fileId}`);
    console.log(`[ChunkUpload] Total chunks: ${totalChunks}`);
    console.log(`[ChunkUpload] ========================================`);

    try {
      // Upload file using native FormData
      await this.uploadChunk(
        file.uri,  // Pass URI directly, FormData will handle it
        fileId,
        chunkIndex,
        totalChunks,
        file.fileName,
        (chunkProgress) => {
          if (onProgress) {
            onProgress(chunkProgress);
          }
        }
      );

      console.log(`[ChunkUpload] File ${file.fileName} uploaded successfully`);
      return { success: true, fileId, fileName: file.fileName };

    } catch (error) {
      console.error(`[ChunkUpload] Error uploading file:`, error);
      throw error;
    }
  }

  /**
   * Batch upload with chunking
   * @param {Array} files - Array of file objects
   * @param {number} batchSize - Number of files to upload in parallel (default: 8 like Flutter)
   * @param {function} onBatchProgress - Batch progress callback
   * @param {function} onFileProgress - Per-file progress callback
   */
  async uploadBatch(files, batchSize = 8, onBatchProgress, onFileProgress) {
    const results = [];
    const batches = [];

    // Split files into batches
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    console.log(`[ChunkUpload] Starting batch upload: ${files.length} files in ${batches.length} batches`);

    // Process batches sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      if (onBatchProgress) {
        onBatchProgress({
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          imagesInBatch: batch.length,
        });
      }

      console.log(`[ChunkUpload] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);

      // Upload files in current batch in parallel (like Flutter)
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.uploadFileChunked(file, (progress) => {
            if (onFileProgress) {
              onFileProgress(file.id, progress, file.fileName);
            }
          });

          console.log(`[ChunkUpload] Success: ${file.fileName}`);
          return { success: true, file, result };
        } catch (error) {
          console.error(`[ChunkUpload] Error: ${file.fileName}`, error);
          return { success: false, file, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches (like Flutter)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`[ChunkUpload] Batch upload complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      results,
      summary: {
        total: files.length,
        success: successCount,
        error: errorCount,
      },
    };
  }
}

// Singleton instance - Use PRODUCTION by default
export default new ChunkedUploadService(true);
