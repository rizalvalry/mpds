import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { MockupHeader } from '../components/mockup/MockupHeader';
import { MockupNavigation } from '../components/mockup/MockupNavigation';
import { colors, typography, layout, shadows, borderRadius } from '../constants/designSystem';
import { scale, scaleFontSize, getResponsivePadding, dimensions } from '../utils/responsive';

/**
 * Upload Screen - Exact replica dari upload-menu.png mockup
 * Responsive untuk semua ukuran layar
 */

export default function MockupUploadScreen({ session, setSession, activeMenu, setActiveMenu, onNavigate }) {
  const [mode, setMode] = useState(null); // 'ai' or 'manual'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setSelectedFiles(result.assets);
        setMode('manual');
      }
    } catch (error) {
      console.error('Error picking files:', error);
    }
  };

  const handleAIUpload = () => {
    setMode('ai');
    // AI upload logic here
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <MockupHeader
        title="Upload Images"
        subtitle="Batch Upload - 8 images per batch"
        droneId={session?.drone?.drone_code || 'Drone-001'}
      />

      {/* Navigation */}
      <MockupNavigation
        activeTab="upload"
        onTabChange={(tab) => {
          if (onNavigate) onNavigate(tab);
          else if (setActiveMenu) setActiveMenu(tab);
        }}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {mode === null ? (
          // Initial State: Two options
          <View style={styles.optionsContainer}>
            {/* Left: DRONE AI UPLOAD */}
            <View style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>📷</Text>
                </View>
                <View>
                  <Text style={styles.optionTitle}>DRONE AI UPLOAD</Text>
                  <Text style={styles.optionSubtitle}>Neural Network Transfer</Text>
                </View>
              </View>

              {/* Standby Mode Content */}
              <View style={styles.standbyContent}>
                <View style={styles.uploadIconContainer}>
                  <Text style={styles.uploadIcon}>⬆️</Text>
                </View>
                <Text style={styles.standbyTitle}>Preview Mode</Text>
                <Text style={styles.standbyText}>
                  Select images to initialize upload sequence.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={handleAIUpload}
                activeOpacity={0.8}
              >
                <Text style={styles.optionButtonText}>Start AI Upload</Text>
              </TouchableOpacity>
            </View>

            {/* Right: Jelajahi File */}
            <View style={styles.optionCard}>
              <View style={styles.browseContent}>
                <View style={styles.browseIconContainer}>
                  <Text style={styles.browseIcon}>📄</Text>
                  <Text style={styles.browsePlus}>+</Text>
                </View>
                <Text style={styles.browseTitle}>Browse File</Text>
                <Text style={styles.browseSubtitle}>
                  Pilih dari pengelola file (mendukung massal)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.browseButton}
                onPress={handlePickFiles}
                activeOpacity={0.8}
              >
                <Text style={styles.browseButtonText}>Browse Files</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Upload in progress or file selected
          <View style={styles.uploadingContainer}>
            <View style={styles.uploadCard}>
              <Text style={styles.uploadStatus}>
                {uploading ? 'Uploading...' : `${selectedFiles.length} files selected`}
              </Text>
              {uploading && <ActivityIndicator size="large" color={colors.primary} />}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: scale(layout.containerPadding),
  },
  optionsContainer: {
    flexDirection: dimensions.width > 600 ? 'row' : 'column',
    gap: scale(layout.gridGap),
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
    borderRadius: scale(borderRadius.medium),
    padding: scale(layout.cardPadding),
    minHeight: scale(400),
    ...shadows.medium,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(24),
    gap: scale(12),
  },
  iconCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: scaleFontSize(24),
  },
  optionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionSubtitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '400',
    color: colors.textLink,
  },
  standbyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  uploadIconContainer: {
    width: scale(80),
    height: scale(80),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  uploadIcon: {
    fontSize: scaleFontSize(64),
    opacity: 0.3,
  },
  standbyTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: scale(8),
  },
  standbyText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  optionButton: {
    backgroundColor: colors.primary,
    paddingVertical: scale(14),
    borderRadius: scale(borderRadius.medium),
    alignItems: 'center',
    ...shadows.small,
  },
  optionButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.textWhite,
  },
  browseContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  browseIconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(24),
    position: 'relative',
  },
  browseIcon: {
    fontSize: scaleFontSize(56),
  },
  browsePlus: {
    position: 'absolute',
    bottom: scale(5),
    right: scale(5),
    fontSize: scaleFontSize(32),
    color: colors.textWhite,
    backgroundColor: colors.primary,
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    textAlign: 'center',
    lineHeight: scaleFontSize(36),
    fontWeight: 'bold',
  },
  browseTitle: {
    fontSize: scaleFontSize(24),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: scale(8),
  },
  browseSubtitle: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: scale(20),
  },
  browseButton: {
    backgroundColor: colors.backgroundWhite,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: scale(14),
    borderRadius: scale(borderRadius.medium),
    alignItems: 'center',
  },
  browseButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.primary,
  },
  uploadingContainer: {
    padding: scale(layout.containerPadding),
  },
  uploadCard: {
    backgroundColor: colors.backgroundWhite,
    borderRadius: scale(borderRadius.medium),
    padding: scale(layout.cardPadding * 2),
    alignItems: 'center',
    ...shadows.medium,
  },
  uploadStatus: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: scale(20),
  },
});
