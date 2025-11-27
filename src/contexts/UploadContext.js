import React, { createContext, useContext, useState, useRef } from 'react';
import { Alert } from 'react-native';
import chunkedUploadService from '../services/ChunkedUploadService';
import apiService from '../services/ApiService';

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchProgress, setBatchProgress] = useState({}); // { batchIndex: progress% }
  const [uploadStats, setUploadStats] = useState({ total: 0, success: 0, error: 0 });
  const [fileProgress, setFileProgress] = useState({}); // { fileId: { progress, status, fileName } }
  const [uploadedFiles, setUploadedFiles] = useState([]); // Keep track of files being uploaded
  const uploadAbortRef = useRef(false);

  const BATCH_SIZE = 5;

  const startUpload = async (images, session = null) => {
    if (images.length === 0) return;

    setIsUploading(true);
    uploadAbortRef.current = false;

    const totalBatchCount = Math.ceil(images.length / BATCH_SIZE);
    setTotalBatches(totalBatchCount);
    setCurrentBatch(0);
    setBatchProgress({});
    setUploadStats({ total: images.length, success: 0, error: 0 });

    // Initialize file progress tracking
    const initialFileProgress = {};
    images.forEach(img => {
      initialFileProgress[img.id] = {
        progress: 0,
        status: 'pending', // pending, uploading, completed, error
        fileName: img.fileName,
      };
    });
    setFileProgress(initialFileProgress);
    setUploadedFiles(images);

    try {
      console.log(`[UploadContext] Starting batch upload: ${images.length} images in ${totalBatchCount} batches`);

      // Create upload details entry in backend for Monitoring screen
      if (session?.drone) {
        const uploadDetailsPayload = {
          operator: session.drone.drone_code || 'UNKNOWN',
          status: 'active',
          startUploads: images.length,
          endUploads: 0,
          areaHandle: session.drone.area_codes || [],
        };

        console.log(`[UploadContext] Creating upload details:`, uploadDetailsPayload);

        try {
          const uploadDetailsResult = await apiService.createUploadDetails(uploadDetailsPayload);
          if (uploadDetailsResult.success) {
            console.log(`[UploadContext] Upload details created successfully`);
          } else {
            console.warn(`[UploadContext] Failed to create upload details:`, uploadDetailsResult.message);
          }
        } catch (detailsError) {
          console.warn(`[UploadContext] Error creating upload details:`, detailsError);
          // Don't block upload if this fails
        }
      } else {
        console.warn(`[UploadContext] No session/drone data available, skipping upload details creation`);
      }

      const result = await chunkedUploadService.uploadBatch(
        images,
        BATCH_SIZE,
        (batchInfo) => {
          // Batch progress callback
          setCurrentBatch(batchInfo.currentBatch);
          console.log(`[UploadContext] Batch ${batchInfo.currentBatch}/${batchInfo.totalBatches}`);
        },
        (fileId, progress, fileName) => {
          // Per-file progress callback - aggregate to batch level
          const fileIndex = images.findIndex(img => img.id === fileId);
          if (fileIndex !== -1) {
            const batchIndex = Math.floor(fileIndex / BATCH_SIZE);

            // Update batch progress (average of files in batch)
            setBatchProgress(prev => ({
              ...prev,
              [batchIndex]: progress
            }));

            // Update individual file progress
            setFileProgress(prev => ({
              ...prev,
              [fileId]: {
                ...prev[fileId],
                progress: progress,
                status: progress >= 100 ? 'completed' : 'uploading',
                fileName: fileName || prev[fileId]?.fileName,
              }
            }));
          }
        }
      );

      // Mark all successful files as completed
      setFileProgress(prev => {
        const updated = { ...prev };
        result.results.forEach(r => {
          if (r.success && updated[r.fileId]) {
            updated[r.fileId].status = 'completed';
            updated[r.fileId].progress = 100;
          } else if (!r.success && updated[r.fileId]) {
            updated[r.fileId].status = 'error';
          }
        });
        return updated;
      });

      // Update stats
      setUploadStats({
        total: images.length,
        success: result.summary.success,
        error: result.summary.error,
      });

      // Return result for caller
      return result;

    } catch (error) {
      console.error('[UploadContext] Upload error:', error);
      // Mark all files as error
      setFileProgress(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[id].status !== 'completed') {
            updated[id].status = 'error';
          }
        });
        return updated;
      });
      throw error;
    } finally {
      setIsUploading(false);
      setCurrentBatch(0);
      setTotalBatches(0);
      setBatchProgress({});
      // DON'T clear fileProgress and uploadedFiles - keep them for display
    }
  };

  const clearUploadHistory = () => {
    setFileProgress({});
    setUploadedFiles([]);
    setUploadStats({ total: 0, success: 0, error: 0 });
  };

  const cancelUpload = () => {
    uploadAbortRef.current = true;
    setIsUploading(false);
    setCurrentBatch(0);
    setTotalBatches(0);
    setBatchProgress({});
  };

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        currentBatch,
        totalBatches,
        batchProgress,
        uploadStats,
        fileProgress,
        uploadedFiles,
        startUpload,
        cancelUpload,
        clearUploadHistory,
        BATCH_SIZE,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};





















