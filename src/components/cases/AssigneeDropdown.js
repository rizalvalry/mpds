import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function AssigneeDropdown({ currentWorker, workers, onWorkerChange, disabled = false }) {
  // Safe check for workers array
  const safeWorkers = Array.isArray(workers) ? workers : [];

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <Picker
        selectedValue={currentWorker?.id || null}
        onValueChange={(itemValue) => {
          if (itemValue && !disabled) {
            const worker = safeWorkers.find((w) => w.id === itemValue);
            if (worker) {
              onWorkerChange(worker);
            }
          }
        }}
        style={styles.picker}
        enabled={!disabled}
        dropdownIconColor="#0047AB"
      >
        <Picker.Item label="Assign To" value={null} />
        {safeWorkers.map((worker) => (
          <Picker.Item
            key={worker.id}
            label={worker.fullname}
            value={worker.id}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderRadius: 4,
    backgroundColor: '#fff',
    height: 36,
    justifyContent: 'center',
  },
  picker: {
    height: 36,
    width: '100%',
    fontSize: 10,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
});
