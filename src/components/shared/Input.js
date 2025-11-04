import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Enhanced Input Component with Modern Design
 * Inspired by Material Design 3 and modern input patterns
 */

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  icon,
  rightIcon,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  ...props
}) => {
  const { theme, isDarkMode } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusAnim] = useState(new Animated.Value(0));

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary],
  });

  const borderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error
                ? theme.error
                : isFocused
                ? theme.primary
                : theme.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderColor: error ? theme.error : borderColor,
            borderWidth,
          },
          disabled && styles.disabled,
        ]}
      >
        {/* Left Icon */}
        {icon && <View style={styles.leftIcon}>{icon}</View>}

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          style={[
            styles.input,
            {
              color: theme.text,
            },
            multiline && styles.multilineInput,
          ]}
          {...props}
        />

        {/* Right Icon / Password Toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
          >
            <Text style={styles.eyeIcon}>
              {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}

        {/* Character Count */}
        {maxLength && value && (
          <Text style={[styles.charCount, { color: theme.textTertiary }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </Animated.View>

      {/* Error Message */}
      {error && (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      )}

      {/* Helper Text */}
      {!error && props.helperText && (
        <Text style={[styles.helperText, { color: theme.textSecondary }]}>
          {props.helperText}
        </Text>
      )}
    </View>
  );
};

export const SearchInput = ({ value, onChangeText, placeholder = 'Search...', style }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.card }, style]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        style={[styles.searchInput, { color: theme.text }]}
      />
      {value && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  eyeIcon: {
    fontSize: 20,
  },
  charCount: {
    fontSize: 11,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },

  // Search Input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
});
