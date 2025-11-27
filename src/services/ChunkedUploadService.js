import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Chunked Upload Service
 * EXACT implementation like Flutter (upload_image_controller.dart)
 * Handles resumable chunked uploads with progress tracking
 */

const CHUNK_SIZE = 512 * 1024; // 512KB - exact match with Flutter
const PROD_BASE_URL = 'droneark.bsi.co.id';

/**
 * Generate UUID v4 (simple implementation)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class ChunkedUploadService {
  constructor(useProd = true) {
    this.baseUrl = PROD_BASE_URL;
    this.useProd = useProd;

    // Production chunked upload endpoint
    this.uploadUrl = 'https://droneark.bsi.co.id/services/upload/api/v1/upload/chunk';
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
   * @param {string} uuid - UUID for organizing uploads (optional, required for development)
   * @param {string} userid - User ID (optional, required for development)
   */
  async uploadChunk(chunkBlob, fileId, chunkIndex, totalChunks, originalName, onProgress, uuid = null, userid = null) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.min(Math.round((event.loaded / event.total) * 100), 100);
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
      // Backend Production: file_id, chunk_index, total_chunks, original_name, file
      // Backend Development: file_id, chunk_index, total_chunks, original_name, file, uuid, userid
      const formData = new FormData();

      // Required parameter: file (binary data)
      // React Native FormData format: { uri, type, name }
      formData.append('file', {
        uri: chunkBlob,
        type: 'image/jpeg', // Default to jpeg, can be detected from filename if needed
        name: originalName, // Use original filename with extension
      });

      // Required parameter: file_id (unique upload session ID) - must be string
      formData.append('file_id', String(fileId));

      // Required parameter: chunk_index (0-based, integer) - must be string for FormData
      formData.append('chunk_index', String(chunkIndex));

      // Required parameter: total_chunks (integer) - must be string for FormData
      formData.append('total_chunks', String(totalChunks));

      // Required parameter: original_name (filename with extension) - must be string
      formData.append('original_name', String(originalName));

      // Optional parameters for development environment (required in dev, optional in prod)
      if (uuid) {
        formData.append('uuid', String(uuid));
      }
      if (userid) {
        formData.append('userid', String(userid));
      }

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
      console.log(`[ChunkUpload] uuid: ${uuid || 'not provided'}`);
      console.log(`[ChunkUpload] userid: ${userid || 'not provided'}`);
      console.log(`[ChunkUpload] ========================================`);

      xhr.send(formData);
    });
  }

  /**
   * Direct upload for development (no chunking)
   * Uses /upload/file endpoint which directly uploads to Azure Blob Storage
   * @param {object} file - File object with uri, fileName, size, type
   * @param {function} onProgress - Progress callback (0-100)
   */
  async uploadFileDirect(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.min(Math.round((event.loaded / event.total) * 100), 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = xhr.responseText ? JSON.parse(xhr.responseText) : { success: true };
            console.log(`[DirectUpload] ✅ File ${file.fileName} uploaded successfully`);
            resolve(response);
          } catch (error) {
            console.log(`[DirectUpload] File ${file.fileName} uploaded (empty response)`);
            resolve({ success: true });
          }
        } else {
          console.error(`[DirectUpload] ❌ FAILED: ${xhr.status}`);
          console.error(`[DirectUpload] Response: ${xhr.responseText}`);
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Create FormData for direct upload - only file required
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName,
      });

      console.log(`[DirectUpload] ========================================`);
      console.log(`[DirectUpload] Uploading file directly`);
      console.log(`[DirectUpload] URL: ${this.uploadUrl}`);
      console.log(`[DirectUpload] File: ${file.fileName}`);
      console.log(`[DirectUpload] Size: ${file.size || 'unknown'} bytes`);
      console.log(`[DirectUpload] ========================================`);

      xhr.open('POST', this.uploadUrl);
      xhr.send(formData);
    });
  }

  /**
   * Upload single file as single chunk (Simplified for React Native)
   * React Native FormData natively handles file upload without manual chunking
   * @param {object} file - File object with uri, fileName, size, type
   * @param {function} onProgress - Progress callback (0-100)
   * @param {string} uuid - UUID for organizing uploads (optional, required for production chunking)
   * @param {string} userid - User ID (optional, required for production chunking)
   */
  async uploadFileChunked(file, onProgress, uuid = null, userid = null) {
    await this.init(); // Initialize

    // Use direct upload for development, chunking for production
    if (!this.useProd) {
      console.log(`[ChunkUpload] Using direct upload for development environment`);
      try {
        const result = await this.uploadFileDirect(file, onProgress);
        return { success: true, fileName: file.fileName, result };
      } catch (error) {
        console.error(`[DirectUpload] Error uploading file:`, error);
        throw error;
      }
    }

    // Production: Use chunking method
    // Generate unique file ID - use timestamp + random string
    // Backend uses this as filename for progress tracking ({file_id}.progress)
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // For React Native, we treat entire file as 1 chunk
    // This is because FormData with URI natively handles file upload
    const totalChunks = 1;
    const chunkIndex = 0;

    console.log(`[ChunkUpload] ========================================`);
    console.log(`[ChunkUpload] Starting chunked upload (PRODUCTION)`);
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
        },
        uuid,    // Pass uuid to uploadChunk
        userid   // Pass userid to uploadChunk
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
   * @param {string} uuid - UUID for organizing uploads (only for production chunking)
   * @param {string} userid - User ID (only for production chunking)
   */
  async uploadBatch(files, batchSize = 8, onBatchProgress, onFileProgress, uuid = null, userid = null) {
    const results = [];
    const batches = [];

    // Only validate uuid/userid for production environment (chunking)
    if (this.useProd) {
      // Auto-generate UUID if not provided
      if (!uuid) {
        uuid = generateUUID();
        console.log(`[ChunkUpload] Generated UUID: ${uuid}`);
      }

      // Retrieve userid from session if not provided
      if (!userid) {
        try {
          const loginResponse = await AsyncStorage.getItem('login_response');
          if (loginResponse) {
            const userData = JSON.parse(loginResponse);
            userid = userData.user_id || userData.id;
            console.log(`[ChunkUpload] Retrieved user_id from session: ${userid}`);
          }
        } catch (error) {
          console.error('[ChunkUpload] Failed to retrieve user_id from session:', error);
        }
      }

      // Validate that we have uuid and userid for production
      if (!uuid || !userid) {
        throw new Error('UUID and userid are required for production upload. Please ensure you are logged in.');
      }

      console.log(`[ChunkUpload] Production mode - UUID: ${uuid}, UserID: ${userid}`);
    } else {
      console.log(`[ChunkUpload] Development mode - Using direct upload (no uuid/userid required)`);
    }

    // Split files into batches
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    console.log(`[ChunkUpload] Starting batch upload: ${files.length} files in ${batches.length} batches`);

    // FIX: Test upload first file to detect errors early
    if (files.length > 0) {
      console.log(`[ChunkUpload] Testing connection with first file: ${files[0].fileName}`);
      try {
        const testResult = await this.uploadFileChunked(files[0], (progress) => {
          if (onFileProgress) {
            onFileProgress(files[0].id, progress, files[0].fileName);
          }
        }, uuid, userid);  // Pass uuid and userid
        console.log(`[ChunkUpload] ✅ Test upload successful: ${files[0].fileName}`);
        results.push({ success: true, file: files[0], result: testResult });
      } catch (error) {
        console.error(`[ChunkUpload] ❌ Test upload failed: ${files[0].fileName}`, error);
        // Throw error immediately to stop upload process
        throw new Error(`Upload gagal: ${error.message || 'Tidak dapat terhubung ke server. Pastikan koneksi internet Anda stabil dan endpoint server tersedia.'}`);
      }
    }

    // Process remaining files in batches
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Skip first file if it's already uploaded (test upload)
      const filesToUpload = batchIndex === 0 ? batch.slice(1) : batch;
      
      if (filesToUpload.length === 0) {
        continue; // Skip empty batch
      }

      if (onBatchProgress) {
        onBatchProgress({
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          imagesInBatch: filesToUpload.length,
        });
      }

      console.log(`[ChunkUpload] Processing batch ${batchIndex + 1}/${batches.length} (${filesToUpload.length} files)`);

      // Upload files in current batch in parallel (like Flutter)
      const batchPromises = filesToUpload.map(async (file) => {
        try {
          const result = await this.uploadFileChunked(file, (progress) => {
            if (onFileProgress) {
              onFileProgress(file.id, progress, file.fileName);
            }
          }, uuid, userid);  // Pass uuid and userid

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

// Singleton instance - production environment
export default new ChunkedUploadService(true);
