import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext.js';
import { ApiService } from '../services/ApiService.js';

export default function SettingsPage() {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const [isFeatureBranch, setIsFeatureBranch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('development');

  const api = new ApiService();

  useEffect(() => {
    loadCurrentDeployment();
  }, []);

  const loadCurrentDeployment = async () => {
    try {
      await api.init();
      const response = await fetch(`https://${api.baseUrl}${api.basePath}/deployment/current-deployment`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBranch(data.currentBranch);
        setIsFeatureBranch(data.currentBranch === 'feat/sunreflection-with-dev-devops');
      }
    } catch (error) {
      console.error('Failed to load deployment info:', error);
    }
  };

  const handleBranchSwitch = async (value) => {
    setIsLoading(true);

    const targetBranch = value ? 'feat/sunreflection-with-dev-devops' : 'development';
    const branchLabel = value ? 'Feature Branch (Sun Reflection)' : 'Development Branch';

    Alert.alert(
      'Switch Deployment Branch',
      `Are you sure you want to switch to ${branchLabel}?\n\nThis will create a new tag and trigger deployment.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setIsLoading(false)
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.init();
              const response = await fetch(`https://${api.baseUrl}${api.basePath}/deployment/switch-branch`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${api.accessToken}`
                },
                body: JSON.stringify({
                  branchName: targetBranch,
                  requestedBy: 'admin'
                })
              });

              const data = await response.json();

              if (response.ok) {
                setIsFeatureBranch(value);
                setCurrentBranch(targetBranch);
                Alert.alert(
                  'Success',
                  `Deployment switched to ${branchLabel}\n\nTag: ${data.tagName}\n\nDeployment is in progress...`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', data.error || 'Failed to switch branch');
                setIsFeatureBranch(!value);
              }
            } catch (error) {
              console.error('Switch branch error:', error);
              Alert.alert('Error', 'Failed to switch branch: ' + error.message);
              setIsFeatureBranch(!value);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>⚙️ Settings</Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>🌙 Dark Mode</Text>
        <View style={styles.row}>
          <Text style={{ color: theme.text }}>{isDarkMode ? 'Enabled' : 'Disabled'}</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            thumbColor={isDarkMode ? theme.accent : '#ccc'}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>🚀 Deployment Branch</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Switch between development and feature branches
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>
              {isFeatureBranch ? '✨ Feature Branch' : '🔧 Development'}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              {currentBranch}
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Switch
              value={isFeatureBranch}
              onValueChange={handleBranchSwitch}
              thumbColor={isFeatureBranch ? theme.accent : '#ccc'}
              disabled={isLoading}
            />
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>📱 App Version</Text>
        <Text style={{ color: theme.text }}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, minHeight:'100vh' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  description: { fontSize: 13, marginBottom: 12, opacity: 0.7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
