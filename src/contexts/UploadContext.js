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

<<<<<<< Updated upstream
=======
      // Create upload details entry in backend for Monitoring screen
      if (session?.drone) {
        // Ensure area_codes is always an array for backend services
        const areaHandle = Array.isArray(session.drone.area_codes)
          ? session.drone.area_codes
          : session.drone.area_codes ? [session.drone.area_codes] : [];

        const uploadDetailsPayload = {
          operator: session.drone.drone_code || 'UNKNOWN',
          status: 'active',
          startUploads: images.length,
          endUploads: 0,
          areaHandle: areaHandle, // Send as array, e.g., ["C"] or ["D"]
        };

        console.log(`[UploadContext] ========================================`);
        console.log(`[UploadContext] Creating upload details for backend.worker`);
        console.log(`[UploadContext] Payload:`, uploadDetailsPayload);
        console.log(`[UploadContext] areaHandle type:`, Array.isArray(areaHandle) ? `array[${areaHandle.length}]` : typeof areaHandle);
        console.log(`[UploadContext] areaHandle value:`, JSON.stringify(areaHandle));
        console.log(`[UploadContext] ========================================`);

        try {
          const uploadDetailsResult = await apiService.createUploadDetails(uploadDetailsPayload);
          if (uploadDetailsResult.success) {
            console.log(`[UploadContext] ✅ Upload details created successfully!`);
            console.log(`[UploadContext] 📋 Session ID: ${uploadDetailsResult.id || 'N/A'}`);
            console.log(`[UploadContext] 📍 Area: ${areaHandle.join(', ')}`);
            console.log(`[UploadContext] 📊 Total images: ${images.length}`);
            console.log(`[UploadContext] 🔄 Worker should now process these images and send Pusher events`);
          } else {
            console.warn(`[UploadContext] ❌ Failed to create upload details:`, uploadDetailsResult.message);
          }
        } catch (detailsError) {
          console.warn(`[UploadContext] ❌ Error creating upload details:`, detailsError);
          // Don't block upload if this fails
        }
      } else {
        console.warn(`[UploadContext] ⚠️ No session/drone data available, skipping upload details creation`);
      }

      // Extract area code for subfolder routing
      // Use first area from session (e.g., "A", "K", "Y")
      const areaCode = session?.drone?.area_codes
        ? (Array.isArray(session.drone.area_codes)
          ? session.drone.area_codes[0]
          : session.drone.area_codes)
        : null;

      if (areaCode) {
        console.log(`[UploadContext] 📁 Using areaCode for subfolder routing: ${areaCode}`);
      } else {
        console.log(`[UploadContext] ⚠️ No areaCode - files will go to default input/ folder`);
      }

>>>>>>> Stashed changes
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
        },
        null,     // uuid - will be auto-generated
        null,     // userid - will be retrieved from session
        areaCode  // NEW: Pass areaCode for subfolder routing
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






