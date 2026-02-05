import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import ChunkedUploadService from '../services/ChunkedUploadService';
import { FileUploadItem } from '../models';

export default function UploadImageScreen() {
  const { theme } = useTheme();
  const [uploadItems, setUploadItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({});
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [showUploadComplete, setShowUploadComplete] = useState(false);

  // Load pending uploads on mount
  useEffect(() => {
    loadPendingUploads();
    setupUploadCallbacks();
  }, []);

  // Load pending uploads from storage
  const loadPendingUploads = async () => {
    const pending = await ChunkedUploadService.loadPendingUploads();
    if (pending.length > 0) {
      setUploadItems(pending);
      Alert.alert(
        'Resume Upload',
        `Found ${pending.length} pending files from previous session. Do you want to resume?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resume', onPress: () => handleStartUpload() },
        ]
      );
    }
  };

  // Setup upload callbacks
  const setupUploadCallbacks = () => {
    ChunkedUploadService.onProgress((fileId, progress) => {
      setBatchProgress((prev) => ({
        ...prev,
        [fileId]: progress,
      }));
    });

    ChunkedUploadService.onBatchComplete((batchIndex, totalBatches, results) => {
      setCurrentBatch(batchIndex);
      setTotalBatches(totalBatches);
      console.log(`Batch ${batchIndex}/${totalBatches} completed`);
    });

    ChunkedUploadService.onFileComplete((fileItem) => {
      console.log(`File completed: ${fileItem.fileName}`);
      updateStatistics();
    });

    ChunkedUploadService.onError((fileItem, error) => {
      console.error(`File error: ${fileItem.fileName}`, error);
    });
  };

  // Update statistics
  const updateStatistics = () => {
    const stats = ChunkedUploadService.getStatistics();
    setStatistics(stats);
  };

  // State for processing progress
  const [processingFiles, setProcessingFiles] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  // Pick images from gallery
  const pickImages = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) return;

    const assets = result.assets || [];

    // Show processing indicator for large selections
    if (assets.length > 50) {
      setProcessingFiles(true);
      setProcessingProgress({ current: 0, total: assets.length });
    }

    // BATCH PROCESSING: Process files in small batches to prevent OOM crash
    // Processing 300+ files at once causes ~1.2GB memory spike = crash
    const BATCH_SIZE = 15;
    const allFiles = [];

    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);

      // Process batch sequentially to reduce memory pressure
      for (const asset of batch) {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const fileName = asset.fileName || asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
          const file = new File([blob], fileName, {
            type: blob.type || 'image/jpeg',
          });
          allFiles.push(file);

          // Update progress
          setProcessingProgress({ current: allFiles.length, total: assets.length });
        } catch (error) {
          console.warn(`Failed to process ${asset.fileName}: ${error.message}`);
        }
      }

      // Allow garbage collection between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setProcessingFiles(false);
    await handleSelectedFiles(allFiles);
  };

  // Handle selected files
  const handleSelectedFiles = async (files) => {
    if (!files || files.length === 0) return;

    const newItems = await ChunkedUploadService.addToQueue(files);
    setUploadItems((prev) => [...prev, ...newItems]);
    updateStatistics();
  };

  // Start upload
  const handleStartUpload = async () => {
    if (uploadItems.length === 0) return;

    setUploading(true);
    setShowUploadComplete(false);

    try {
      const result = await ChunkedUploadService.startUpload();

      setShowUploadComplete(true);
      Alert.alert(
        'Upload Complete',
        `Successfully uploaded ${result.successCount} of ${result.totalFiles} files.`,
        [{ text: 'OK', onPress: () => handleReset() }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Resume upload
  const handleResumeUpload = async () => {
    await ChunkedUploadService.resumeUpload();
  };

  // Cancel upload
  const handleCancelUpload = () => {
    ChunkedUploadService.cancelUpload();
    setUploading(false);
  };

  // Reset selection
  const handleReset = () => {
    setUploadItems([]);
    setBatchProgress({});
    setCurrentBatch(0);
    setTotalBatches(0);
    setStatistics(null);
    setShowUploadComplete(false);
    ChunkedUploadService.uploadQueue = [];
  };

  // Calculate totals
  const totalFiles = uploadItems.length;
  const totalSizeMB = (
    uploadItems.reduce((sum, item) => sum + item.fileSize, 0) /
    1024 /
    1024
  ).toFixed(2);

  const uploadedCount = uploadItems.filter((item) => item.isUploaded).length;
  const uploadingCount = uploadItems.filter((item) => item.isUploading).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Processing overlay for large file selections */}
      {processingFiles && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingBox, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.processingText, { color: theme.text }]}>
              Processing files...
            </Text>
            <Text style={[styles.processingProgress, { color: theme.primary }]}>
              {processingProgress.current} / {processingProgress.total}
            </Text>
            <View style={[styles.processingBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.processingBarFill,
                  {
                    width: `${(processingProgress.current / processingProgress.total) * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {totalFiles === 0 ? (
        // Empty state - centered select button
        <View style={styles.centeredContainer}>
          <View style={styles.uploadIcon}>
            <Text style={{ fontSize: 64, color: theme.primary }}>☁️</Text>
          </View>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: theme.primary }]}
            onPress={pickImages}
            disabled={processingFiles}
          >
            <Text style={styles.selectButtonText}>SELECT FILES</Text>
          </TouchableOpacity>
          <Text style={[styles.hintText, { color: theme.text }]}>
            Select images to upload
          </Text>
        </View>
      ) : (
        // Content with selected files
        <>
          {/* Top Actions */}
          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={pickImages}
              disabled={uploading}
            >
              <Text style={styles.actionButtonText}>Select More</Text>
            </TouchableOpacity>

            {!uploading ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={handleStartUpload}
              >
                <Text style={styles.actionButtonText}>Upload Files</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                onPress={handleCancelUpload}
              >
                <Text style={styles.actionButtonText}>Cancel Upload</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.border }]}
              onPress={handleReset}
              disabled={uploading}
            >
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Files Summary */}
          <View style={[styles.summaryBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Files:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{totalFiles}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text }]}>Total Size:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{totalSizeMB} MB</Text>
            </View>
            {uploading && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.text }]}>Uploaded:</Text>
                  <Text style={[styles.summaryValue, { color: 'green' }]}>
                    {uploadedCount} / {totalFiles}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.text }]}>Current Batch:</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {currentBatch} / {totalBatches}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Overall Progress */}
          {uploading && statistics && (
            <View style={[styles.progressBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.progressTitle, { color: theme.text }]}>Upload Progress</Text>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${statistics.overallProgress}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: theme.text }]}>
                {statistics.overallProgress.toFixed(1)}%
              </Text>
            </View>
          )}

          {/* Batch Summary View - Much cleaner than showing all files */}
          <BatchSummaryView
            uploadItems={uploadItems}
            batchProgress={batchProgress}
            currentBatch={currentBatch}
            totalBatches={totalBatches}
            uploading={uploading}
            uploadedCount={uploadedCount}
            theme={theme}
          />
        </>
      )}
    </View>
  );
}

// Batch Summary View Component - Shows batch overview instead of all files
function BatchSummaryView({ uploadItems, batchProgress, currentBatch, totalBatches, uploading, uploadedCount, theme }) {
  const [showDetails, setShowDetails] = useState(false);
  const BATCH_SIZE = 5; // Should match upload batch size

  // Calculate batch info
  const totalFiles = uploadItems.length;
  const calculatedBatches = Math.ceil(totalFiles / BATCH_SIZE);
  const displayBatches = totalBatches > 0 ? totalBatches : calculatedBatches;

  // Group files by batch
  const batches = [];
  for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
    const batchFiles = uploadItems.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const isCurrentBatch = batchIndex === currentBatch;
    const isCompleted = batchIndex < currentBatch;
    const batchUploaded = batchFiles.filter(f => f.isUploaded).length;
    const batchProgress = batchFiles.length > 0 ? (batchUploaded / batchFiles.length) * 100 : 0;

    batches.push({
      index: batchIndex,
      files: batchFiles,
      isCurrentBatch,
      isCompleted,
      uploadedCount: batchUploaded,
      totalCount: batchFiles.length,
      progress: batchProgress,
    });
  }

  return (
    <ScrollView style={styles.fileList} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Batch Overview Cards */}
      <View style={styles.batchOverview}>
        <Text style={[styles.batchOverviewTitle, { color: theme.text }]}>
          📦 Batch Overview ({displayBatches} batches)
        </Text>

        {/* Batch Progress Grid */}
        <View style={styles.batchGrid}>
          {batches.map((batch) => (
            <View
              key={batch.index}
              style={[
                styles.batchCard,
                {
                  backgroundColor: batch.isCompleted
                    ? '#4CAF50'
                    : batch.isCurrentBatch
                    ? theme.primary
                    : theme.card,
                  borderColor: batch.isCurrentBatch ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.batchCardNumber,
                  { color: batch.isCompleted || batch.isCurrentBatch ? '#fff' : theme.text },
                ]}
              >
                {batch.index}
              </Text>
              {batch.isCompleted && <Text style={styles.batchCardIcon}>✓</Text>}
              {batch.isCurrentBatch && uploading && (
                <ActivityIndicator size="small" color="#fff" style={styles.batchCardSpinner} />
              )}
            </View>
          ))}
        </View>

        {/* Current Batch Detail */}
        {uploading && currentBatch > 0 && batches[currentBatch - 1] && (
          <View style={[styles.currentBatchDetail, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.currentBatchTitle, { color: theme.primary }]}>
              🔄 Uploading Batch {currentBatch} of {displayBatches}
            </Text>
            <View style={styles.currentBatchFiles}>
              {batches[currentBatch - 1].files.map((file, idx) => (
                <View key={file.fileId} style={styles.currentBatchFileRow}>
                  <Text style={[styles.currentBatchFileName, { color: theme.text }]} numberOfLines={1}>
                    {idx + 1}. {file.fileName}
                  </Text>
                  <Text style={{ fontSize: 16 }}>
                    {file.isUploaded ? '✅' : file.isUploading ? '⏳' : '⏸️'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upload Stats */}
        <View style={[styles.uploadStats, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{totalFiles}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Files</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{uploadedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Uploaded</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalFiles - uploadedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
          </View>
        </View>

        {/* Toggle to show all files (collapsed by default) */}
        <TouchableOpacity
          style={[styles.toggleDetailsButton, { borderColor: theme.border }]}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={[styles.toggleDetailsText, { color: theme.textSecondary }]}>
            {showDetails ? '▼ Hide file details' : '▶ Show all files ({totalFiles})'.replace('{totalFiles}', totalFiles)}
          </Text>
        </TouchableOpacity>

        {/* Expandable file list (collapsed by default) */}
        {showDetails && (
          <View style={styles.detailFileList}>
            {uploadItems.map((item, index) => (
              <View
                key={item.fileId}
                style={[styles.detailFileItem, { borderBottomColor: theme.border }]}
              >
                <Text style={[styles.detailFileIndex, { color: theme.textSecondary }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.detailFileName, { color: theme.text }]} numberOfLines={1}>
                  {item.fileName}
                </Text>
                <Text style={{ fontSize: 14 }}>
                  {item.isUploaded ? '✅' : item.hasError ? '❌' : '⏸️'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// File Item Component (kept for compatibility but not used in main view)
function FileItem({ item, index, progress, uploading, theme }) {
  const getStatusIcon = () => {
    if (item.isUploaded) return '✅';
    if (item.isUploading) return '⏳';
    if (item.hasError) return '❌';
    return '⏸️';
  };

  const getStatusColor = () => {
    if (item.isUploaded) return 'green';
    if (item.hasError) return 'red';
    return theme.text;
  };

  return (
    <View style={[styles.fileItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.fileIndex, { color: theme.text }]}>{index + 1}</Text>

      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={[styles.fileSize, { color: theme.textSecondary }]}>
          {(item.fileSize / 1024 / 1024).toFixed(2)} MB
        </Text>
      </View>

      <View style={styles.fileStatus}>
        <Text style={{ fontSize: 20 }}>{getStatusIcon()}</Text>
        {item.isUploading && uploading && (
          <View style={styles.progressContainer}>
            <View style={[styles.miniProgressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${progress}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: theme.text }]}>
              {progress.toFixed(0)}%
            </Text>
          </View>
        )}
        {item.hasError && (
          <Text style={[styles.errorText, { color: 'red' }]} numberOfLines={1}>
            {item.errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    marginBottom: 24,
  },
  selectButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  hintText: {
    marginTop: 16,
    fontSize: 14,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  fileIndex: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 30,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
  },
  fileStatus: {
    alignItems: 'center',
    minWidth: 100,
  },
  progressContainer: {
    marginTop: 4,
    width: 80,
  },
  miniProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  miniProgressFill: {
    height: '100%',
  },
  progressPercent: {
    fontSize: 11,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
  },
  // Processing overlay styles
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  processingBox: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 250,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  processingProgress: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  processingBar: {
    width: 200,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  processingBarFill: {
    height: '100%',
  },
  // Batch Summary View styles
  batchOverview: {
    flex: 1,
  },
  batchOverviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  batchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  batchCard: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  batchCardNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  batchCardIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
    color: '#fff',
  },
  batchCardSpinner: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  currentBatchDetail: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  currentBatchTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentBatchFiles: {
    gap: 6,
  },
  currentBatchFileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBatchFileName: {
    flex: 1,
    fontSize: 13,
    marginRight: 8,
  },
  uploadStats: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  toggleDetailsButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleDetailsText: {
    fontSize: 13,
  },
  detailFileList: {
    marginTop: 8,
  },
  detailFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailFileIndex: {
    width: 36,
    fontSize: 12,
  },
  detailFileName: {
    flex: 1,
    fontSize: 12,
  },
});
