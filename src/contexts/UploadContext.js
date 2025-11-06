import React, { createContext, useContext, useState, useRef } from 'react';
import { Alert } from 'react-native';
import chunkedUploadService from '../services/ChunkedUploadService';

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
  const uploadAbortRef = useRef(false);

  const BATCH_SIZE = 5;

  const startUpload = async (images) => {
    if (images.length === 0) return;

    setIsUploading(true);
    uploadAbortRef.current = false;
    
    const totalBatchCount = Math.ceil(images.length / BATCH_SIZE);
    setTotalBatches(totalBatchCount);
    setCurrentBatch(0);
    setBatchProgress({});
    setUploadStats({ total: images.length, success: 0, error: 0 });

    try {
      console.log(`[UploadContext] Starting batch upload: ${images.length} images in ${totalBatchCount} batches`);

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
          }
        }
      );

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
      throw error;
    } finally {
      setIsUploading(false);
      setCurrentBatch(0);
      setTotalBatches(0);
      setBatchProgress({});
    }
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
        startUpload,
        cancelUpload,
        BATCH_SIZE,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};






