/**
 * DirectUploadService
 * Direct upload to Azure Blob Storage (like web project)
 * Used when upload_method = "direct" from login response
 */

const PROD_BASE_URL = 'https://droneark.bsi.co.id';

export class DirectUploadService {
  constructor(useProd = true) {
    this.baseUrl = PROD_BASE_URL;
    this.useProd = useProd;

    // Direct upload endpoint - uploads directly to Azure Blob Storage (folder input)
    this.uploadUrl = `${PROD_BASE_URL}/drone/upload/api/v1/upload/file`;
  }

  /**
   * Upload single file directly to blob storage
   * @param {object} file - File object with uri, fileName, size, type
   * @param {function} onProgress - Progress callback (0-100)
   * @param {string} areaCode - Area code for subfolder routing (e.g., A, K, Y)
   */
  async uploadFileDirect(file, onProgress, areaCode = null) {
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

      // SUBFOLDER APPROACH: Add area_code as query parameter for routing to input/{area_code}/
      let uploadUrl = this.uploadUrl;
      if (areaCode) {
        uploadUrl = `${this.uploadUrl}?area_code=${encodeURIComponent(areaCode.toUpperCase())}`;
      }

      console.log(`[DirectUpload] ========================================`);
      console.log(`[DirectUpload] Uploading file directly to blob storage`);
      console.log(`[DirectUpload] URL: ${uploadUrl}`);
      console.log(`[DirectUpload] File: ${file.fileName}`);
      console.log(`[DirectUpload] Size: ${file.size || 'unknown'} bytes`);
      console.log(`[DirectUpload] Area code: ${areaCode || 'not provided (default folder)'}`);
      console.log(`[DirectUpload] ========================================`);

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }

  /**
   * Batch upload with direct method
   * @param {Array} files - Array of file objects
   * @param {number} batchSize - Number of files to upload in parallel
   * @param {function} onBatchProgress - Batch progress callback
   * @param {function} onFileProgress - Per-file progress callback
   * @param {string} areaCode - Area code for subfolder routing (e.g., A, K, Y)
   */
  async uploadBatch(files, batchSize = 8, onBatchProgress, onFileProgress, areaCode = null) {
    const results = [];
    const batches = [];

    // Split files into batches
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    console.log(`[DirectUpload] Starting batch upload: ${files.length} files in ${batches.length} batches`);
    console.log(`[DirectUpload] Method: DIRECT (to blob storage input folder)`);

    // Log subfolder routing
    if (areaCode) {
      console.log(`[DirectUpload] 📂 Subfolder routing ENABLED: Files will be uploaded to input/${areaCode.toUpperCase()}/`);
    } else {
      console.log(`[DirectUpload] 📂 Subfolder routing DISABLED: Files will be uploaded to default input/ folder`);
    }

    // Test upload first file to detect errors early
    if (files.length > 0) {
      console.log(`[DirectUpload] Testing connection with first file: ${files[0].fileName}`);
      try {
        const testResult = await this.uploadFileDirect(files[0], (progress) => {
          if (onFileProgress) {
            onFileProgress(files[0].id, progress, files[0].fileName);
          }
        }, areaCode);
        console.log(`[DirectUpload] ✅ Test upload successful: ${files[0].fileName}`);
        results.push({ success: true, file: files[0], result: testResult });
      } catch (error) {
        console.error(`[DirectUpload] ❌ Test upload failed: ${files[0].fileName}`, error);
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

      console.log(`[DirectUpload] Processing batch ${batchIndex + 1}/${batches.length} (${filesToUpload.length} files)`);

      // Upload files in current batch in parallel
      const batchPromises = filesToUpload.map(async (file) => {
        try {
          const result = await this.uploadFileDirect(file, (progress) => {
            if (onFileProgress) {
              onFileProgress(file.id, progress, file.fileName);
            }
          }, areaCode);

          console.log(`[DirectUpload] Success: ${file.fileName}`);
          return { success: true, file, result };
        } catch (error) {
          console.error(`[DirectUpload] Error: ${file.fileName}`, error);
          return { success: false, file, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`[DirectUpload] Batch upload complete: ${successCount} success, ${errorCount} errors`);

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
export default new DirectUploadService(true);
