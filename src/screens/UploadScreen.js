import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import uploadStrategyService from '../services/UploadStrategyService';
import { addUploadBatch } from '../utils/uploadSessionStorage';
import apiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function UploadScreen({ session, setSession, activeMenu, setActiveMenu, isDarkMode }) {
  // Dynamic upload configuration from login response
  const [uploadMethod, setUploadMethod] = useState('chunking');
  const [batchSize, setBatchSize] = useState(8);
  const [uploadMethodDisplay, setUploadMethodDisplay] = useState('Batch Upload');

  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentBatchFiles, setCurrentBatchFiles] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState(null);

  // Initialize upload strategy on mount
  useEffect(() => {
    const initUploadStrategy = async () => {
      await uploadStrategyService.init();
      const method = uploadStrategyService.getUploadMethod();
      const maxBatch = uploadStrategyService.getMaxImagesPerBatch();
      const display = uploadStrategyService.getUploadMethodDisplayName();

      setUploadMethod(method);
      setBatchSize(maxBatch);
      setUploadMethodDisplay(display);

      console.log('[UploadScreen] Upload strategy initialized:');
      console.log(`[UploadScreen] - Method: ${method}`);
      console.log(`[UploadScreen] - Batch size: ${maxBatch}`);
      console.log(`[UploadScreen] - Display: ${display}`);
    };

    initUploadStrategy();
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme
  const theme = {
    background: isDarkMode ? '#001a33' : '#e6f2ff',
    text: isDarkMode ? '#fff' : '#0047AB',
    card: isDarkMode ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  };

  // Pick files from File Manager (supports bulk selection) - ONLY upload method
  const pickFilesFromManager = async () => {
    try {
      // IMMEDIATE UI FEEDBACK: Show loading overlay BEFORE async operation
      setLoadingImages(true);
      setLoadingProgress(0);

      // Start pulse animation immediately
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Now call the file picker (this is what causes the "blank screen")
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {

        const totalImages = result.assets.length;
        const newImages = [];

        console.log(`[Upload] Processing ${totalImages} files from file manager...`);

        // Process files dengan progress
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];

          newImages.push({
            id: `${Date.now()}_${i}`,
            uri: asset.uri,
            fileName: asset.name || `file_${i}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            size: asset.size,
            progress: 0,
            status: 'pending',
          });

          // Update progress
          const progressPercent = Math.round(((i + 1) / totalImages) * 100);
          setLoadingProgress(progressPercent);
        }

        console.log(`[Upload] Successfully loaded ${newImages.length} files from file manager`);
        setSelectedImages([...selectedImages, ...newImages]);

        // Hide loading dengan delay
        setTimeout(() => {
          setLoadingImages(false);
          setLoadingProgress(0);
          pulseAnim.stopAnimation();
          pulseAnim.setValue(1);
        }, 300);
      } else {
        // User cancelled - hide loading immediately
        setLoadingImages(false);
        setLoadingProgress(0);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      }
    } catch (error) {
      console.error('Error picking files from manager:', error);
      Alert.alert('Error', 'Failed to pick files from file manager');
      setLoadingImages(false);
      setLoadingProgress(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  };

  const removeImage = (id) => {
    setSelectedImages(selectedImages.filter((img) => img.id !== id));
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Are you sure you want to remove all images?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setSelectedImages([]),
      },
    ]);
  };

  // Calculate overall progress based on all files
  const calculateOverallProgress = (images) => {
    if (images.length === 0) return 0;
    const totalProgress = images.reduce((sum, img) => sum + (img.progress || 0), 0);
    return totalProgress / images.length;
  };

  // Upload images with detailed progress tracking (like Flutter)
  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select images to upload');
      return;
    }

    setUploading(true);
    setUploadedCount(0);
    setOverallProgress(0);

    // Calculate total batches using dynamic batch size
    const totalBatchesCount = Math.ceil(selectedImages.length / batchSize);
    setTotalBatches(totalBatchesCount);

    console.log(`[UploadScreen] Starting upload with method: ${uploadMethod}, batch size: ${batchSize}`);

    // Create upload session in API BEFORE upload starts
    try {
      const uploadData = {
        operator: session?.drone?.drone_code || 'Unknown',
        status: 'active',
        startUploads: selectedImages.length, // Use total selected images, not result.summary.success
        endUploads: 0,
        areaHandle: session?.area_code || [],
      };

      console.log('[UploadScreen] Creating upload session in API BEFORE upload:', uploadData);

      const apiResponse = await apiService.createUploadDetails(uploadData);

      if (apiResponse.success) {
        console.log('[UploadScreen] ✅ Upload session created in API:', apiResponse.data);
      } else {
        console.warn('[UploadScreen] ⚠️ Failed to create API session:', apiResponse.message);
        // Continue with upload even if API call fails
      }
    } catch (error) {
      console.error('[UploadScreen] ❌ API session creation error:', error);
      // Continue with upload even if API call fails
    }

    try {
      // Use UploadStrategyService - automatically switches between chunking and direct
      const result = await uploadStrategyService.uploadBatch(
        selectedImages,
        // Batch progress callback
        (batchInfo) => {
          console.log(`[Upload] Batch ${batchInfo.currentBatch}/${batchInfo.totalBatches}`);
          setCurrentBatch(batchInfo.currentBatch);
          setTotalBatches(batchInfo.totalBatches);

          // Update current batch files for UI display
          const batchFiles = selectedImages.slice(
            (batchInfo.currentBatch - 1) * batchSize,
            batchInfo.currentBatch * batchSize
          );
          setCurrentBatchFiles(batchFiles);
        },
        // Image progress callback (per file)
        (imageId, progress, fileName) => {
          // Clamp progress to 0-100 to prevent overflow
          const clampedProgress = Math.min(Math.max(progress, 0), 100);
          console.log(`[Upload] File: ${fileName} - Progress: ${clampedProgress}%`);

          // Update current uploading file
          setCurrentUploadingFile(fileName);

          // Update image status and progress
          setSelectedImages((prev) => {
            const updated = prev.map((img) => {
              if (img.id === imageId) {
                return {
                  ...img,
                  status: clampedProgress >= 100 ? 'uploaded' : 'uploading',
                  progress: clampedProgress
                };
              }
              return img;
            });

            // Calculate overall progress (clamped)
            const overall = Math.min(calculateOverallProgress(updated), 100);
            setOverallProgress(overall);

            // Count uploaded files
            const uploaded = updated.filter(img => img.status === 'uploaded').length;
            setUploadedCount(uploaded);

            return updated;
          });

          // Update progress tracking
          setUploadProgress((prev) => ({
            ...prev,
            [imageId]: clampedProgress,
          }));
        }
      );

      // Update final statuses based on results
      result.results.forEach((res) => {
        setSelectedImages((prev) =>
          prev.map((img) =>
            img.id === res.file.id
              ? { ...img, status: res.success ? 'uploaded' : 'error', progress: res.success ? 100 : 0 }
              : img
          )
        );

        if (res.success) {
          setUploadProgress((prev) => ({
            ...prev,
            [res.file.id]: 100,
          }));
        }
      });

      // Final counts
      const finalUploaded = selectedImages.filter(img => img.status === 'uploaded').length;
      setUploadedCount(finalUploaded);
      setOverallProgress(100);

      // Save upload batch to AsyncStorage for Monitoring tab tracking
      try {
        const droneCode = session?.drone?.drone_code || 'N/A';
        await addUploadBatch(result.summary.success, droneCode);
        console.log('[UploadScreen] Saved upload batch to AsyncStorage:', {
          totalFiles: result.summary.success,
          droneCode,
        });
      } catch (error) {
        console.error('[UploadScreen] Failed to save upload batch:', error);
        // Don't block user flow if storage fails
      }

      // Show result
      if (result.success) {
        Alert.alert(
          'Upload Complete! ✅',
          `Successfully uploaded ${result.summary.success} images!\n\nBatches completed: ${totalBatchesCount}\n\nTrack progress in Monitoring tab.`
        );
      } else {
        Alert.alert(
          'Upload Partial Success ⚠️',
          `Uploaded ${result.summary.success} of ${result.summary.total} images.\n${result.summary.error} failed.\n\nTrack progress in Monitoring tab.`
        );
      }

      // Clear successful uploads after delay
      setTimeout(() => {
        setSelectedImages((prev) => prev.filter((img) => img.status === 'error'));
        setUploadProgress({});
        setCurrentBatch(0);
        setTotalBatches(0);
        setCurrentBatchFiles([]);
        setOverallProgress(0);
        setUploadedCount(0);
        setCurrentUploadingFile(null);
      }, 3000);
    } catch (error) {
      console.error('Batch upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading':
        return '#FFB74D';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return '#1E90FF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return '⏫';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📷';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={['#00BFFF', '#1E90FF', '#0047AB']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Upload Images</Text>
        <Text style={styles.headerSubtitle}>{uploadMethodDisplay} - {batchSize} images per batch</Text>
      </LinearGradient>

      {/* Side-by-Side Container: Menu Bar (Left) + DateTime (Right) */}
      <View style={styles.topBarContainer}>
        {/* Left: Menu Navigation Bar - 75% Width */}
        <View style={styles.topBarLeft}>
          <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.menuNavBlur}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.menuNavScrollContent}
            >
              {/* Dashboard */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('dashboard')}
                activeOpacity={0.7}
              >
                {activeMenu === 'dashboard' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📊</Text>
                    <Text style={styles.menuNavTextActive}>Dashboard</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📊</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Dashboard</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Upload */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('upload')}
                activeOpacity={0.7}
              >
                {activeMenu === 'upload' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📤</Text>
                    <Text style={styles.menuNavTextActive}>Upload</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📤</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Upload</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cases */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('cases')}
                activeOpacity={0.7}
              >
                {activeMenu === 'cases' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📋</Text>
                    <Text style={styles.menuNavTextActive}>Cases</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📋</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Cases</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Monitoring */}
              <TouchableOpacity
                style={styles.menuNavItem}
                onPress={() => setActiveMenu('monitoring')}
                activeOpacity={0.7}
              >
                {activeMenu === 'monitoring' ? (
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuNavActiveTab}
                  >
                    <Text style={styles.menuNavIconActive}>📈</Text>
                    <Text style={styles.menuNavTextActive}>Monitoring</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📈</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Monitoring</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </View>

        {/* Right: DateTime Card - 25% Width */}
        <View style={styles.topBarRight}>
          <BlurView intensity={80} tint="light" style={styles.dateTimeBlurCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']}
              style={styles.dateTimeGradientCard}
            >
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🚁</Text>
                <Text style={styles.dateTimeText}>
                  {session?.drone?.drone_code || 'N/A'}
                </Text>
              </View>
              <View style={styles.dateTimeDivider} />
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🕒</Text>
                <Text style={styles.timeText}>
                  {currentTime.toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </View>

      {/* Two Panel Layout: Left (Count Display) + Right (Upload Browse) */}
      <View style={styles.twoPanelContainer}>
        {/* LEFT PANEL - Futuristic Upload Progress Display */}
        <ScrollView style={styles.leftPanel} showsVerticalScrollIndicator={false}>
          <BlurView intensity={90} tint="light" style={styles.leftPanelBlur}>
            <LinearGradient
              colors={['rgba(0,191,255,0.05)', 'rgba(30,144,255,0.08)', 'rgba(0,71,171,0.05)']}
              style={styles.leftPanelGradient}
            >
              {/* Header */}
              <View style={styles.leftPanelHeader}>
                <View style={styles.droneIconContainer}>
                  {/* <Text style={styles.droneIcon}>🚁</Text> */}
                  <View style={styles.droneSignalPulse} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.leftPanelTitle}>DRONE AI Upload</Text>
                  <Text style={styles.leftPanelSubtitle}>Neural Network Transfer</Text>
                </View>
              </View>

              {selectedImages.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrapper}>
                    <LinearGradient
                      colors={['rgba(0,191,255,0.2)', 'rgba(30,144,255,0.1)']}
                      style={styles.emptyIconGradient}
                    >
                      {/* <Text style={styles.emptyIcon}>📡</Text> */}
                    </LinearGradient>
                  </View>
                  <Text style={styles.emptyStateTitle}>Preview Mode</Text>
                  <Text style={styles.emptyStateSubtitle}>Select images to initialize upload sequence</Text>
                </View>
              ) : (
                <View style={styles.uploadContentContainer}>
                  {/* Overall Progress Card */}
                  {uploading && (
                    <View style={styles.overallProgressCard}>
                      <View style={styles.overallProgressHeader}>
                        <Text style={styles.overallProgressLabel}>SYSTEM STATUS</Text>
                        <Text style={styles.overallProgressPercentage}>{Math.round(overallProgress)}%</Text>
                      </View>

                      {/* Futuristic Progress Bar */}
                      <View style={styles.futuristicProgressBar}>
                        <View style={styles.progressBarTrack}>
                          <LinearGradient
                            colors={['#00BFFF', '#1E90FF', '#0047AB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressBarFill, { width: `${overallProgress}%` }]}
                          >
                            <View style={styles.progressBarGlow} />
                            <View style={styles.progressBarScanLine} />
                          </LinearGradient>
                        </View>
                        <View style={styles.progressBarGrid}>
                          {[...Array(20)].map((_, i) => (
                            <View key={i} style={styles.gridLine} />
                          ))}
                        </View>
                      </View>

                      {/* Batch Info */}
                      <View style={styles.batchStatusRow}>
                        <View style={styles.batchStatusItem}>
                          <Text style={styles.batchStatusLabel}>BATCH</Text>
                          <Text style={styles.batchStatusValue}>{currentBatch}/{totalBatches}</Text>
                        </View>
                        <View style={styles.batchStatusDivider} />
                        <View style={styles.batchStatusItem}>
                          <Text style={styles.batchStatusLabel}>UPLOADED</Text>
                          <Text style={styles.batchStatusValue}>{uploadedCount}/{selectedImages.length}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* File List with Progress */}
                  <View style={styles.fileListContainer}>
                    <View style={styles.fileListHeader}>
                      <Text style={styles.fileListTitle}>TRANSFER QUEUE</Text>
                      <Text style={styles.fileListCount}>{selectedImages.length} FILES</Text>
                    </View>

                    {selectedImages.map((file, index) => {
                      const fileProgress = file.progress || 0;
                      const isUploading = file.status === 'uploading';
                      const isUploaded = file.status === 'uploaded';
                      const isError = file.status === 'error';
                      const isPending = file.status === 'pending';

                      return (
                        <View key={file.id} style={styles.fileItem}>
                          {/* Status Indicator */}
                          <View style={styles.fileStatusIndicator}>
                            {isUploaded && (
                              <LinearGradient
                                colors={['#4CAF50', '#66BB6A']}
                                style={styles.statusIconSuccess}
                              >
                                <Text style={styles.statusIconText}>✓</Text>
                              </LinearGradient>
                            )}
                            {isUploading && (
                              <View style={styles.statusIconUploading}>
                                <Animated.View style={[styles.uploadingPulse, { transform: [{ scale: pulseAnim }] }]} />
                                <Text style={styles.statusIconText}>⬆</Text>
                              </View>
                            )}
                            {isPending && (
                              <View style={styles.statusIconPending}>
                                <Text style={styles.statusIconText}>◷</Text>
                              </View>
                            )}
                            {isError && (
                              <LinearGradient
                                colors={['#F44336', '#E57373']}
                                style={styles.statusIconError}
                              >
                                <Text style={styles.statusIconText}>✕</Text>
                              </LinearGradient>
                            )}
                          </View>

                          {/* File Info */}
                          <View style={styles.fileInfoContainer}>
                            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                              {file.fileName}
                            </Text>

                            {/* Progress Bar for Uploading Files */}
                            {isUploading && (
                              <View style={styles.fileProgressContainer}>
                                <View style={styles.fileProgressBar}>
                                  <LinearGradient
                                    colors={['#00BFFF', '#1E90FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.fileProgressFill, { width: `${fileProgress}%` }]}
                                  >
                                    <View style={styles.fileProgressGlow} />
                                  </LinearGradient>
                                </View>
                                <Text style={styles.fileProgressText}>{Math.round(fileProgress)}%</Text>
                              </View>
                            )}

                            {/* Status Text */}
                            {isUploaded && <Text style={styles.fileStatusText}>✓ Completed</Text>}
                            {isPending && <Text style={[styles.fileStatusText, { color: '#9E9E9E' }]}>• Queued</Text>}
                            {isError && <Text style={[styles.fileStatusText, { color: '#F44336' }]}>✕ Failed</Text>}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Statistics Grid (Not Uploading) */}
                  {!uploading && (
                    <View style={styles.statsGrid}>
                      <View style={[styles.statCard, { borderColor: '#9E9E9E' }]}>
                        <Text style={styles.statCardValue}>{selectedImages.filter(img => img.status === 'pending').length}</Text>
                        <Text style={styles.statCardLabel}>PENDING</Text>
                      </View>
                      <View style={[styles.statCard, { borderColor: '#4CAF50' }]}>
                        <Text style={styles.statCardValue}>{selectedImages.filter(img => img.status === 'uploaded').length}</Text>
                        <Text style={styles.statCardLabel}>UPLOADED</Text>
                      </View>
                      <View style={[styles.statCard, { borderColor: '#F44336' }]}>
                        <Text style={styles.statCardValue}>{selectedImages.filter(img => img.status === 'error').length}</Text>
                        <Text style={styles.statCardLabel}>FAILED</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </ScrollView>

        {/* RIGHT PANEL - Upload Browse (40%) with Scrolling */}
        <ScrollView style={styles.rightPanel} showsVerticalScrollIndicator={false}>
          <BlurView intensity={90} tint="light" style={styles.rightPanelBlur}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.98)']}
              style={styles.rightPanelGradient}
            >
              <Text style={styles.panelTitle}>📁 Upload Browse</Text>

              {/* Upload Statistics */}
              {uploading && totalBatches > 0 && (
                <View style={styles.statsCard}>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{currentBatch}</Text>
                      <Text style={styles.statLabel}>Batch</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{totalBatches}</Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{selectedImages.length}</Text>
                      <Text style={styles.statLabel}>Images</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Browse Files Button (File Manager) - ONLY OPTION for bulk uploads */}
              <TouchableOpacity
                onPress={pickFilesFromManager}
                disabled={uploading}
                style={[styles.browseButton, uploading && styles.buttonDisabled]}
              >
                <LinearGradient
                  colors={uploading ? ['#BDBDBD', '#9E9E9E'] : ['#FF6B35', '#F7931E', '#FDB833']}
                  style={styles.browseButtonGradient}
                >
                  <Text style={styles.browseButtonIcon}>📁</Text>
                  <Text style={styles.browseButtonText}>Browse Files</Text>
                  <Text style={styles.browseButtonSubtext}>Select from file manager (supports bulk)</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Selected Count */}
              {selectedImages.length > 0 && (
                <View style={styles.selectedCountCard}>
                  <Text style={styles.selectedCountText}>
                    📸 {selectedImages.length} images selected
                  </Text>
                  <Text style={styles.selectedBatchText}>
                    {Math.ceil(selectedImages.length / batchSize)} batches ({batchSize} per batch)
                  </Text>
                </View>
              )}

              {/* Clear All Button */}
              {selectedImages.length > 0 && !uploading && (
                <TouchableOpacity onPress={clearAll} style={styles.clearAllButton}>
                  <Text style={styles.clearAllButtonText}>🗑️ Clear All</Text>
                </TouchableOpacity>
              )}

              <View style={{ flex: 1 }} />

              {/* Upload Button */}
              {selectedImages.length > 0 && (
                <TouchableOpacity
                  onPress={uploadImages}
                  disabled={uploading}
                  style={[styles.uploadMainButton, uploading && styles.buttonDisabled]}
                >
                  <LinearGradient
                    colors={uploading ? ['#BDBDBD', '#9E9E9E'] : ['#00BFFF', '#1E90FF', '#0047AB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.uploadMainButtonGradient}
                  >
                    {uploading ? (
                      <>
                        <Text style={styles.uploadMainButtonIcon}>⏳</Text>
                        <Text style={styles.uploadMainButtonText}>Uploading...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.uploadMainButtonIcon}>🚀</Text>
                        <Text style={styles.uploadMainButtonText}>Upload {selectedImages.length} Images</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </BlurView>
        </ScrollView>
      </View>

      {/* Loading Overlay - Image Selection */}
      {loadingImages && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.loadingBlur}>
            <View style={styles.loadingContent}>
              <Animated.View style={[styles.loadingIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={['#00BFFF', '#1E90FF', '#0047AB']}
                  style={styles.loadingIconGradient}
                >
                  <Text style={styles.loadingIcon}>📸</Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.loadingTitle}>Loading Images...</Text>
              <Text style={styles.loadingSubtitle}>Processing selected images</Text>

              {/* Progress Bar */}
              <View style={styles.loadingProgressContainer}>
                <View style={styles.loadingProgressBg}>
                  <LinearGradient
                    colors={['#00BFFF', '#1E90FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.loadingProgressFill, { width: `${loadingProgress}%` }]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loadingShimmer}
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.loadingProgressText}>{loadingProgress}%</Text>
              </View>
            </View>
          </BlurView>
        </View>
      )}

      {/* Upload Progress Overlay - Detailed Progress like Flutter */}
      {uploading && (
        <View style={styles.uploadProgressOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.uploadProgressBlur}>
            <View style={styles.uploadProgressContent}>
              {/* Header Icon */}
              <Animated.View style={[styles.uploadIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A', '#81C784']}
                  style={styles.uploadIconGradient}
                >
                  <Text style={styles.uploadIcon}>🚀</Text>
                </LinearGradient>
              </Animated.View>

              <Text style={styles.uploadTitle}>Uploading Images...</Text>

              {/* Batch Info Card */}
              <View style={styles.batchInfoContainer}>
                <View style={styles.batchInfoRow}>
                  <View style={styles.batchInfoItem}>
                    <Text style={styles.batchInfoLabel}>Batch</Text>
                    <Text style={styles.batchInfoValue}>{currentBatch} / {totalBatches}</Text>
                  </View>
                  <View style={styles.batchInfoDivider} />
                  <View style={styles.batchInfoItem}>
                    <Text style={styles.batchInfoLabel}>Uploaded</Text>
                    <Text style={styles.batchInfoValue}>{uploadedCount} / {selectedImages.length}</Text>
                  </View>
                </View>
              </View>

              {/* Overall Progress Bar */}
              <View style={styles.uploadProgressBarContainer}>
                <View style={styles.uploadProgressBarBg}>
                  <LinearGradient
                    colors={['#4CAF50', '#66BB6A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.uploadProgressBarFill, { width: `${overallProgress}%` }]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.uploadProgressShimmer}
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.uploadProgressPercentage}>{Math.round(overallProgress)}%</Text>
              </View>

              {/* Current Uploading File */}
              {currentUploadingFile && (
                <View style={styles.currentFileContainer}>
                  <Text style={styles.currentFileLabel}>📤 Current File:</Text>
                  <Text style={styles.currentFileName} numberOfLines={1} ellipsizeMode="middle">
                    {currentUploadingFile}
                  </Text>
                </View>
              )}

              {/* Current Batch Files List */}
              {currentBatchFiles.length > 0 && (
                <View style={styles.batchFilesContainer}>
                  <Text style={styles.batchFilesTitle}>Current Batch Files ({currentBatchFiles.length}):</Text>
                  <ScrollView style={styles.batchFilesList} showsVerticalScrollIndicator={false}>
                    {currentBatchFiles.map((file) => {
                      const fileProgress = uploadProgress[file.id] || 0;
                      const fileStatus = file.status || 'pending';

                      return (
                        <View key={file.id} style={styles.batchFileItem}>
                          {/* Status Icon */}
                          <View style={styles.fileStatusIcon}>
                            {fileStatus === 'uploaded' && <Text style={styles.fileIconText}>✅</Text>}
                            {fileStatus === 'uploading' && (
                              <View style={styles.fileProgressCircle}>
                                <Text style={styles.fileProgressText}>{Math.round(fileProgress)}%</Text>
                              </View>
                            )}
                            {fileStatus === 'pending' && <Text style={styles.fileIconText}>⏳</Text>}
                            {fileStatus === 'error' && <Text style={styles.fileIconText}>❌</Text>}
                          </View>

                          {/* File Name */}
                          <Text style={styles.batchFileName} numberOfLines={1} ellipsizeMode="middle">
                            {file.fileName}
                          </Text>

                          {/* Progress Indicator */}
                          {fileStatus === 'uploading' && (
                            <View style={styles.fileProgressBar}>
                              <View style={[styles.fileProgressBarFill, { width: `${fileProgress}%` }]} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Status Message */}
              <Text style={styles.uploadStatusMessage}>
                Please wait while we upload your images in batches...
              </Text>
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f2ff',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
  },
  // Two Panel Layout
  twoPanelContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 6,
  },
  leftPanel: {
    flex: 1,
    paddingHorizontal: 6,
  },
  rightPanel: {
    flex: 1,
    paddingRight: 6,
  },
  rightPanelBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  rightPanelGradient: {
    flex: 1,
    padding: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0047AB',
  },
  emptyPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyPreviewText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyPreviewSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  // New Count Display Styles (NO thumbnails for performance)
  countDisplayContainer: {
    paddingVertical: 20,
  },
  totalCountCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  countIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  countNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 8,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBreakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusDot: {
    fontSize: 12,
    marginRight: 8,
  },
  statusCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
    minWidth: 40,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  batchInfoCard: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  batchInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  batchHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF8C00',
  },
  batchInfoSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  browseButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  browseButtonGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  browseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  browseButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  selectedCountCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0047AB',
    marginBottom: 4,
  },
  selectedBatchText: {
    fontSize: 11,
    color: '#1E90FF',
  },
  clearAllButton: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadMainButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadMainButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadMainButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  uploadMainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statsCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  statsGradient: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E90FF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#0047AB',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  clearButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  countCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.3)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0047AB',
    textAlign: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  imageCard: {
    width: (width * 0.6 - 40) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusIcon: {
    fontSize: 18,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBlur: {
    padding: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  removeButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  uploadButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  uploadButtonIcon: {
    fontSize: 24,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 60,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 32,
    textAlign: 'center',
  },
  loadingProgressContainer: {
    width: width - 80,
    alignItems: 'center',
  },
  loadingProgressBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgressFill: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingProgressText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  // Upload Progress Overlay Styles (like Flutter)
  uploadProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  uploadProgressBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  uploadIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  uploadIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 50,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  batchInfoContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  batchInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  batchInfoItem: {
    alignItems: 'center',
  },
  batchInfoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    fontWeight: '600',
  },
  batchInfoValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  batchInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  uploadProgressBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadProgressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressBarFill: {
    height: '100%',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  uploadProgressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  uploadProgressPercentage: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  currentFileContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  currentFileLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
    fontWeight: '600',
  },
  currentFileName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  batchFilesContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxHeight: 250,
  },
  batchFilesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  batchFilesList: {
    maxHeight: 200,
  },
  batchFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  fileStatusIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileIconText: {
    fontSize: 20,
  },
  fileProgressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30,144,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  batchFileName: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  fileProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 10,
  },
  fileProgressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  uploadStatusMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Menu Bar Styles
  topBarContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
    zIndex: 99,
  },
  topBarLeft: {
    flex: 3,
  },
  topBarRight: {
    flex: 1,
  },
  menuNavBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  menuNavScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  menuNavItem: {
    marginHorizontal: 2,
  },
  menuNavActiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuNavInactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    backgroundColor: 'transparent',
  },
  menuNavIconActive: {
    fontSize: 16,
  },
  menuNavIconInactive: {
    fontSize: 14,
    opacity: 0.6,
  },
  menuNavTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  menuNavTextInactive: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  dateTimeBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  dateTimeGradientCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  dateTimeColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeIcon: {
    fontSize: 12,
  },
  dateTimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
  },
  dateTimeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0047AB',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E90FF',
    textAlign: 'center',
  },
  // Futuristic Left Panel Styles
  leftPanelBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  leftPanelGradient: {
    flex: 1,
    padding: 16,
  },
  leftPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,191,255,0.2)',
  },
  droneIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  droneIcon: {
    fontSize: 32,
  },
  droneSignalPulse: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  leftPanelTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  leftPanelSubtitle: {
    fontSize: 10,
    color: '#00BFFF',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,191,255,0.3)',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0047AB',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#00BFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
  uploadContentContainer: {
    flex: 1,
  },
  overallProgressCard: {
    backgroundColor: 'rgba(0,191,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,191,255,0.2)',
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overallProgressLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0047AB',
    letterSpacing: 1,
  },
  overallProgressPercentage: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00BFFF',
    letterSpacing: 1,
  },
  futuristicProgressBar: {
    position: 'relative',
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
  },
  progressBarScanLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  progressBarGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,191,255,0.1)',
  },
  batchStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  batchStatusItem: {
    alignItems: 'center',
  },
  batchStatusLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00BFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  batchStatusValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0047AB',
    letterSpacing: 1,
  },
  batchStatusDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,191,255,0.2)',
  },
  fileListContainer: {
    marginBottom: 16,
  },
  fileListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,191,255,0.15)',
  },
  fileListTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0047AB',
    letterSpacing: 1,
  },
  fileListCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00BFFF',
    letterSpacing: 0.5,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,191,255,0.1)',
  },
  fileStatusIndicator: {
    marginRight: 12,
  },
  statusIconSuccess: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statusIconUploading: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,191,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00BFFF',
    position: 'relative',
  },
  uploadingPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,191,255,0.3)',
  },
  statusIconPending: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(158,158,158,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
  statusIconError: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statusIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  fileInfoContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0047AB',
    marginBottom: 6,
  },
  fileProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,191,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fileProgressFill: {
    height: '100%',
    position: 'relative',
  },
  fileProgressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  fileProgressText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00BFFF',
    letterSpacing: 0.5,
    minWidth: 35,
    textAlign: 'right',
  },
  fileStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00BFFF',
    letterSpacing: 0.5,
  },
});
