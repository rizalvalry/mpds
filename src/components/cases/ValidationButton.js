import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

export default function ValidationButton({ statusName, onPress, hasWorker }) {
  // Show button if status is not completed/confirmed/false detection
  const statusLower = statusName?.toLowerCase() || '';
  const isValidationNeeded = !statusLower.includes('confirmed') &&
                             !statusLower.includes('completed') &&
                             !statusLower.includes('false detection');

  if (!isValidationNeeded) {
    return (
      <View style={[styles.button, styles.buttonValidated]}>
        <Text style={styles.buttonText}>Validated</Text>
      </View>
    );
  }

  const handlePress = () => {
    if (!hasWorker) {
      // This will be handled by parent component
      onPress(false);
    } else {
      onPress(true);
    }
  };

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
