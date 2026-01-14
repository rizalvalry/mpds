/**
 * DirectUploadService with Resume Capability
 *
 * Features:
 * - Direct upload to Azure Blob Storage (no chunking overhead)
 * - Resume capability: tracks uploaded files in AsyncStorage
 * - Auto-retry on network failure (3 retries per file)
 * - Batch upload with parallel processing
 * - Area code support for subfolder routing (input/{area_code}/)
 *
 * Storage Keys:
 * - direct_upload_session: Current upload session state
 * - direct_upload_completed: List of successfully uploaded filenames
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROD_BASE_URL = 'https://droneark.bsi.co.id';
const DEV_BASE_URL = 'https://rnd-dev.bsi.co.id';

// Storage keys for resume capability
const STORAGE_KEY_SESSION = 'direct_upload_session';
const STORAGE_KEY_COMPLETED = 'direct_upload_completed';

export class DirectUploadService {
    constructor(useProd = true) {
        this.baseUrl = useProd ? PROD_BASE_URL : DEV_BASE_URL;
        this.useProd = useProd;

        // Direct upload endpoint - uploads directly to Azure Blob Storage
        this.uploadUrl = useProd
            ? `${PROD_BASE_URL}/services/upload/api/v1/upload/file`
            : `${DEV_BASE_URL}/drone/upload/api/v1/upload/file`;

        this.isAborted = false;
    }

    // ==================== RESUME CAPABILITY ====================

    /**
     * Save current upload session state
     */
    async saveSessionState(state) {
        try {
            await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(state));
            console.log('[DirectUpload] Session state saved');
        } catch (e) {
            console.error('[DirectUpload] Failed to save session state:', e);
        }
    }

    /**
     * Load saved upload session state
     */
    async loadSessionState() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('[DirectUpload] Failed to load session state:', e);
            return null;
        }
    }

    /**
     * Mark a file as successfully uploaded
     */
    async markFileCompleted(fileName) {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED);
            const completedFiles = data ? JSON.parse(data) : [];

            if (!completedFiles.includes(fileName)) {
                completedFiles.push(fileName);
                await AsyncStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(completedFiles));
            }
        } catch (e) {
            console.error('[DirectUpload] Failed to mark file completed:', e);
        }
    }

    /**
     * Get list of already completed files
     */
    async getCompletedFiles() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('[DirectUpload] Failed to get completed files:', e);
            return [];
        }
    }

    /**
     * Clear session after successful completion
     */
    async clearSession() {
        try {
            await AsyncStorage.multiRemove([STORAGE_KEY_SESSION, STORAGE_KEY_COMPLETED]);
            console.log('[DirectUpload] Session cleared');
        } catch (e) {
            console.error('[DirectUpload] Failed to clear session:', e);
        }
    }

    /**
     * Check if there's a pending upload session that can be resumed
     */
    async hasPendingSession() {
        const session = await this.loadSessionState();
        if (!session) return false;

        const completedFiles = await this.getCompletedFiles();
        const pendingCount = session.totalFiles - completedFiles.length;

        return pendingCount > 0 && session.status !== 'completed';
    }

    /**
     * Get pending session info for UI
     */
    async getPendingSessionInfo() {
        const session = await this.loadSessionState();
        if (!session) return null;

        const completedFiles = await this.getCompletedFiles();

        return {
            totalFiles: session.totalFiles,
            completedCount: completedFiles.length,
            pendingCount: session.totalFiles - completedFiles.length,
            areaCode: session.areaCode,
            startedAt: session.startedAt,
            progress: Math.round((completedFiles.length / session.totalFiles) * 100)
        };
    }

    // ==================== UPLOAD METHODS ====================

    /**
     * Upload single file with auto-retry
     * @param {object} file - File object with uri, fileName, type
     * @param {string} areaCode - Area code for subfolder routing
     * @param {function} onProgress - Progress callback (0-100)
     * @param {number} retryCount - Current retry attempt (internal)
     */
    async uploadFileDirect(file, onProgress, areaCode = null, retryCount = 0) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000;

        if (this.isAborted) {
            throw new Error('Upload aborted');
        }

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
                        console.log(`[DirectUpload] ✅ ${file.fileName} -> ${areaCode ? `input/${areaCode}/` : 'input/'}`);
                        resolve(response);
                    } catch (error) {
                        resolve({ success: true, fileName: file.fileName });
                    }
                } else {
                    console.error(`[DirectUpload] ❌ ${file.fileName} failed: ${xhr.status}`);
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', async () => {
                console.error(`[DirectUpload] Network error: ${file.fileName}`);

                // Auto-retry on network error
                if (retryCount < MAX_RETRIES && !this.isAborted) {
                    console.log(`[DirectUpload] Retrying ${file.fileName} (${retryCount + 1}/${MAX_RETRIES})...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY * (retryCount + 1)));

                    try {
                        const result = await this.uploadFileDirect(file, onProgress, areaCode, retryCount + 1);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error('Network error - please check your connection'));
                }
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload aborted'));
            });

            // Build URL with area_code query parameter
            let uploadUrl = this.uploadUrl;
            if (areaCode) {
                uploadUrl = `${this.uploadUrl}?area_code=${encodeURIComponent(areaCode.toUpperCase())}`;
            }

            // Create FormData
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                type: file.type || 'image/jpeg',
                name: file.fileName,
            });

            xhr.open('POST', uploadUrl);
            xhr.send(formData);
        });
    }

    /**
     * Batch upload with resume capability
     * @param {Array} files - Array of file objects
     * @param {number} batchSize - Number of files to upload in parallel
     * @param {function} onBatchProgress - Batch progress callback
     * @param {function} onFileProgress - Per-file progress callback
     * @param {string} areaCode - Area code for subfolder routing
     * @param {boolean} isResume - Whether this is a resume operation
     */
    async uploadBatch(files, batchSize = 5, onBatchProgress, onFileProgress, areaCode = null, isResume = false) {
        this.isAborted = false;

        // Get already completed files (for resume)
        let completedFileNames = [];
        if (isResume) {
            completedFileNames = await this.getCompletedFiles();
            console.log(`[DirectUpload] Resuming... Already completed: ${completedFileNames.length} files`);
        } else {
            // New upload - clear previous session
            await this.clearSession();
        }

        // Filter out already completed files
        const pendingFiles = files.filter(f => !completedFileNames.includes(f.fileName));

        console.log(`[DirectUpload] ========================================`);
        console.log(`[DirectUpload] ${isResume ? 'RESUMING' : 'STARTING'} batch upload`);
        console.log(`[DirectUpload] Total files: ${files.length}`);
        console.log(`[DirectUpload] Already completed: ${completedFileNames.length}`);
        console.log(`[DirectUpload] Pending: ${pendingFiles.length}`);
        console.log(`[DirectUpload] Area Code: ${areaCode || 'default'}`);
        console.log(`[DirectUpload] Batch Size: ${batchSize}`);
        console.log(`[DirectUpload] ========================================`);

        // Save session state
        await this.saveSessionState({
            totalFiles: files.length,
            areaCode: areaCode,
            batchSize: batchSize,
            status: 'in_progress',
            startedAt: isResume ? (await this.loadSessionState())?.startedAt : new Date().toISOString(),
            fileNames: files.map(f => f.fileName)
        });

        // If all files already completed
        if (pendingFiles.length === 0) {
            console.log('[DirectUpload] All files already uploaded!');
            await this.clearSession();
            return {
                success: true,
                results: [],
                summary: {
                    total: files.length,
                    success: files.length,
                    error: 0,
                    skipped: completedFileNames.length
                }
            };
        }

        const results = [];

        // Split pending files into batches
        const batches = [];
        for (let i = 0; i < pendingFiles.length; i += batchSize) {
            batches.push(pendingFiles.slice(i, i + batchSize));
        }

        let totalCompleted = completedFileNames.length;

        // Process batches
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            if (this.isAborted) {
                console.log('[DirectUpload] Upload aborted by user');
                break;
            }

            const batch = batches[batchIndex];

            if (onBatchProgress) {
                onBatchProgress({
                    currentBatch: batchIndex + 1,
                    totalBatches: batches.length,
                    imagesInBatch: batch.length,
                    totalCompleted: totalCompleted,
                    totalFiles: files.length
                });
            }

            console.log(`[DirectUpload] Batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);

            // Upload batch in parallel
            const batchPromises = batch.map(async (file) => {
                if (this.isAborted) {
                    return { success: false, file, error: 'Aborted' };
                }

                try {
                    const result = await this.uploadFileDirect(
                        file,
                        (progress) => {
                            if (onFileProgress) {
                                onFileProgress(file.id, progress, file.fileName);
                            }
                        },
                        areaCode
                    );

                    // Mark file as completed for resume capability
                    await this.markFileCompleted(file.fileName);
                    totalCompleted++;

                    return { success: true, file, result };

                } catch (error) {
                    console.error(`[DirectUpload] Failed: ${file.fileName}`, error.message);
                    return { success: false, file, error: error.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Small delay between batches
            if (batchIndex < batches.length - 1 && !this.isAborted) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        const successCount = results.filter(r => r.success).length + completedFileNames.length;
        const errorCount = results.filter(r => !r.success).length;

        console.log(`[DirectUpload] ========================================`);
        console.log(`[DirectUpload] Upload ${this.isAborted ? 'PAUSED' : 'COMPLETE'}`);
        console.log(`[DirectUpload] Success: ${successCount}/${files.length}`);
        console.log(`[DirectUpload] Failed: ${errorCount}`);
        console.log(`[DirectUpload] ========================================`);

        // Update session status
        if (errorCount === 0 && !this.isAborted) {
            await this.saveSessionState({
                ...(await this.loadSessionState()),
                status: 'completed',
                completedAt: new Date().toISOString()
            });
            // Clear session after successful completion
            await this.clearSession();
        } else {
            await this.saveSessionState({
                ...(await this.loadSessionState()),
                status: this.isAborted ? 'paused' : 'partial',
                pausedAt: new Date().toISOString()
            });
        }

        return {
            success: errorCount === 0 && !this.isAborted,
            results,
            summary: {
                total: files.length,
                success: successCount,
                error: errorCount,
                skipped: completedFileNames.length
            }
        };
    }

    /**
     * Cancel/pause current upload
     */
    abort() {
        this.isAborted = true;
        console.log('[DirectUpload] Upload abort requested');
    }

    /**
     * Reset abort flag
     */
    reset() {
        this.isAborted = false;
    }
}

// Singleton instance - production environment
export default new DirectUploadService(true);
