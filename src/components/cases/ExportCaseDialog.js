import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';

export default function ExportCaseDialog({
  visible,
  onClose,
  areas,
  onGenerateReport,
  onSendEmail
}) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [encodeBase64, setEncodeBase64] = useState(null); // For send email
  const [reportGenerated, setReportGenerated] = useState(false);

  // Prepare areas with "All Area" option
  const areasWithAll = [
    { area_code: '', name: 'All Area' },
    ...areas,
  ];

  // Initialize selectedArea with first area (All Area) when dialog opens
  useEffect(() => {
    if (visible && areasWithAll.length > 0 && !selectedArea) {
      console.log('[ExportCaseDialog] Initializing with first area:', areasWithAll[0]);
      setSelectedArea(areasWithAll[0]);
    }
  }, [visible, areas]);

  const handleClose = () => {
    setSelectedArea(null);
    setEncodeBase64(null);
    setReportGenerated(false);
    setIsGenerating(false);
    setIsSending(false);
    onClose();
  };

  const handleDownload = async () => {
    console.log('[ExportCaseDialog] handleDownload called, selectedArea:', selectedArea);

    if (!selectedArea) {
      console.error('[ExportCaseDialog] No area selected!');
      Alert.alert('Error', 'Please select an area first');
      return;
    }

    if (isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      console.log('[ExportCaseDialog] Generating report for area_code:', selectedArea.area_code);

      // Generate report
      const response = await onGenerateReport(selectedArea.area_code);
      console.log('[ExportCaseDialog] Generate report response:', response);

      if (response && response.reportUrl) {
        setEncodeBase64(response.encodeBase64); // Save for email
        setReportGenerated(true);
        console.log('[ExportCaseDialog] Report URL:', response.reportUrl);
        console.log('[ExportCaseDialog] Encode Base64:', response.encodeBase64);

        // Open PDF in browser
        await Linking.openURL(response.reportUrl);
        console.log('[ExportCaseDialog] PDF opened in browser');
      } else {
        throw new Error('Failed to generate report - no reportUrl returned');
      }
    } catch (error) {
      console.error('[ExportCaseDialog] Error generating/opening report:', error);
      Alert.alert('Error', `Failed to open report: ${error.message}`);

      // Reset states on error
      setEncodeBase64(null);
      setReportGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!encodeBase64) {
      Alert.alert('Error', 'Please generate the report first');
      return;
    }

    if (isSending) {
      return;
    }

    setIsSending(true);
    try {
      console.log('[ExportCaseDialog] Sending email with base64 data');
      await onSendEmail(encodeBase64); // Send base64 string, not URL
      Alert.alert('Success', 'Report sent via email successfully');
    } catch (error) {
      console.error('[ExportCaseDialog] Error sending email:', error);
      Alert.alert('Error', 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Case List</Text>
            <Text style={styles.modalDescription}>
              Generate and download case report as PDF
            </Text>

            {/* Area Selection */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Area:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedArea?.area_code}
                  onValueChange={(itemValue) => {
                    console.log('[ExportCaseDialog] Picker onValueChange, itemValue:', itemValue);
                    const area = areasWithAll.find((a) => a.area_code === itemValue);
                    console.log('[ExportCaseDialog] Found area:', area);
                    setSelectedArea(area);
                  }}
                  style={styles.picker}
                  dropdownIconColor="#0047AB"
                >
                  {areasWithAll.map((area) => (
                    <Picker.Item
                      key={area.area_code || area.id || 'all'}
                      label={area.name}
                      value={area.area_code}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {/* Download Button - Opens PDF in browser */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.downloadButton,
                  isGenerating && styles.disabledButton,
                ]}
                onPress={handleDownload}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionIcon}>📄</Text>
                    <Text style={styles.actionButtonText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Send Email Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.emailButton,
                  (!reportGenerated || isSending) && styles.disabledButton,
                ]}
                onPress={handleSendEmail}
                disabled={!reportGenerated || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionIcon}>✉</Text>
                    <Text style={styles.actionButtonText}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Status Indicator */}
            {reportGenerated && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusIcon}>✓</Text>
                <Text style={styles.statusText}>Report generated successfully</Text>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
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
    width: '90%',
    maxWidth: 450,
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
  actionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  downloadButton: {
    backgroundColor: '#2196F3',
  },
  emailButton: {
    backgroundColor: '#4CAF50',
  },
  openButton: {
    backgroundColor: '#FF9800',
  },
  actionIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  closeButton: {
    paddingVertical: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
});
