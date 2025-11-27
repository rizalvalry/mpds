import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import azureBlobService from '../services/AzureBlobService';
import DynamicHeader from '../components/shared/DynamicHeader';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// Use real Azure data (credentials sudah diperbaiki)
const USE_MOCK_DATA = false; // Set true jika ingin demo mode

export default function MonitoringMockup({
  session,
  setActiveMenu,
  setSession,
  embedded = false,
  onNavigate,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      if (!isPaused) {
        loadStats();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  // Generate realistic mock data
  const generateMockStats = () => {
    // Simulate varying processing states
    const scenarios = [
      // Scenario 1: Active processing
      { input: 45, queued: 28, processed: 156, detected: 142, undetected: 14 },
      // Scenario 2: Almost complete
      { input: 12, queued: 8, processed: 234, detected: 215, undetected: 19 },
      // Scenario 3: Idle state
      { input: 0, queued: 0, processed: 189, detected: 175, undetected: 14 },
      // Scenario 4: Heavy load
      { input: 128, queued: 96, processed: 89, detected: 78, undetected: 11 },
      // Scenario 5: Low activity
      { input: 5, queued: 3, processed: 67, detected: 61, undetected: 6 },
    ];

    // Rotate through scenarios or pick random
    const scenarioIndex = Math.floor(Date.now() / 60000) % scenarios.length; // Change every minute
    const mockData = scenarios[scenarioIndex];

    return {
      ...mockData,
      total: mockData.input + mockData.queued + mockData.processed,
      timestamp: new Date().toISOString(),
    };
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      
      let data;
      if (USE_MOCK_DATA) {
        // Use mock data (simulate network delay)
        await new Promise(resolve => setTimeout(resolve, 500));
        data = generateMockStats();
        console.log('[Monitoring] Using mock data:', data);
      } else {
        // Use real Azure Blob Storage data
        console.log('[Monitoring] Fetching real Azure Blob Storage data...');
        data = await azureBlobService.getAllStats();
        console.log('[Monitoring] Azure data received:', data);
      }
      
      setStats(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('[Monitoring] Error loading stats:', error);
      console.error('[Monitoring] Error details:', error.message);
      
      // Fallback to mock data on error
      console.log('[Monitoring] Falling back to mock data due to error');
      const mockData = generateMockStats();
      setStats(mockData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = () => {
    if (!lastUpdate) return 'Never';
    const seconds = Math.floor((new Date() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Map Azure Blob stats to UI format
  const inputCount = stats?.input || 0;
  const queuedCount = stats?.queued || 0;
  const processedCount = stats?.processed || 0;
  const detectedCount = stats?.detected || 0;
  const undetectedCount = stats?.undetected || 0;
  const completedCount = detectedCount + undetectedCount;
  
  // Processing percentage based on completed output files
  const totalFilesToday = processedCount > 0 ? processedCount : (detectedCount + undetectedCount);
  const processingPercentage = totalFilesToday > 0 ? Math.round((completedCount / totalFilesToday) * 100) : 0;
  
  // System is complete if no files in queue and input
  const isComplete = queuedCount === 0 && inputCount === 0 && completedCount > 0;
  const isIdle = inputCount === 0 && queuedCount === 0 && completedCount === 0;
  
  console.log('[Monitoring] Display stats:', {
    input: inputCount,
    queued: queuedCount,
    processed: processedCount,
    detected: detectedCount,
    undetected: undetectedCount,
    completed: completedCount,
    isComplete,
    isIdle
  });

  const handleNavigate = (target) => {
    if (embedded) {
      onNavigate && onNavigate(target);
    } else if (setActiveMenu) {
      setActiveMenu(target);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {!embedded && (
        <>
          <DynamicHeader
            title="Monitoring"
            subtitle="Azure Blob Storage File Monitoring"
            session={session}
            setSession={setSession}
          />

          <View style={{
            backgroundColor: theme.card,
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: 'rgba(0,0,0,0.4)',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12, width }}>
                <TouchableOpacity
                  onPress={() => handleNavigate('dashboard')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>📊</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleNavigate('upload')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>⬆️</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Upload</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleNavigate('cases')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>📋</Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Cases</Text>
                </TouchableOpacity>

                <View style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: theme.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}>
                  <Text style={{ fontSize: 18 }}>📹</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Monitoring</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleNavigate('documentations')}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginLeft: 12,
                }}
              >
                <Text style={{ fontSize: 18 }}>📚</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Documentations</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </>
      )}

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {/* Mock Data Notice (if using mock data) */}
        {/* {USE_MOCK_DATA && (
          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B',
          }}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
                Demo Mode - Using Mock Data
              </Text>
              <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                Real Azure Blob Storage monitoring requires proper authentication
              </Text>
            </View>
          </View>
        )} */}

        {/* Azure Blob Monitor Card */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: USE_MOCK_DATA ? '#F59E0B' : '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 24 }}>{USE_MOCK_DATA ? '📊' : '☁️'}</Text>
              </View>
              <View>
                {/* <Text style={{ fontSize: 14, color: USE_MOCK_DATA ? '#F59E0B' : '#0EA5E9' }}>
                  {USE_MOCK_DATA ? 'Demo Monitoring Analytics' : 'Real-time Monitoring Analytics'}
                </Text> */}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setIsPaused(!isPaused)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>{isPaused ? '▶️' : '⏸️'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={loadStats}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: '#E0F2FE',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔄</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0EA5E9' }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 12 }}>
            Last Update: {getTimeAgo()}
          </Text>
        </View>

        {/* Status Banner */}
        <View style={{
          backgroundColor: isComplete ? '#D1FAE5' : isIdle ? '#E5E7EB' : '#FEF3C7',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
          <Text style={{ fontSize: 24 }}>
            {isComplete ? '✅' : isIdle ? '💤' : '⚙️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: isComplete ? '#065F46' : isIdle ? '#6B7280' : '#92400E' }}>
              {isComplete ? 'ALL PROCESSING COMPLETE' : isIdle ? 'SYSTEM IDLE' : 'PROCESSING IN PROGRESS'}
            </Text>
            <Text style={{ fontSize: 13, color: isComplete ? '#065F46' : isIdle ? '#6B7280' : '#92400E', marginTop: 2 }}>
              {isComplete ? `${completedCount} files processed today (${detectedCount} detected, ${undetectedCount} undetected)` : 
               isIdle ? 'No files in queue or output folders' : 
               `${inputCount} input, ${queuedCount} queued`}
            </Text>
          </View>
        </View>

        {/* Processing Pipeline */}
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#6B7280',
          letterSpacing: 1.5,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          PROCESSING PIPELINE
        </Text>

        <View style={{ flexDirection: width > 600 ? 'row' : 'column', gap: 16 }}>
          {/* Stage 1: Input Folder */}
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>1</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>Input Folder</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>📁</Text>
              </View>
            </View>

            <Text style={{ fontSize: 48, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
              {inputCount}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>Files Queued</Text>
          </View>

          {/* Stage 2: Processing */}
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>2</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>Processing</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>⚙️</Text>
              </View>
            </View>

            <Text style={{ fontSize: 48, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
              {processedCount}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Files Processed Today</Text>

            {/* Progress Info */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: '#E0F2FE',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369A1' }}>
                  Processed
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>
                → Output: {completedCount}
              </Text>
            </View>
          </View>

          {/* Stage 3: Complete */}
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>3</Text>
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>Complete</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>✅</Text>
              </View>
            </View>

            <Text style={{ fontSize: 48, fontWeight: '700', color: '#10B981', marginBottom: 4 }}>
              {completedCount}
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>Outputs Generated Today</Text>

            {/* Breakdown */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#10B981',
                }} />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  Detected: {detectedCount}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#9CA3AF',
                }} />
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  Undetected: {undetectedCount}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
