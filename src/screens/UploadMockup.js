import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useUpload } from '../contexts/UploadContext';
import DynamicHeader from '../components/shared/DynamicHeader';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function UploadMockup({
  session,
  setActiveMenu,
  setSession,
  embedded = false,
  onNavigate,
}) {
  const {
    isUploading,
    currentBatch,
    totalBatches,
    batchProgress,
    uploadStats,
    fileProgress,
    uploadedFiles,
    startUpload,
    clearUploadHistory,
    BATCH_SIZE
  } = useUpload();
  const [selectedImages, setSelectedImages] = useState([]);
  const { theme, isDarkMode } = useTheme();

  // Determine what to show in preview panel
  const hasUploadHistory = uploadedFiles.length > 0;
  const showUploadProgress = isUploading || hasUploadHistory;

  const handleNavigate = (target) => {
    if (embedded) {
      onNavigate && onNavigate(target);
    } else if (setActiveMenu) {
      setActiveMenu(target);
    }
  };

  // Pick files using document picker
  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || !result.canceled) {
        const files = result.assets || [result];
        const newImages = files.map((file, index) => ({
          id: Date.now() + index,
          uri: file.uri,
          fileName: file.name,
          type: file.mimeType || 'image/jpeg',
          size: file.size || 0,
          fileSize: file.size || 0,
        }));

        setSelectedImages(prev => [...prev, ...newImages]);
        console.log(`[Upload] ${newImages.length} files selected`);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Gagal memilih file. Silakan coba lagi.');
    }
  };

  // Remove image from selection
  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Clear all images
  const clearAllImages = () => {
    Alert.alert(
      'Clear All Images',
      'Apakah Anda yakin ingin menghapus semua gambar yang dipilih?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: () => setSelectedImages([])
        }
      ]
    );
  };

  // Upload images with batch system (5 images per batch)
  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Pilih gambar terlebih dahulu sebelum upload.');
      return;
    }

    try {
      console.log(`[Upload] Starting upload via context: ${selectedImages.length} images`);

      // FIX: Start upload via context - errors will be caught early
      // Pass session to createUploadDetails for Monitoring screen
      const result = await startUpload(selectedImages, session);

      // Success
      const successCount = result.summary.success;
      const errorCount = result.summary.error;

      // Only show success alert if there are no errors
      if (errorCount === 0) {
        Alert.alert(
          'Upload Berhasil! ✅',
          `${successCount} gambar berhasil diupload.\n\nGambar akan segera diproses oleh AI untuk deteksi bird drops.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedImages([]);
              }
            }
          ]
        );
      } else {
        // Show error alert if some files failed
        Alert.alert(
          'Upload Selesai dengan Error ⚠️',
          `${successCount} gambar berhasil diupload\n${errorCount} gambar gagal diupload.\n\nSilakan coba upload ulang file yang gagal.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Keep failed images in selection for retry
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('[Upload] Error:', error);
      // FIX: Show detailed error message immediately
      const errorMessage = error.message || error.toString();
      Alert.alert(
        'Upload Gagal ❌',
        `Gagal mengupload gambar:\n\n${errorMessage}\n\nSilakan periksa:\n• Koneksi internet Anda\n• Endpoint server tersedia\n• Format file yang diupload`,
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {!embedded && (
        <DynamicHeader
          title="Upload Images"
          subtitle="Batch Upload - 8 images per batch"
          session={session}
          setSession={setSession}
        />
      )}

      {!embedded && (
        <View style={{
          backgroundColor: theme.card,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderBottomWidth: isDarkMode ? 1 : 0,
          borderColor: theme.border,
        }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12, width }}>
            <TouchableOpacity
              onPress={() => handleNavigate('dashboard')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📊</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Dashboard</Text>
            </TouchableOpacity>

            <View style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: '#0EA5E9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: '#0EA5E9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <Text style={{ fontSize: 18 }}>⬆️</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Upload</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleNavigate('cases')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📋</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Cases</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNavigate('monitoring')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📹</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Monitoring</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => handleNavigate('documentations')}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginLeft: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>📚</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Documentations</Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      )}

      {/* Content - Dual Panel Layout */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {/* Batch Upload Info */}
        {isUploading && totalBatches > 0 && (
          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B',
          }}>
            <ActivityIndicator color="#F59E0B" size="small" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>
                Processing Batch {currentBatch} of {totalBatches}
              </Text>
              <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
                Files uploading in parallel • You can navigate to other tabs
              </Text>
            </View>
          </View>
        )}

        {/* Dual Panel Layout */}
        <View style={{ flexDirection: width > 600 ? 'row' : 'column', gap: 16 }}>
          {/* LEFT PANEL: Browse File Button */}
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            minHeight: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <TouchableOpacity
              onPress={pickFiles}
              disabled={isUploading}
              style={{
                alignItems: 'center',
                opacity: isUploading ? 0.5 : 1,
              }}
            >
              <View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}>
                <Text style={{ fontSize: 56 }}>📄</Text>
                <View style={{
                  position: 'absolute',
                  bottom: 5,
                  right: 5,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#0EA5E9',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}>
                  <Text style={{ fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' }}>+</Text>
                </View>
              </View>

              <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>
                Browse File
              </Text>
            </TouchableOpacity>

          </View>

          {/* RIGHT PANEL: File List with Progress */}
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            minHeight: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: showUploadProgress ? '#10B981' : '#0EA5E9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>{showUploadProgress ? '⬆️' : '📷'}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                    {showUploadProgress ? 'Upload Progress' : 'Upload Preview'}
                  </Text>
                  <Text style={{ fontSize: 14, color: showUploadProgress ? '#10B981' : '#0EA5E9' }}>
                    {showUploadProgress
                      ? `${uploadStats.success}/${uploadStats.total} completed`
                      : `${selectedImages.length} files selected`
                    }
                  </Text>
                </View>
              </View>

              {/* Clear/Reset Button */}
              {!isUploading && (
                <TouchableOpacity
                  onPress={() => {
                    if (hasUploadHistory) {
                      clearUploadHistory();
                    } else if (selectedImages.length > 0) {
                      clearAllImages();
                    }
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: hasUploadHistory ? '#E0F2FE' : '#FEE2E2',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: hasUploadHistory ? '#0369A1' : '#DC2626'
                  }}>
                    {hasUploadHistory ? 'New Upload' : 'Clear All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* File List with Progress Indicators */}
            <ScrollView style={{ flex: 1 }}>
              {showUploadProgress ? (
                /* UPLOAD PROGRESS VIEW - Shows all uploaded files with individual status */
                <>
                  {/* Overall Progress Summary */}
                  <View style={{
                    backgroundColor: isUploading ? '#FEF3C7' : '#D1FAE5',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: isUploading ? '#F59E0B' : '#10B981',
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isUploading ? '#92400E' : '#065F46' }}>
                        {isUploading
                          ? `Uploading Batch ${currentBatch} of ${totalBatches}...`
                          : `Upload Complete`
                        }
                      </Text>
                      {isUploading && <ActivityIndicator color="#F59E0B" size="small" />}
                    </View>
                    <View style={{
                      width: '100%',
                      height: 8,
                      backgroundColor: isUploading ? '#FDE68A' : '#A7F3D0',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        width: `${uploadStats.total > 0 ? (uploadStats.success / uploadStats.total) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: isUploading ? '#F59E0B' : '#10B981',
                      }} />
                    </View>
                    <Text style={{ fontSize: 11, color: isUploading ? '#92400E' : '#065F46', marginTop: 6 }}>
                      {uploadStats.success} of {uploadStats.total} files uploaded
                      {uploadStats.error > 0 && ` • ${uploadStats.error} errors`}
                    </Text>
                  </View>

                  {/* Individual File Progress */}
                  {uploadedFiles.map((file, index) => {
                    const progress = fileProgress[file.id] || { progress: 0, status: 'pending', fileName: file.fileName };
                    const getStatusIcon = () => {
                      switch (progress.status) {
                        case 'completed': return '✓';
                        case 'uploading': return '↑';
                        case 'error': return '✕';
                        default: return '○';
                      }
                    };
                    const getStatusColor = () => {
                      switch (progress.status) {
                        case 'completed': return '#10B981';
                        case 'uploading': return '#F59E0B';
                        case 'error': return '#EF4444';
                        default: return '#9CA3AF';
                      }
                    };
                    const getBgColor = () => {
                      switch (progress.status) {
                        case 'completed': return '#D1FAE5';
                        case 'uploading': return '#FEF3C7';
                        case 'error': return '#FEE2E2';
                        default: return '#F9FAFB';
                      }
                    };

                    return (
                      <View
                        key={file.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          marginBottom: 6,
                          backgroundColor: getBgColor(),
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: getStatusColor(),
                        }}
                      >
                        {/* Status Icon */}
                        <View style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: getStatusColor(),
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' }}>
                            {getStatusIcon()}
                          </Text>
                        </View>

                        {/* File Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }} numberOfLines={1}>
                            {file.fileName}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            {progress.status === 'uploading' && (
                              <>
                                <View style={{
                                  flex: 1,
                                  height: 4,
                                  backgroundColor: '#E5E7EB',
                                  borderRadius: 2,
                                  marginRight: 8,
                                }}>
                                  <View style={{
                                    width: `${progress.progress}%`,
                                    height: '100%',
                                    backgroundColor: '#F59E0B',
                                    borderRadius: 2,
                                  }} />
                                </View>
                                <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>
                                  {progress.progress}%
                                </Text>
                              </>
                            )}
                            {progress.status === 'completed' && (
                              <Text style={{ fontSize: 10, color: '#10B981' }}>Uploaded</Text>
                            )}
                            {progress.status === 'error' && (
                              <Text style={{ fontSize: 10, color: '#EF4444' }}>Failed</Text>
                            )}
                            {progress.status === 'pending' && (
                              <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Waiting...</Text>
                            )}
                          </View>
                        </View>

                        {/* File Number */}
                        <Text style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 8 }}>
                          #{index + 1}
                        </Text>
                      </View>
                    );
                  })}
                </>
              ) : selectedImages.length > 0 ? (
                /* SELECTION PREVIEW VIEW - Shows selected files before upload */
                <>
                  {/* Batch Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottomWidth: 2,
                    borderBottomColor: '#E5E7EB',
                  }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>
                        {Math.ceil(selectedImages.length / BATCH_SIZE)} Batches Ready
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {selectedImages.length} files • {BATCH_SIZE} per batch
                      </Text>
                    </View>
                  </View>

                  {/* Selected Files */}
                  {selectedImages.map((image, idx) => (
                    <View
                      key={image.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        marginBottom: 6,
                        backgroundColor: '#F9FAFB',
                        borderRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: '#E5E7EB',
                      }}
                    >
                      <Text style={{ fontSize: 20, marginRight: 12 }}>📄</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }} numberOfLines={1}>
                          {image.fileName}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                          {formatFileSize(image.fileSize)} • Batch {Math.floor(idx / BATCH_SIZE) + 1}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeImage(image.id)}
                        style={{
                          marginLeft: 8,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: '#FEE2E2',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: 'bold' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                /* Empty State */
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 60,
                }}>
                  <Text style={{ fontSize: 64, opacity: 0.2 }}>⬆️</Text>
                  <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12 }}>
                    Select files to upload
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Upload Button (Below Both Panels) */}
        {selectedImages.length > 0 && !isUploading && (
          <TouchableOpacity
            onPress={uploadImages}
            style={{
              backgroundColor: '#10B981',
              paddingVertical: 18,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 24,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 24 }}>⬆️</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              Upload {selectedImages.length} Gambar ({Math.ceil(selectedImages.length / BATCH_SIZE)} Batch)
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Banner */}
        <View style={{
          backgroundColor: '#E0F2FE',
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
          flexDirection: 'row',
          gap: 12,
          borderLeftWidth: 4,
          borderLeftColor: '#0EA5E9',
        }}>
          <Text style={{ fontSize: 20 }}>ℹ️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0369A1', marginBottom: 4 }}>
              Upload Information
            </Text>
            <Text style={{ fontSize: 12, color: '#0369A1', lineHeight: 18 }}>
              • Format: JPG, JPEG, PNG{'\n'}
              • Batch size: {BATCH_SIZE} images per batch{'\n'}
              • Gambar akan diproses AI untuk deteksi bird drops{'\n'}
              • Hasil dapat dilihat di menu Cases
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
