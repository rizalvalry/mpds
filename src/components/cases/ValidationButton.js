import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

function ValidationButton({ statusName, onPress, hasWorker }) {
  // Show button if status is not completed/confirmed/false detection
  const isValidationNeeded = useMemo(() => {
    const statusLower = statusName?.toLowerCase() || '';
    return !statusLower.includes('confirmed') &&
           !statusLower.includes('completed') &&
           !statusLower.includes('false detection');
  }, [statusName]);

  const handlePress = useMemo(() => {
    return () => {
      if (!hasWorker) {
        // This will be handled by parent component
        onPress(false);
      } else {
        onPress(true);
      }
    };
  }, [hasWorker, onPress]);

  if (!isValidationNeeded) {
    return (
      <View style={[styles.button, styles.buttonValidated]}>
        <Text style={styles.buttonText}>Validated</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        !hasWorker && styles.buttonDisabled,
      ]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>Validate</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF9800',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 70,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonValidated: {
    backgroundColor: '#00baff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholder: {
    alignSelf: 'center',
    minWidth: 70,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#999',
  },
});

// Export default without memo to ensure proper re-renders when props change
export default ValidationButton;
