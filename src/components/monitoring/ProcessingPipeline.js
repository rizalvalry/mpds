import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Processing Pipeline Visualization
 * Three-stage pipeline: Input → Processing → Complete
 * Inspired by Azure IoT monitoring design
 */

export const ProcessingPipeline = ({
  inputCount = 0,
  queuedCount = 0,
  processingCount = 0,
  completedCount = 0,
  style,
}) => {
  const { theme, isDarkMode } = useTheme();

  const stages = [
    {
      id: 1,
      icon: '📁',
      title: 'Input Folder',
      subtitle: 'Files Received',
      count: inputCount,
      color: theme.info,
      bgColor: theme.infoLight,
    },
    {
      id: 2,
      icon: '⚙️',
      title: 'Processing',
      subtitle: `${processingCount}/${queuedCount + processingCount}`,
      count: queuedCount,
      color: theme.warning,
      bgColor: theme.warningLight,
      progress: queuedCount > 0 ? (processingCount / queuedCount) * 100 : 0,
    },
    {
      id: 3,
      icon: '✅',
      title: 'Complete',
      subtitle: 'Successfully Processed',
      count: completedCount,
      color: theme.success,
      bgColor: theme.successLight,
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {stages.map((stage, index) => (
        <React.Fragment key={stage.id}>
          {/* Stage Card */}
          <View style={[styles.stageCard, { backgroundColor: theme.card }]}>
            {/* Icon Circle */}
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: stage.bgColor,
                  borderColor: stage.color,
                },
              ]}
            >
              <Text style={styles.stageIcon}>{stage.icon}</Text>
            </View>

            {/* Stage Info */}
            <View style={styles.stageInfo}>
              <Text style={[styles.stageTitle, { color: theme.text }]}>
                {stage.title}
              </Text>
              <Text style={[styles.stageSubtitle, { color: theme.textSecondary }]}>
                {stage.subtitle}
              </Text>
            </View>

            {/* Count Badge */}
            <View
              style={[
                styles.countBadge,
                { backgroundColor: stage.bgColor },
              ]}
            >
              <Text style={[styles.countText, { color: stage.color }]}>
                {stage.count}
              </Text>
            </View>

            {/* Progress Bar (for processing stage) */}
            {stage.progress !== undefined && stage.progress > 0 && (
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: theme.neutral200 },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${stage.progress}%`,
                        backgroundColor: stage.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                  {Math.round(stage.progress)}%
                </Text>
              </View>
            )}
          </View>

          {/* Connector Arrow */}
          {index < stages.length - 1 && (
            <View style={styles.connectorContainer}>
              <View
                style={[
                  styles.connectorLine,
                  { backgroundColor: theme.border },
                ]}
              />
              <Text style={[styles.connectorArrow, { color: theme.textSecondary }]}>
                →
              </Text>
            </View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

export const StatusBanner = ({ status = 'processing', message, lastUpdate, style }) => {
  const { theme } = useTheme();

  const statusConfig = {
    processing: {
      bgColor: theme.infoLight,
      textColor: theme.infoDark,
      icon: '⚙️',
      title: message || 'PROCESSING IN PROGRESS',
    },
    complete: {
      bgColor: theme.successLight,
      textColor: theme.successDark,
      icon: '✅',
      title: message || 'ALL PROCESSING COMPLETE',
    },
    error: {
      bgColor: theme.errorLight,
      textColor: theme.errorDark,
      icon: '⚠️',
      title: message || 'PROCESSING ERROR',
    },
    standby: {
      bgColor: theme.neutral200,
      textColor: theme.neutral600,
      icon: '⏸️',
      title: message || 'PREVIEW MODE',
    },
  };

  const config = statusConfig[status] || statusConfig.standby;

  return (
    <View
      style={[
        styles.statusBanner,
        { backgroundColor: config.bgColor },
        style,
      ]}
    >
      <View style={styles.statusContent}>
        <Text style={[styles.statusIcon, { color: config.textColor }]}>
          {config.icon}
        </Text>
        <Text style={[styles.statusTitle, { color: config.textColor }]}>
          {config.title}
        </Text>
      </View>

      {lastUpdate && (
        <Text style={[styles.lastUpdate, { color: config.textColor }]}>
          Last Update: {lastUpdate}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stageCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageIcon: {
    fontSize: 28,
  },
  stageInfo: {
    marginBottom: 12,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stageSubtitle: {
    fontSize: 13,
  },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  countText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'right',
  },

  // Connector
  connectorContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    position: 'absolute',
    height: 2,
    width: '100%',
  },
  connectorArrow: {
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'transparent',
  },

  // Status Banner
  statusBanner: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
  },
  lastUpdate: {
    fontSize: 12,
    fontWeight: '600',
  },
});
