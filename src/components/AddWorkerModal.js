import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function AddWorkerModal({ visible, onClose, onSubmit }) {
  const { theme } = useTheme();

  const [form, setForm] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.username || !form.fullname || !form.email || !form.password) return;
    onSubmit(form);
    setForm({ username: '', fullname: '', email: '', password: '' });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Add New Worker</Text>

          <ScrollView>
            {['username', 'fullname', 'email', 'password'].map((field) => (
              <View key={field} style={{ marginBottom: 12 }}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.background,
                    },
                  ]}
                  secureTextEntry={field === 'password'}
                  value={form[field]}
                  onChangeText={(text) => handleChange(field, text)}
                  placeholder={`Enter ${field}`}
                  placeholderTextColor={theme.text + '66'}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, { backgroundColor: '#999' }]}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.button, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 10,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
