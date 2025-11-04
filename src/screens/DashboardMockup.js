import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function DashboardMockup({ session, setActiveMenu }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [dashboardWorkers, setDashboardWorkers] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('today'); // today, week, month

  useEffect(() => {
    loadDashboardData();
  }, [selectedFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard data dari API seperti Flutter
      const [statusRes, workerRes, overviewRes] = await Promise.all([
        apiService.getDashboardStatus(selectedFilter),
        apiService.getDashboardWorker(selectedFilter),
        apiService.getDashboardOverview(),
      ]);

      console.log('Dashboard Status:', statusRes);
      console.log('Dashboard Worker:', workerRes);
      console.log('Dashboard Overview:', overviewRes);

      if (statusRes.success && statusRes.data) {
        setDashboardStatus(statusRes.data);
      }

      if (workerRes.success && workerRes.data) {
        setDashboardWorkers(workerRes.data);
      }

      if (overviewRes.success && overviewRes.data) {
        setDashboardOverview(overviewRes.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Fallback to mock data on error
      setDashboardStatus({
        total_cases: 0,
        completed_cases: 0,
        in_progress_cases: 0,
        pending_cases: 0,
      });
      setDashboardWorkers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const totalCases = dashboardStatus?.total_cases || 0;
  const completedCases = dashboardStatus?.completed_cases || 0;
  const inProgressCases = dashboardStatus?.in_progress_cases || 0;
  const pendingCases = dashboardStatus?.pending_cases || 0;
  const totalPhotos = dashboardStatus?.total_photos || 0;
  const processedPhotos = dashboardStatus?.processed_photos || 0;
  const completionPercentage = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1E9BE9', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: 20,
          paddingBottom: 20,
          paddingHorizontal: 24,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#FFFFFF' }}>
            Dashboard
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
            Real-time Drone Operations Overview
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>📷</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {session?.drone?.drone_code || 'Drone-001'}
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>🕐</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Navigation Bar */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <View style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          backgroundColor: '#0EA5E9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          shadowColor: '#0EA5E9',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Text style={{ fontSize: 18 }}>📊</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Dashboard</Text>
        </View>

        <TouchableOpacity
          onPress={() => setActiveMenu('upload')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMenu('cases')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Cases</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMenu('monitoring')}
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
          <Text style={{ fontSize: 18 }}>📹</Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Monitoring</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
        }
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 16 }}>Loading Dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards Row */}
            <View style={{ flexDirection: width > 600 ? 'row' : 'column', gap: 16, marginBottom: 24 }}>
              {/* Total Cases */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#0EA5E9',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 18 }}>📋</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Total Cases</Text>
                </View>
                <Text style={{ fontSize: 36, fontWeight: '700', color: '#1F2937' }}>
                  {totalCases}
                </Text>
                <Text style={{ fontSize: 12, color: '#0EA5E9', marginTop: 4 }}>
                  {completionPercentage}% Completed
                </Text>
              </View>

              {/* Total Photos */}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#10B981',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 18 }}>📷</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Total Photos</Text>
                </View>
                <Text style={{ fontSize: 36, fontWeight: '700', color: '#1F2937' }}>
                  {totalPhotos}
                </Text>
                <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>
                  {processedPhotos} Processed
                </Text>
              </View>
            </View>

            {/* Status Breakdown */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#0EA5E9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                    STATUS BREAKDOWN
                  </Text>
                  <Text style={{ fontSize: 14, color: '#0EA5E9' }}>
                    Case Distribution Overview
                  </Text>
                </View>
              </View>

              {/* Progress Bars */}
              <View style={{ gap: 16 }}>
                {/* Completed */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>Completed</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>{completedCases}</Text>
                  </View>
                  <View style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${totalCases > 0 ? (completedCases / totalCases) * 100 : 0}%`,
                      height: '100%',
                      backgroundColor: '#10B981',
                    }} />
                  </View>
                </View>

                {/* In Progress */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>In Progress</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0EA5E9' }}>{inProgressCases}</Text>
                  </View>
                  <View style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${totalCases > 0 ? (inProgressCases / totalCases) * 100 : 0}%`,
                      height: '100%',
                      backgroundColor: '#0EA5E9',
                    }} />
                  </View>
                </View>

                {/* Pending */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>Pending</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#F59E0B' }}>{pendingCases}</Text>
                  </View>
                  <View style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#E5E7EB',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      width: `${totalCases > 0 ? (pendingCases / totalCases) * 100 : 0}%`,
                      height: '100%',
                      backgroundColor: '#F59E0B',
                    }} />
                  </View>
                </View>
              </View>
            </View>

            {/* Active Workers */}
            {dashboardWorkers && dashboardWorkers.length > 0 && (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#0EA5E9',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>👥</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                      ACTIVE WORKERS
                    </Text>
                    <Text style={{ fontSize: 14, color: '#0EA5E9' }}>
                      {dashboardWorkers.length} Operators Online
                    </Text>
                  </View>
                </View>

                {/* Workers List */}
                <View style={{ gap: 12 }}>
                  {dashboardWorkers.map((worker, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#F9FAFB',
                        borderRadius: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#0EA5E9',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 16 }}>👤</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                            {worker.name || `Operator ${index + 1}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>
                            {worker.current_task || 'Available'}
                          </Text>
                        </View>
                      </View>
                      <View style={{
                        paddingVertical: 4,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: worker.status === 'active' ? '#D1FAE5' : '#FEF3C7',
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: worker.status === 'active' ? '#065F46' : '#92400E',
                        }}>
                          {worker.status === 'active' ? 'Active' : 'Idle'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Actions */}
            <View style={{ flexDirection: width > 600 ? 'row' : 'column', gap: 16 }}>
              <TouchableOpacity
                onPress={() => setActiveMenu('upload')}
                style={{
                  flex: 1,
                  backgroundColor: '#0EA5E9',
                  paddingVertical: 20,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#0EA5E9',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>⬆️</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  Upload Images
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveMenu('cases')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#0EA5E9',
                  paddingVertical: 20,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0EA5E9' }}>
                  View Cases
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveMenu('monitoring')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 2,
                  borderColor: '#0EA5E9',
                  paddingVertical: 20,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📹</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0EA5E9' }}>
                  Monitoring
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
