import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Progress Bar Component
 * Inspired by Azure IoT Hub, DJI processing indicators
 */

export const ProgressBar = ({
  progress = 0,
  total = 100,
  label,
  showPercentage = true,
  variant = 'default',
  animated = true,
  height = 8,
  gradient = true,
  style,
}) => {
  const { theme } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const percentage = total > 0 ? Math.min((progress / total) * 100, 100) : 0;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: percentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(percentage);
    }
  }, [percentage, animated]);

  const variants = {
    default: theme.primary,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
    info: theme.info,
    ai: theme.aiProcessing,
  };

  const backgroundColor = variants[variant] || variants.default;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          {showPercentage && (
            <Text style={[styles.percentage, { color: theme.textSecondary }]}>
              {progress}/{total} ({Math.round(percentage)}%)
            </Text>
          )}
        </View>
      )}

      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: theme.neutral200,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bar,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              height: height - 2,
            },
          ]}
        >
          {gradient ? (
            <LinearGradient
              colors={
                variant === 'ai'
                  ? ['#8B5CF6', '#A78BFA']
                  : variant === 'success'
                  ? [theme.success, theme.successDark]
                  : theme.primaryGradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor },
              ]}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

export const CircularProgress = ({
  progress = 0,
  total = 100,
  size = 120,
  strokeWidth = 10,
  label,
  variant = 'default',
  style,
}) => {
  const { theme } = useTheme();
  const percentage = total > 0 ? Math.min((progress / total) * 100, 100) : 0;

  const variants = {
    default: theme.primary,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
    info: theme.info,
    ai: theme.aiProcessing,
  };

  const color = variants[variant] || variants.default;

  return (
    <View style={[styles.circularContainer, { width: size, height: size }, style]}>
      <View style={styles.circularContent}>
        <Text style={[styles.circularPercentage, { color: theme.text }]}>
          {Math.round(percentage)}%
        </Text>
        {label && (
          <Text style={[styles.circularLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
};

export const StepProgress = ({ steps, currentStep, style }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.stepContainer, style]}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: isCompleted || isActive
                      ? theme.primary
                      : theme.neutral200,
                    borderColor: isActive ? theme.primary : 'transparent',
                    borderWidth: isActive ? 2 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    {
                      color: isCompleted || isActive
                        ? '#FFFFFF'
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {isCompleted ? '✓' : index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCompleted || isActive
                      ? theme.text
                      : theme.textSecondary,
                  },
                ]}
              >
                {step}
              </Text>
            </View>

            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  {
                    backgroundColor: isCompleted
                      ? theme.primary
                      : theme.neutral200,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 13,
  },
  track: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 999,
    overflow: 'hidden',
  },

  // Circular Progress
  circularContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularContent: {
    alignItems: 'center',
  },
  circularPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  circularLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Step Progress
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepConnector: {
    height: 2,
    flex: 1,
    marginTop: 20,
    marginHorizontal: -8,
  },
});
