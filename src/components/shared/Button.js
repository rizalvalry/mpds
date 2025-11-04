import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Button Component System
 * Inspired by modern drone interfaces (DJI GO, Skydio, Litchi)
 */

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  gradient = false,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const { theme } = useTheme();

  const sizes = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 13,
      height: 36,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 15,
      height: 48,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 17,
      height: 56,
    },
  };

  const variants = {
    primary: {
      backgroundColor: theme.primary,
      color: theme.buttonText,
    },
    secondary: {
      backgroundColor: theme.accent,
      color: theme.buttonText,
    },
    success: {
      backgroundColor: theme.success,
      color: theme.buttonText,
    },
    warning: {
      backgroundColor: theme.warning,
      color: theme.buttonText,
    },
    error: {
      backgroundColor: theme.error,
      color: theme.buttonText,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: theme.primary,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.primary,
    },
    light: {
      backgroundColor: theme.neutral100,
      color: theme.text,
    },
  };

  const sizeStyle = sizes[size];
  const variantStyle = variants[variant];
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    {
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      height: sizeStyle.height,
      backgroundColor: variantStyle.backgroundColor,
      borderWidth: variantStyle.borderWidth || 0,
      borderColor: variantStyle.borderColor || 'transparent',
      opacity: isDisabled ? 0.5 : 1,
    },
    fullWidth && styles.fullWidth,
    style,
  ];

  const textStyleCombined = [
    styles.buttonText,
    {
      color: variantStyle.color,
      fontSize: sizeStyle.fontSize,
    },
    textStyle,
  ];

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          color={variantStyle.color}
          size="small"
          style={styles.loader}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={textStyleCombined} numberOfLines={1}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  if (gradient && variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[buttonStyle, { backgroundColor: 'transparent' }]}
        {...props}
      >
        <LinearGradient
          colors={theme.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={buttonStyle}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

export const IconButton = ({
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const sizes = {
    small: 36,
    medium: 48,
    large: 56,
  };

  const variants = {
    primary: theme.primary,
    secondary: theme.accent,
    ghost: 'transparent',
    light: theme.neutral100,
  };

  const buttonSize = sizes[size];
  const backgroundColor = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.iconButton,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
};

export const ButtonGroup = ({ children, style }) => {
  return <View style={[styles.buttonGroup, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  gradient: {
    borderRadius: 12,
  },
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    marginRight: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconButton: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
});
