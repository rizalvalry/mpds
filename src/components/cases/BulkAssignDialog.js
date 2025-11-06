import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';

export default function BulkAssignDialog({ visible, onClose, workers, onBulkAssign }) {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkAssign = async () => {
    if (!selectedWorker) {
      Alert.alert('Error', 'Please select a worker first');
      return;
    }

    setIsLoading(true);
    try {
      await onBulkAssign(selectedWorker);
      setSelectedWorker(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign workers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedWorker(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bulk Assign Workers</Text>
            <Text style={styles.modalDescription}>
              Assign all unassigned cases to a worker
            </Text>

            {/* Worker Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Worker:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedWorker}
                  onValueChange={(itemValue) => setSelectedWorker(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#0047AB"
                >
                  <Picker.Item label="-- Select Worker --" value={null} />
                  {workers.map((worker) => (
                    <Picker.Item
                      key={worker.id}
                      label={worker.fullname}
                      value={worker.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.assignButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={handleBulkAssign}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.assignButtonText}>Bulk Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 24,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  assignButton: {
    backgroundColor: '#1E90FF',
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
