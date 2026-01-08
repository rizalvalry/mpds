import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Retry mechanism state (like Flutter)
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasPendingUploads, setHasPendingUploads] = useState(false);

  const uploadAbortRef = useRef(false);
  const retryTimerRef = useRef(null);
  const connectivityUnsubscribeRef = useRef(null);
  const pendingUploadRef = useRef(null); // Store pending upload state

  const BATCH_SIZE = 5;
  const RETRY_INTERVAL = 5000; // 5 seconds (like Flutter)
  const PENDING_UPLOADS_KEY = '@pending_uploads';

  // Setup connectivity listener (like Flutter's _setupConnectivityListener)
  useEffect(() => {
    // Load pending uploads on mount
    loadPendingUploads();

    // Listen for connectivity changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const hasConnection = state.isConnected && state.isInternetReachable !== false;

      if (hasConnection && isRetrying) {
        console.log('[UploadContext] 🌐 Connection restored - resuming upload...');
        clearRetryTimer();
        setIsRetrying(false);
        resumeUpload();
      }
    });

    connectivityUnsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (connectivityUnsubscribeRef.current) {
        connectivityUnsubscribeRef.current();
      }
      clearRetryTimer();
    };
  }, [isRetrying]); // Re-run when isRetrying changes

  // Save pending uploads to AsyncStorage (like Flutter's _savePendingUploads)
  const savePendingUploads = async (images, session, completedFileIds = []) => {
    try {
      // Only save files that haven't been uploaded
      const pendingFiles = images.filter(img => !completedFileIds.includes(img.id));

      if (pendingFiles.length > 0) {
        const uploadState = {
          images: pendingFiles,
          session,
          completedFileIds,
          timestamp: new Date().toISOString(),
        };

        await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uploadState));
        setHasPendingUploads(true);
        console.log(`[UploadContext] 💾 Saved ${pendingFiles.length} pending uploads`);
      } else {
        // All files uploaded, clear pending uploads
        await AsyncStorage.removeItem(PENDING_UPLOADS_KEY);
        setHasPendingUploads(false);
        console.log(`[UploadContext] ✅ All uploads complete - cleared pending uploads`);
      }
    } catch (error) {
      console.error('[UploadContext] Error saving pending uploads:', error);
    }
  };

  // Load pending uploads from AsyncStorage (like Flutter's _loadPendingUploads)
  const loadPendingUploads = async () => {
    try {
      const pendingData = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
      if (pendingData) {
        const uploadState = JSON.parse(pendingData);
        const pendingCount = uploadState.images?.length || 0;

        if (pendingCount > 0) {
          pendingUploadRef.current = uploadState;
          setHasPendingUploads(true);
          console.log(`[UploadContext] 📂 Found ${pendingCount} pending uploads from previous session`);

          // Show alert to user
          Alert.alert(
            'Pending Uploads Found',
            `Found ${pendingCount} pending uploads from previous session. Would you like to resume?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => clearPendingUploads(),
              },
              {
                text: 'Resume',
                onPress: () => resumePendingUploads(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('[UploadContext] Error loading pending uploads:', error);
    }
  };

  // Resume pending uploads from previous session
  const resumePendingUploads = async () => {
    if (pendingUploadRef.current) {
      const { images, session, completedFileIds } = pendingUploadRef.current;
      console.log(`[UploadContext] 🔄 Resuming ${images.length} pending uploads...`);

      // Filter out already completed files
      const remainingFiles = images.filter(img => !completedFileIds.includes(img.id));

      if (remainingFiles.length > 0) {
        await startUpload(remainingFiles, session);
      } else {
        await clearPendingUploads();
      }
    }
  };

  // Clear pending uploads
  const clearPendingUploads = async () => {
    try {
      await AsyncStorage.removeItem(PENDING_UPLOADS_KEY);
      pendingUploadRef.current = null;
      setHasPendingUploads(false);
      console.log('[UploadContext] 🗑️ Cleared pending uploads');
    } catch (error) {
      console.error('[UploadContext] Error clearing pending uploads:', error);
    }
  };

  // Clear retry timer (like Flutter's _connectivityRetryTimer?.cancel())
  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // Start retry mechanism (like Flutter's _startRetryMechanism)
  const startRetryMechanism = async () => {
    setIsRetrying(true);
    console.log(`[UploadContext] ⏸️ Connection lost - will retry in ${RETRY_INTERVAL / 1000} seconds...`);

    // Alert user
    Alert.alert(
      'Connection Lost',
      `Upload paused. Will retry in ${RETRY_INTERVAL / 1000} seconds when connection is restored...`,
      [{ text: 'OK' }]
    );

    // Setup retry timer (like Flutter's Timer.periodic)
    const checkConnection = async () => {
      const networkState = await NetInfo.fetch();
      const hasConnection = networkState.isConnected && networkState.isInternetReachable !== false;

      if (hasConnection) {
        console.log('[UploadContext] 🌐 Connection restored via timer - resuming...');
        clearRetryTimer();
        setIsRetrying(false);
        Alert.alert('Connection Restored', 'Resuming upload...', [{ text: 'OK' }]);
        resumeUpload();
      } else {
        // Retry again after interval
        retryTimerRef.current = setTimeout(checkConnection, RETRY_INTERVAL);
      }
    };

    retryTimerRef.current = setTimeout(checkConnection, RETRY_INTERVAL);
  };

  // Resume upload after connection restored (like Flutter's resumeUpload)
  const resumeUpload = async () => {
    if (pendingUploadRef.current && !isUploading) {
      const { images, session, completedFileIds } = pendingUploadRef.current;

      // Filter out completed files
      const remainingFiles = images.filter(img => !completedFileIds.includes(img.id));

      if (remainingFiles.length > 0) {
        console.log(`[UploadContext] 🔄 Resuming upload for ${remainingFiles.length} files...`);
        await startUpload(remainingFiles, session);
      } else {
        console.log(`[UploadContext] ✅ All files already uploaded`);
        await clearPendingUploads();
      }
    }
  };

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

    // Store pending upload state for retry mechanism
    pendingUploadRef.current = {
      images,
      session,
      completedFileIds: [],
    };
    await savePendingUploads(images, session, []);

    try {
      console.log(`[UploadContext] Starting batch upload: ${images.length} images in ${totalBatchCount} batches`);

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

            // Update completed files list for retry mechanism
            if (progress >= 100 && pendingUploadRef.current) {
              const completedIds = [...pendingUploadRef.current.completedFileIds];
              if (!completedIds.includes(fileId)) {
                completedIds.push(fileId);
                pendingUploadRef.current.completedFileIds = completedIds;
                savePendingUploads(images, session, completedIds);
              }
            }
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

      // Clear pending uploads on success
      await clearPendingUploads();

      // Return result for caller
      return result;

    } catch (error) {
      console.error('[UploadContext] Upload error:', error);

      // Check if it's a connection error
      if (error.message && (
        error.message.includes('Network') ||
        error.message.includes('connection') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      )) {
        console.log('[UploadContext] 🔌 Network error detected - starting retry mechanism...');
        startRetryMechanism();

        // Don't mark files as error yet - they're paused for retry
        return {
          success: false,
          paused: true,
          message: 'Upload paused due to connection error. Will retry automatically.'
        };
      } else {
        // Other errors - mark all files as error
        setFileProgress(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(id => {
            if (updated[id].status !== 'completed') {
              updated[id].status = 'error';
            }
          });
          return updated;
        });
        await clearPendingUploads();
        throw error;
      }
    } finally {
      // Only clear upload state if not retrying
      if (!isRetrying) {
        setIsUploading(false);
        setCurrentBatch(0);
        setTotalBatches(0);
        setBatchProgress({});
      }
      // DON'T clear fileProgress and uploadedFiles - keep them for display
    }
  };

  const clearUploadHistory = () => {
    setFileProgress({});
    setUploadedFiles([]);
    setUploadStats({ total: 0, success: 0, error: 0 });
    clearPendingUploads();
  };

  const cancelUpload = () => {
    uploadAbortRef.current = true;
    setIsUploading(false);
    setIsRetrying(false);
    setCurrentBatch(0);
    setTotalBatches(0);
    setBatchProgress({});
    clearRetryTimer();
    clearPendingUploads();
    console.log('[UploadContext] ❌ Upload cancelled by user');
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
        isRetrying,
        hasPendingUploads,
        startUpload,
        cancelUpload,
        clearUploadHistory,
        resumePendingUploads,
        clearPendingUploads,
        BATCH_SIZE,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};


