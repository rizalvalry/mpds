import React, { useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Animated, PanResponder, Dimensions } from 'react-native';
import { useUpload } from '../../contexts/UploadContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlobalUploadIndicator() {
  const { isUploading, currentBatch, totalBatches, batchProgress, uploadStats } = useUpload();

  // Draggable position state
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 220, y: 10 })).current;
  const [isDragging, setIsDragging] = useState(false);

  // PanResponder for drag functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        setIsDragging(false);
        pan.flattenOffset();

        // Keep widget within screen bounds
        const newX = Math.max(0, Math.min(SCREEN_WIDTH - 200, pan.x._value));
        const newY = Math.max(0, Math.min(SCREEN_HEIGHT - 100, pan.y._value));

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  if (!isUploading) return null;

  const batchIndex = currentBatch - 1;
  const currentBatchProgress = batchProgress[batchIndex] || 0;
  const overallProgress = uploadStats.total > 0
    ? Math.round((uploadStats.success / uploadStats.total) * 100)
    : 0;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        zIndex: 9999,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDragging ? 0.35 : 0.2,
        shadowRadius: isDragging ? 12 : 8,
        elevation: isDragging ? 12 : 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      {/* Drag Handle Indicator */}
      <View style={{
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}>
        <View style={{
          width: 40,
          height: 4,
          backgroundColor: '#E5E7EB',
          borderRadius: 2,
        }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <ActivityIndicator color="#F59E0B" size="small" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>
            Uploading...
          </Text>
          <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
            Batch {currentBatch}/{totalBatches} • {uploadStats.success}/{uploadStats.total} files
          </Text>
        </View>
      </View>

      {/* Mini Progress Bar */}
      <View style={{
        width: '100%',
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
      }}>
        <View style={{
          width: `${overallProgress}%`,
          height: '100%',
          backgroundColor: '#F59E0B',
        }} />
      </View>

      {/* Drag hint text */}
      <Text style={{
        fontSize: 9,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 6,
      }}>
        Drag to move
      </Text>
    </Animated.View>
  );
}





















