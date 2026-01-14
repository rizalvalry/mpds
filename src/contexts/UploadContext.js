import { createContext, useContext, useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import directUploadService from '../services/DirectUploadService';
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
    const [batchProgress, setBatchProgress] = useState({});
    const [uploadStats, setUploadStats] = useState({ total: 0, success: 0, error: 0 });
    const [hasPendingUpload, setHasPendingUpload] = useState(false);
    const [pendingUploadInfo, setPendingUploadInfo] = useState(null);
    const uploadAbortRef = useRef(false);

    const BATCH_SIZE = 5;

    // Check for pending uploads on mount
    useEffect(() => {
        checkPendingUpload();
    }, []);

    /**
     * Check if there's a pending upload that can be resumed
     */
    const checkPendingUpload = async () => {
        try {
            const hasPending = await directUploadService.hasPendingSession();
            setHasPendingUpload(hasPending);

            if (hasPending) {
                const info = await directUploadService.getPendingSessionInfo();
                setPendingUploadInfo(info);
                console.log('[UploadContext] Found pending upload:', info);
            }
        } catch (e) {
            console.error('[UploadContext] Error checking pending upload:', e);
        }
    };

    /**
     * Start new upload batch
     */
    const startUpload = async (images) => {
        if (images.length === 0) return;

        setIsUploading(true);
        uploadAbortRef.current = false;
        directUploadService.reset();

        const totalBatchCount = Math.ceil(images.length / BATCH_SIZE);
        setTotalBatches(totalBatchCount);
        setCurrentBatch(0);
        setBatchProgress({});
        setUploadStats({ total: images.length, success: 0, error: 0 });

        try {
            console.log(`[UploadContext] Starting DIRECT upload: ${images.length} images`);

            // 1. Fetch session from storage
            let session = null;
            try {
                const sessionJson = await AsyncStorage.getItem('session_data');
                if (sessionJson) {
                    session = JSON.parse(sessionJson);
                    console.log(`[UploadContext] Session loaded, area_code: ${session?.area_code || 'NOT SET'}`);
                }
            } catch (e) {
                console.warn('[UploadContext] Failed to load session:', e);
            }

            // 2. Create upload details entry in backend (for tracking)
            if (session?.drone) {
                const areaHandle = Array.isArray(session.area_code)
                    ? session.area_code
                    : session.area_code ? [session.area_code] : [];

                const uploadDetailsPayload = {
                    operator: session.drone.drone_code || 'UNKNOWN',
                    status: 'active',
                    startUploads: images.length,
                    endUploads: 0,
                    areaHandle: areaHandle,
                };

                console.log(`[UploadContext] Creating upload details:`, uploadDetailsPayload);

                try {
                    const uploadDetailsResult = await apiService.createUploadDetails(uploadDetailsPayload);
                    if (uploadDetailsResult.success) {
                        console.log(`[UploadContext] ✅ Upload details created! ID: ${uploadDetailsResult.id}`);
                    }
                } catch (detailsError) {
                    console.warn(`[UploadContext] ❌ Error creating upload details:`, detailsError);
                }
            }

            // 3. Extract area code for subfolder routing
            const areaCode = session?.area_code
                ? (Array.isArray(session.area_code)
                    ? session.area_code[0]
                    : session.area_code)
                : null;

            if (areaCode) {
                console.log(`[UploadContext] 📁 Routing to: input/${areaCode}/`);
            } else {
                console.log(`[UploadContext] ⚠️ No areaCode - files go to input/`);
            }

            // 4. Start Direct Upload (with resume capability)
            const result = await directUploadService.uploadBatch(
                images,
                BATCH_SIZE,
                (batchInfo) => {
                    setCurrentBatch(batchInfo.currentBatch);
                    setTotalBatches(batchInfo.totalBatches);
                },
                (fileId, progress, fileName) => {
                    const fileIndex = images.findIndex(img => img.id === fileId);
                    if (fileIndex !== -1) {
                        const batchIndex = Math.floor(fileIndex / BATCH_SIZE);
                        setBatchProgress(prev => ({
                            ...prev,
                            [batchIndex]: progress
                        }));
                    }
                },
                areaCode,
                false  // isResume = false (new upload)
            );

            // Update stats
            setUploadStats({
                total: images.length,
                success: result.summary.success,
                error: result.summary.error,
            });

            // Clear pending upload flag
            setHasPendingUpload(false);
            setPendingUploadInfo(null);

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

    /**
     * Resume a paused/failed upload
     */
    const resumeUpload = async (images) => {
        if (!hasPendingUpload || images.length === 0) {
            console.log('[UploadContext] No pending upload to resume');
            return null;
        }

        setIsUploading(true);
        uploadAbortRef.current = false;
        directUploadService.reset();

        try {
            console.log(`[UploadContext] RESUMING upload...`);

            // Get session for area code
            let areaCode = pendingUploadInfo?.areaCode;

            if (!areaCode) {
                const sessionJson = await AsyncStorage.getItem('session_data');
                if (sessionJson) {
                    const session = JSON.parse(sessionJson);
                    areaCode = Array.isArray(session.area_code)
                        ? session.area_code[0]
                        : session.area_code;
                }
            }

            const result = await directUploadService.uploadBatch(
                images,
                BATCH_SIZE,
                (batchInfo) => {
                    setCurrentBatch(batchInfo.currentBatch);
                    setTotalBatches(batchInfo.totalBatches);
                },
                (fileId, progress, fileName) => {
                    const fileIndex = images.findIndex(img => img.id === fileId);
                    if (fileIndex !== -1) {
                        const batchIndex = Math.floor(fileIndex / BATCH_SIZE);
                        setBatchProgress(prev => ({
                            ...prev,
                            [batchIndex]: progress
                        }));
                    }
                },
                areaCode,
                true  // isResume = true
            );

            setUploadStats({
                total: images.length,
                success: result.summary.success,
                error: result.summary.error,
            });

            if (result.success) {
                setHasPendingUpload(false);
                setPendingUploadInfo(null);
            }

            return result;

        } catch (error) {
            console.error('[UploadContext] Resume error:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Cancel current upload
     */
    const cancelUpload = () => {
        uploadAbortRef.current = true;
        directUploadService.abort();
        setIsUploading(false);
        setCurrentBatch(0);
        setTotalBatches(0);
        setBatchProgress({});

        // Check if there's a pending session after cancel
        setTimeout(checkPendingUpload, 500);
    };

    /**
     * Clear pending upload session
     */
    const clearPendingUpload = async () => {
        await directUploadService.clearSession();
        setHasPendingUpload(false);
        setPendingUploadInfo(null);
    };

    return (
        <UploadContext.Provider
            value={{
                isUploading,
                currentBatch,
                totalBatches,
                batchProgress,
                uploadStats,
                hasPendingUpload,
                pendingUploadInfo,
                startUpload,
                resumeUpload,
                cancelUpload,
                clearPendingUpload,
                checkPendingUpload,
                BATCH_SIZE,
            }}
        >
            {children}
        </UploadContext.Provider>
    );
};
