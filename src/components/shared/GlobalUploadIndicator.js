import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUpload } from '../../contexts/UploadContext';

export default function GlobalUploadIndicator() {
  const { isUploading, currentBatch, totalBatches, batchProgress } = useUpload();

  if (!isUploading) return null;

  const batchIndex = currentBatch - 1;
  const currentBatchProgress = batchProgress[batchIndex] || 0;

  return (
    <View style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 9999,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color="#F59E0B" size="small" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>
            Uploading...
          </Text>
          <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
            Batch {currentBatch}/{totalBatches} • {currentBatchProgress}%
          </Text>
        </View>
      </View>
      
      {/* Mini Progress Bar */}
      <View style={{
        width: '100%',
        height: 3,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
      }}>
        <View style={{
          width: `${currentBatchProgress}%`,
          height: '100%',
          backgroundColor: '#F59E0B',
        }} />
      </View>
    </View>
  );
}


