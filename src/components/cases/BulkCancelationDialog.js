import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';

export default function BulkCancelationDialog({
  visible,
  onClose,
  areas,
  onBulkCancelation
}) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkCancelation = async () => {
    if (!selectedArea) {
      Alert.alert('Error', 'Please select an area first');
      return;
    }

    setIsLoading(true);
    try {
      // statusId = 1 untuk Cancelation (Not Started)
      await onBulkCancelation(selectedArea, 1);
      setSelectedArea(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to cancel area block');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedArea(null);
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cancel Area Block</Text>
              <Text style={styles.modalDescription}>
                Select area to cancel all cases in the block (Status: Not Started)
              </Text>

              {/* Warning Info */}
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>Warning</Text>
                  <Text style={styles.warningText}>
                    This will reset all cases in the selected area to "Not Started" status.
                  </Text>
                </View>
              </View>

              {/* Area Picker */}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select Area:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedArea}
                    onValueChange={(itemValue) => setSelectedArea(itemValue)}
                    style={styles.picker}
                    dropdownIconColor="#EF4444"
                  >
                    <Picker.Item label="-- Select Area --" value={null} />
                    {areas.map((area) => (
                      <Picker.Item
                        key={area.id}
                        label={`${area.name} (${area.area_code})`}
                        value={area.area_code}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Status Info */}
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Target Status:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Not Started (ID: 1)</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={[styles.button, styles.cancelButton]}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleBulkCancelation}
                  style={[styles.button, styles.submitButton]}
                  disabled={isLoading || !selectedArea}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonIcon}>✖</Text>
                      <Text style={styles.submitButtonText}>Cancel Block</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  },
  modalBlur: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warningIcon: {
    fontSize: 20,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  statusBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  statusBadge: {
    backgroundColor: '#FBBF24',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
