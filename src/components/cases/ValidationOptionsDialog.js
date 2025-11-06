import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';

export default function ValidationOptionsDialog({ visible, onClose, onConfirm, caseName }) {
  const handleConfirm = () => {
    onConfirm(4); // Status ID 4 for Confirmed/True Detection
  };

  const handleFalseDetection = () => {
    onConfirm(5); // Status ID 5 for False Detection
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Validate Case</Text>
            <Text style={styles.modalDescription}>
              Please confirm the validation status for this case
            </Text>

            {/* Confirmed Button */}
            <TouchableOpacity
              style={[styles.optionButton, styles.confirmedButton]}
              onPress={handleConfirm}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>✓</Text>
                <Text style={styles.optionText}>Confirmed</Text>
              </View>
              <Text style={styles.optionDescription}>
                True detection - Case is valid
              </Text>
            </TouchableOpacity>

            {/* False Detection Button */}
            <TouchableOpacity
              style={[styles.optionButton, styles.falseButton]}
              onPress={handleFalseDetection}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>✕</Text>
                <Text style={styles.optionText}>False Detection</Text>
              </View>
              <Text style={styles.optionDescription}>
                False detection - Case is invalid
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  optionButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  confirmedButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  falseButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
    fontWeight: '700',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 36,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
});
