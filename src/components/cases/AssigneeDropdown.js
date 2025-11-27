import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AssigneeDropdown({ currentWorker, workers, onWorkerChange, disabled = false }) {
  // Safe check for workers array
  const safeWorkers = Array.isArray(workers) ? workers : [];

  // Local state to track selected worker
  const [selectedWorker, setSelectedWorker] = useState(currentWorker || null);
  const [modalVisible, setModalVisible] = useState(false);

  // Sync local state when currentWorker prop changes
  useEffect(() => {
    setSelectedWorker(currentWorker || null);
  }, [currentWorker]);

  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    setModalVisible(false);
    if (worker && onWorkerChange) {
      onWorkerChange(worker);
    }
  };

  // Get display text
  const displayText = selectedWorker?.fullname || 'Assign To';
  const isPlaceholder = !selectedWorker;

  return (
    <View style={styles.container}>
      {/* Dropdown Button */}
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.disabled,
          selectedWorker && styles.dropdownButtonSelected,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text
          style={[
            styles.dropdownText,
            isPlaceholder && styles.placeholderText,
            selectedWorker && styles.selectedText,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayText}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Worker</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Worker List */}
            <FlatList
              data={safeWorkers}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.workerItem,
                    selectedWorker?.id === item.id && styles.workerItemSelected,
                  ]}
                  onPress={() => handleSelectWorker(item)}
                >
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerAvatarText}>
                      {item.fullname?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.workerName,
                      selectedWorker?.id === item.id && styles.workerNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.fullname}
                  </Text>
                  {selectedWorker?.id === item.id && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No workers available</Text>
                </View>
              }
              showsVerticalScrollIndicator={true}
              style={styles.workerList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 38,
  },
  dropdownButtonSelected: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    marginRight: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  selectedText: {
    color: '#0369A1',
    fontWeight: '600',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#0047AB',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  workerList: {
    maxHeight: 350,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  workerItemSelected: {
    backgroundColor: '#E0F2FE',
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workerName: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  workerNameSelected: {
    fontWeight: '600',
    color: '#0369A1',
  },
  checkIcon: {
    fontSize: 18,
    color: '#0EA5E9',
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
