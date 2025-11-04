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
    const files = await Promise.all(
      assets.map(async (asset) => {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const fileName = asset.fileName || asset.uri.split('/').pop() || `photo_${Date.now()}.jpg`;
        return new File([blob], fileName, {
          type: blob.type || 'image/jpeg',
        });
      })
    );

    await handleSelectedFiles(files);
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
      {totalFiles === 0 ? (
        // Empty state - centered select button
        <View style={styles.centeredContainer}>
          <View style={styles.uploadIcon}>
            <Text style={{ fontSize: 64, color: theme.primary }}>☁️</Text>
          </View>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: theme.primary }]}
            onPress={pickImages}
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

          {/* File List */}
          <ScrollView style={styles.fileList} contentContainerStyle={{ paddingBottom: 100 }}>
            {uploadItems.map((item, index) => (
              <FileItem
                key={item.fileId}
                item={item}
                index={index}
                progress={batchProgress[item.fileId] || 0}
                uploading={uploading}
                theme={theme}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// File Item Component
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
});
