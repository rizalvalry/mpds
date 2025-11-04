import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Status Pill Component for displaying status badges
 * Inspired by Azure IoT, DJI Flight status indicators
 */

export const StatusPill = ({
  status,
  label,
  variant = 'default',
  size = 'medium',
  dot = false,
  style,
}) => {
  const { theme } = useTheme();

  // Status variants with semantic colors
  const statusVariants = {
    // Processing States
    pending: {
      backgroundColor: theme.neutral200,
      textColor: theme.neutral600,
      dotColor: theme.neutral600,
      label: label || 'Pending',
    },
    inProgress: {
      backgroundColor: theme.infoLight,
      textColor: theme.infoDark,
      dotColor: theme.info,
      label: label || 'In Progress',
    },
    processing: {
      backgroundColor: theme.infoLight,
      textColor: theme.infoDark,
      dotColor: theme.aiProcessing,
      label: label || 'Processing',
    },
    queue: {
      backgroundColor: theme.warningLight,
      textColor: theme.warningDark,
      dotColor: theme.warning,
      label: label || 'Queued',
    },

    // Success States
    completed: {
      backgroundColor: theme.successLight,
      textColor: theme.successDark,
      dotColor: theme.success,
      label: label || 'Completed',
    },
    success: {
      backgroundColor: theme.successLight,
      textColor: theme.successDark,
      dotColor: theme.success,
      label: label || 'Success',
    },
    detected: {
      backgroundColor: theme.successLight,
      textColor: theme.successDark,
      dotColor: theme.success,
      label: label || 'Detected',
    },
    trueDetection: {
      backgroundColor: theme.successLight,
      textColor: theme.successDark,
      dotColor: theme.success,
      label: label || 'True Detection',
    },

    // Warning States
    warning: {
      backgroundColor: theme.warningLight,
      textColor: theme.warningDark,
      dotColor: theme.warning,
      label: label || 'Warning',
    },
    falseDetection: {
      backgroundColor: theme.warningLight,
      textColor: theme.warningDark,
      dotColor: theme.warning,
      label: label || 'False Detection',
    },

    // Error States
    failed: {
      backgroundColor: theme.errorLight,
      textColor: theme.errorDark,
      dotColor: theme.error,
      label: label || 'Failed',
    },
    error: {
      backgroundColor: theme.errorLight,
      textColor: theme.errorDark,
      dotColor: theme.error,
      label: label || 'Error',
    },
    notStarted: {
      backgroundColor: theme.neutral200,
      textColor: theme.neutral600,
      dotColor: theme.neutral500,
      label: label || 'Not Started',
    },

    // Drone States
    droneActive: {
      backgroundColor: theme.infoLight,
      textColor: theme.infoDark,
      dotColor: theme.droneActive,
      label: label || 'Active',
    },
    droneStandby: {
      backgroundColor: theme.warningLight,
      textColor: theme.warningDark,
      dotColor: theme.droneStandby,
      label: label || 'Standby',
    },
    droneOffline: {
      backgroundColor: theme.neutral200,
      textColor: theme.neutral600,
      dotColor: theme.droneOffline,
      label: label || 'Offline',
    },

    // AI Processing States
    aiProcessing: {
      backgroundColor: '#F3E8FF',
      textColor: '#6B21A8',
      dotColor: theme.aiProcessing,
      label: label || 'AI Processing',
    },
    aiComplete: {
      backgroundColor: theme.successLight,
      textColor: theme.successDark,
      dotColor: theme.aiComplete,
      label: label || 'AI Complete',
    },

    // Default
    default: {
      backgroundColor: theme.neutral100,
      textColor: theme.text,
      dotColor: theme.neutral500,
      label: label || 'Status',
    },
  };

  const sizes = {
    small: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      fontSize: 11,
      dotSize: 6,
    },
    medium: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      fontSize: 13,
      dotSize: 8,
    },
    large: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 14,
      dotSize: 10,
    },
  };

  const currentStatus = statusVariants[status] || statusVariants.default;
  const currentSize = sizes[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currentStatus.backgroundColor,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              width: currentSize.dotSize,
              height: currentSize.dotSize,
              backgroundColor: currentStatus.dotColor,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: currentStatus.textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {currentStatus.label}
      </Text>
    </View>
  );
};

export const DroneStatusIndicator = ({ status, label, size = 'medium' }) => {
  const statusMap = {
    active: 'droneActive',
    standby: 'droneStandby',
    offline: 'droneOffline',
    error: 'droneOffline',
  };

  return (
    <StatusPill
      status={statusMap[status] || 'droneOffline'}
      label={label}
      size={size}
      dot={true}
    />
  );
};

export const ProcessingStatusIndicator = ({ status, count, size = 'medium' }) => {
  const { theme } = useTheme();
  const statusMap = {
    queued: 'queue',
    processing: 'aiProcessing',
    completed: 'aiComplete',
    failed: 'failed',
  };

  const displayLabel = count ? `${status} (${count})` : status;

  return (
    <StatusPill
      status={statusMap[status] || 'default'}
      label={displayLabel}
      size={size}
      dot={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 999,
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
});
