import React, { useState } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ExportCaseDialog({
  visible,
  onClose,
  areas,
  onGenerateReport,
  onSendEmail
}) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState(null);

  const handleClose = () => {
    setSelectedArea(null);
    setReportUrl(null);
    setDownloadedFilePath(null);
    setIsGenerating(false);
    setIsDownloading(false);
    setIsSending(false);
    onClose();
  };

  const handleDownload = async () => {
    if (!selectedArea) {
      Alert.alert('Error', 'Please select an area first');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate report
      const response = await onGenerateReport(selectedArea.code);

      if (response && response.reportUrl) {
        setReportUrl(response.reportUrl);

        // Download PDF
        setIsDownloading(true);
        const fileName = `case_report_${selectedArea.code}_${Date.now()}.pdf`;
        const fileUri = FileSystem.documentDirectory + fileName;

        const downloadResult = await FileSystem.downloadAsync(
          response.reportUrl,
          fileUri
        );

        if (downloadResult.status === 200) {
          setDownloadedFilePath(downloadResult.uri);
          Alert.alert('Success', 'Report downloaded successfully');
        } else {
          throw new Error('Download failed');
        }
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('[ExportCaseDialog] Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    } finally {
      setIsGenerating(false);
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!reportUrl) {
      Alert.alert('Error', 'Please download the report first');
      return;
    }

    setIsSending(true);
    try {
      await onSendEmail(reportUrl);
      Alert.alert('Success', 'Report sent via email successfully');
    } catch (error) {
      console.error('[ExportCaseDialog] Error sending email:', error);
      Alert.alert('Error', 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenFile = async () => {
    if (!downloadedFilePath) {
      Alert.alert('Error', 'Please download the report first');
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloadedFilePath);
      } else {
        Alert.alert('Info', 'File saved to: ' + downloadedFilePath);
      }
    } catch (error) {
      console.error('[ExportCaseDialog] Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  // Prepare areas with "All Area" option
  const areasWithAll = [
    { code: '', name: 'All Area' },
    ...areas,
  ];

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
                  selectedValue={selectedArea?.code}
                  onValueChange={(itemValue) => {
                    const area = areasWithAll.find((a) => a.code === itemValue);
                    setSelectedArea(area);
                  }}
                  style={styles.picker}
                  dropdownIconColor="#0047AB"
                >
                  {areasWithAll.map((area) => (
                    <Picker.Item
                      key={area.code || 'all'}
                      label={area.name}
                      value={area.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {/* Download Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.downloadButton,
                  (isGenerating || isDownloading) && styles.disabledButton,
                ]}
                onPress={handleDownload}
                disabled={isGenerating || isDownloading}
              >
                {isGenerating || isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionIcon}>⬇</Text>
                    <Text style={styles.actionButtonText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Send Email Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.emailButton,
                  (!reportUrl || isSending) && styles.disabledButton,
                ]}
                onPress={handleSendEmail}
                disabled={!reportUrl || isSending}
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

              {/* Open File Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.openButton,
                  !downloadedFilePath && styles.disabledButton,
                ]}
                onPress={handleOpenFile}
                disabled={!downloadedFilePath}
              >
                <Text style={styles.actionIcon}>📄</Text>
                <Text style={styles.actionButtonText}>Open</Text>
              </TouchableOpacity>
            </View>

            {/* Status Indicator */}
            {downloadedFilePath && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusIcon}>✓</Text>
                <Text style={styles.statusText}>Report downloaded</Text>
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
