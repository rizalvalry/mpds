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

export default function BulkValidateDialog({
  visible,
  onClose,
  workers,
  areas,
  onBulkValidate
}) {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkValidate = async () => {
    if (!selectedWorker) {
      Alert.alert('Error', 'Please select a worker first');
      return;
    }

    if (selectedAreas.length === 0) {
      Alert.alert('Error', 'Please select at least one area');
      return;
    }

    setIsLoading(true);
    try {
      // statusId = 2 untuk Bulk Validate (Progress)
      await onBulkValidate(selectedWorker, selectedAreas, 2);
      setSelectedWorker(null);
      setSelectedAreas([]);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to bulk validate cases');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAreaSelection = (areaCode) => {
    setSelectedAreas((prev) => {
      if (prev.includes(areaCode)) {
        return prev.filter((code) => code !== areaCode);
      } else {
        return [...prev, areaCode];
      }
    });
  };

  const handleCancel = () => {
    setSelectedWorker(null);
    setSelectedAreas([]);
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
              <Text style={styles.modalTitle}>Bulk Validate Cases</Text>
              <Text style={styles.modalDescription}>
                Select worker and areas to bulk validate cases (Status: Validated)
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

              {/* Area Selection */}
              <View style={styles.areaContainer}>
                <View style={styles.areaHeaderRow}>
                  <Text style={styles.pickerLabel}>Select Areas:</Text>
                  <Text style={styles.areaCount}>
                    {selectedAreas.length} of {areas?.length || 0} selected
                  </Text>
                </View>
                <Text style={styles.areaHint}>
                  Choose one or more areas to validate
                </Text>
                <ScrollView
                  style={styles.areaScrollContainer}
                  contentContainerStyle={styles.areaCheckboxContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {areas && areas.map((area) => (
                    <TouchableOpacity
                      key={area.id}
                      style={[
                        styles.checkboxItem,
                        selectedAreas.includes(area.area_code) && styles.checkboxItemSelected
                      ]}
                      onPress={() => toggleAreaSelection(area.area_code)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        selectedAreas.includes(area.area_code) && styles.checkboxChecked
                      ]}>
                        {selectedAreas.includes(area.area_code) && (
                          <Text style={styles.checkboxIcon}>✓</Text>
                        )}
                      </View>
                      <Text style={[
                        styles.checkboxLabel,
                        selectedAreas.includes(area.area_code) && styles.checkboxLabelSelected
                      ]}>
                        {area.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Status Info */}
              <View style={styles.statusInfoContainer}>
                <Text style={styles.statusInfoIcon}>ℹ️</Text>
                <Text style={styles.statusInfoText}>
                  Cases will be set to status: <Text style={styles.statusInfoBold}>Progress (ID: 2)</Text>
                </Text>
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
                    styles.validateButton,
                    (isLoading || !selectedWorker || selectedAreas.length === 0) && styles.disabledButton,
                  ]}
                  onPress={handleBulkValidate}
                  disabled={isLoading || !selectedWorker || selectedAreas.length === 0}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.validateButtonIcon}>✓</Text>
                      <Text style={styles.validateButtonText}>Bulk Validate</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
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
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#00D9FF',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  areaContainer: {
    marginBottom: 20,
  },
  areaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00D9FF',
  },
  areaHint: {
    fontSize: 11,
    color: '#999',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  areaScrollContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  areaCheckboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 6,
    minWidth: '30%',
    maxWidth: '32%',
    flexBasis: '30%',
  },
  checkboxItemSelected: {
    backgroundColor: '#E0F7FF',
    borderColor: '#00D9FF',
    borderWidth: 1.5,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#00D9FF',
    borderRadius: 3,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#00D9FF',
    borderColor: '#00D9FF',
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  checkboxLabelSelected: {
    color: '#00BAFF',
    fontWeight: '600',
  },
  statusInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00EBFF',
  },
  statusInfoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  statusInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#006B7D',
    lineHeight: 18,
  },
  statusInfoBold: {
    fontWeight: '700',
    color: '#004D5C',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  validateButton: {
    backgroundColor: '#00D9FF',
    flexDirection: 'row',
  },
  validateButtonIcon: {
    fontSize: 16,
    marginRight: 6,
    color: '#fff',
  },
  validateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
