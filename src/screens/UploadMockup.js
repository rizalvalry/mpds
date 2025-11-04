import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useUpload } from '../contexts/UploadContext';

const { width } = Dimensions.get('window');

export default function UploadMockup({ session, setActiveMenu }) {
  const { isUploading, currentBatch, totalBatches, batchProgress, startUpload, BATCH_SIZE } = useUpload();
  const [selectedImages, setSelectedImages] = useState([]);

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

      // Start upload via context (runs in background)
      const result = await startUpload(selectedImages);

      // Success
      const successCount = result.summary.success;
      const errorCount = result.summary.error;

      Alert.alert(
        errorCount === 0 ? 'Upload Berhasil! ✅' : 'Upload Selesai dengan Error ⚠️',
        `${successCount} gambar berhasil diupload${errorCount > 0 ? `\n${errorCount} gambar gagal diupload` : ''}.\n\nGambar akan segera diproses oleh AI untuk deteksi bird drops.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedImages([]);
            }
          }
        ]
      );
    } catch (error) {
      console.error('[Upload] Error:', error);
      Alert.alert('Upload Failed', `Gagal mengupload gambar:\n${error.message || error}`);
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
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header - PERSIS seperti upload-menu.png */}
      <LinearGradient
        colors={['#1E9BE9', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#FFFFFF' }}>
            Upload Images
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
            Batch Upload - 8 images per batch
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>📷</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {session?.drone?.drone_code || 'Drone-001'}
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>🕐</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Navigation Bar - PERSIS seperti mockup */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <TouchableOpacity
          onPress={() => setActiveMenu('dashboard')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Dashboard</Text>
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
          onPress={() => setActiveMenu('cases')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Cases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMenu('monitoring')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Monitoring</Text>
        </TouchableOpacity>
      </View>

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
          {/* LEFT PANEL: File List (No Thumbnails) */}
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
                  backgroundColor: '#0EA5E9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>📷</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                    DRONE AI UPLOAD
                  </Text>
                  <Text style={{ fontSize: 14, color: '#0EA5E9' }}>
                    {selectedImages.length} files selected
                  </Text>
                </View>
              </View>
              
              {/* Clear All Button */}
              {selectedImages.length > 0 && !isUploading && (
                <TouchableOpacity
                  onPress={clearAllImages}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626' }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* File List (Text Only - Show Current Batch ONLY) */}
            <ScrollView style={{ flex: 1 }}>
              {selectedImages.length > 0 ? (
                (() => {
                  // Determine which batch to show
                  const batchToShow = isUploading ? currentBatch - 1 : 0; // Show batch 1 when idle, current batch when uploading
                  const startIndex = batchToShow * BATCH_SIZE;
                  const endIndex = Math.min(startIndex + BATCH_SIZE, selectedImages.length);
                  const currentBatchFiles = selectedImages.slice(startIndex, endIndex);
                  const batchNumber = batchToShow + 1;
                  const currentBatchProgress = batchProgress[batchToShow] || 0;

                  return (
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
                            Batch {batchNumber} of {Math.ceil(selectedImages.length / BATCH_SIZE)}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            {currentBatchFiles.length} files {isUploading && `• ${currentBatchProgress}% complete`}
                          </Text>
                        </View>
                        {isUploading && (
                          <View style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor: '#FEF3C7',
                          }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>
                              Uploading...
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Current Batch Files (Max 5) */}
                      {currentBatchFiles.map((image, idx) => {
                        const absoluteIndex = startIndex + idx;
                        const isCurrentlyUploading = isUploading;
                        const progress = currentBatchProgress;

                        return (
                          <View
                            key={image.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 12,
                              marginBottom: 8,
                              backgroundColor: isCurrentlyUploading ? '#FEF3C7' : '#F9FAFB',
                              borderRadius: 8,
                              borderLeftWidth: 4,
                              borderLeftColor: isCurrentlyUploading ? '#F59E0B' : '#E5E7EB',
                            }}
                          >
                            {/* Icon */}
                            <Text style={{ fontSize: 20, marginRight: 12 }}>
                              {isCurrentlyUploading ? '⏳' : '📄'}
                            </Text>

                            {/* File Info */}
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937', flex: 1 }} numberOfLines={1}>
                                  {image.fileName}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>
                                  #{absoluteIndex + 1}
                                </Text>
                              </View>
                              
                              <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                {formatFileSize(image.fileSize)}
                              </Text>
                            </View>

                            {/* Remove Button */}
                            {!isUploading && (
                              <TouchableOpacity
                                onPress={() => removeImage(image.id)}
                                style={{
                                  marginLeft: 12,
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
                            )}
                          </View>
                        );
                      })}

                      {/* Batch Progress Bar */}
                      {isUploading && (
                        <View style={{
                          marginTop: 12,
                          padding: 16,
                          backgroundColor: '#F3F4F6',
                          borderRadius: 8,
                        }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>
                              Batch Progress
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>
                              {currentBatchProgress}%
                            </Text>
                          </View>
                          <View style={{
                            width: '100%',
                            height: 6,
                            backgroundColor: '#E5E7EB',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}>
                            <View style={{
                              width: `${currentBatchProgress}%`,
                              height: '100%',
                              backgroundColor: '#F59E0B',
                            }} />
                          </View>
                        </View>
                      )}
                    </>
                  );
                })()
              ) : (
                /* Empty State */
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 60,
                }}>
                  <Text style={{ fontSize: 64, opacity: 0.2 }}>⬆️</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 }}>
                    Preview Mode
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                    Select images to initialize upload sequence
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* RIGHT PANEL: Browse File Button */}
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
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 }}>
                Pilih dari pengelola file (multiple files support)
              </Text>
            </TouchableOpacity>

            {/* Batch Info */}
            <View style={{
              marginTop: 40,
              padding: 16,
              backgroundColor: '#F3F4F6',
              borderRadius: 8,
              width: '100%',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
                📦 Batch Upload System
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>
                • {BATCH_SIZE} images per batch{'\n'}
                • Batches processed sequentially{'\n'}
                • Files in batch upload in parallel{'\n'}
                • Fast & efficient processing
              </Text>
            </View>
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
