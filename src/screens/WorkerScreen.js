import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';

export default function WorkerScreen() {
  const { theme } = useTheme();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getWorkers();
      setWorkers(response.data || []);
    } catch (error) {
      console.error('[Worker] Error loading workers:', error);
      Alert.alert('Error', 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = () => {
    setEditingWorker(null);
    setFormData({ username: '', fullname: '', email: '', password: '' });
    setShowModal(true);
  };

  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setFormData({
      username: worker.username,
      fullname: worker.fullname,
      email: worker.email,
      password: '',
    });
    setShowModal(true);
  };

  const handleSaveWorker = async () => {
    if (!formData.username || !formData.fullname) {
      Alert.alert('Validation Error', 'Username and Full Name are required');
      return;
    }

    if (!editingWorker && !formData.password) {
      Alert.alert('Validation Error', 'Password is required for new worker');
      return;
    }

    try {
      if (editingWorker) {
        await ApiService.updateWorker(editingWorker.id, formData);
        Alert.alert('Success', 'Worker updated successfully');
      } else {
        await ApiService.createWorker(formData);
        Alert.alert('Success', 'Worker created successfully');
      }
      setShowModal(false);
      loadWorkers();
    } catch (error) {
      console.error('[Worker] Error saving worker:', error);
      Alert.alert('Error', 'Failed to save worker');
    }
  };

  const handleDeleteWorker = (worker) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${worker.fullname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteWorker(worker.id);
              Alert.alert('Success', 'Worker deleted successfully');
              loadWorkers();
            } catch (error) {
              console.error('[Worker] Error deleting worker:', error);
              Alert.alert('Error', 'Failed to delete worker');
            }
          },
        },
      ]
    );
  };

  const renderWorkerItem = ({ item }) => (
    <View style={[styles.workerItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.workerInfo}>
        <Text style={[styles.workerName, { color: theme.text }]}>{item.fullname}</Text>
        <Text style={[styles.workerDetail, { color: theme.textSecondary }]}>
          @{item.username}
        </Text>
        <Text style={[styles.workerDetail, { color: theme.textSecondary }]}>{item.email}</Text>
      </View>
      <View style={styles.workerActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleEditWorker(item)}
        >
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F44336' }]}
          onPress={() => handleDeleteWorker(item)}
        >
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Workers Management</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateWorker}
        >
          <Text style={styles.addButtonText}>+ Add Worker</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={workers}
          renderItem={renderWorkerItem}
          keyExtractor={(item) => `worker-${item.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text }]}>No workers found</Text>
            </View>
          }
        />
      )}

      {/* Worker Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingWorker ? 'Edit Worker' : 'Add New Worker'}
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Username"
              placeholderTextColor={theme.textSecondary}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={formData.fullname}
              onChangeText={(text) => setFormData({ ...formData, fullname: text })}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder={editingWorker ? 'Password (leave empty to keep current)' : 'Password'}
              placeholderTextColor={theme.textSecondary}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveWorker}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  workerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workerDetail: {
    fontSize: 13,
    marginBottom: 2,
  },
  workerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
