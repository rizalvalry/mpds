import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, BarChart } from 'react-native-chart-kit';
import apiService from '../services/ApiService';
import DynamicHeader from '../components/shared/DynamicHeader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 1200 ? (width - 96) / 5 : (width - 72) / 5; // For 5 cards (filter + 4 stats)

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 10,
  },
};

export default function DashboardComplete({ session, setActiveMenu, setSession }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('today'); // today, week, month
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Data states
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [dashboardWorkers, setDashboardWorkers] = useState([]);
  const [dashboardBd, setDashboardBd] = useState([]);
  const [dashboardBdPerBlock, setDashboardBdPerBlock] = useState([]);

  const filterOptions = ['Today', 'Week', 'Month'];

  useEffect(() => {
    loadDashboardData();
  }, [selectedFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all dashboard data dari API seperti Flutter
      const [overviewRes, statusRes, workerRes, bdRes, bdPerBlockRes] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getDashboardStatus(selectedFilter),
        apiService.getDashboardWorker(selectedFilter),
        apiService.getDashboardData(selectedFilter),
        apiService.getDashboardBDPerBlock(selectedFilter),
      ]);

      console.log('Dashboard Overview:', overviewRes);
      console.log('Dashboard Status:', statusRes);
      console.log('Dashboard Worker:', workerRes);
      console.log('Dashboard BD:', bdRes);
      console.log('Dashboard BD Per Block:', bdPerBlockRes);

      if (overviewRes.success && overviewRes.data) {
        setDashboardOverview(overviewRes.data);
      }

      if (statusRes.success && statusRes.data) {
        setDashboardStatus(statusRes.data);
      }

      if (workerRes.success && workerRes.data) {
        setDashboardWorkers(workerRes.data);
      }

      if (bdRes.success && bdRes.data) {
        setDashboardBd(bdRes.data);
      }

      if (bdPerBlockRes.success && bdPerBlockRes.data) {
        setDashboardBdPerBlock(bdPerBlockRes.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Prepare Bird Drop Status Pie Chart Data
  const getBirdDropStatusPieData = () => {
    if (!dashboardStatus || !dashboardStatus.true_detection && !dashboardStatus.pending && !dashboardStatus.false_detection) {
      return [];
    }

    const total = (dashboardStatus.true_detection || 0) + (dashboardStatus.pending || 0) + (dashboardStatus.false_detection || 0);
    if (total === 0) return [];

    return [
      {
        name: 'True Detection',
        population: dashboardStatus.true_detection || 0,
        color: '#0EA5E9',
        legendFontColor: '#1F2937',
        legendFontSize: 12,
      },
      {
        name: 'Pending',
        population: dashboardStatus.pending || 0,
        color: '#9CA3AF',
        legendFontColor: '#1F2937',
        legendFontSize: 12,
      },
      {
        name: 'False Detection',
        population: dashboardStatus.false_detection || 0,
        color: '#EF4444',
        legendFontColor: '#1F2937',
        legendFontSize: 12,
      },
    ].filter(item => item.population > 0);
  };

  // Prepare Worker Pie Chart Data
  const getWorkerPieData = () => {
    if (!dashboardWorkers || dashboardWorkers.length === 0) return [];

    const colors = ['#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6', '#F97316', '#14B8A6', '#EF4444', '#EC4899'];

    return dashboardWorkers.map((worker, index) => ({
      name: worker.worker || worker.name || `Worker ${index + 1}`,
      population: worker.value || worker.count || 0,
      color: colors[index % colors.length],
      legendFontColor: '#1F2937',
      legendFontSize: 12,
    })).filter(item => item.population > 0);
  };

  // Prepare BD Confirm Per Block Pie Chart Data
  const getBDConfirmPerBlockPieData = () => {
    if (!dashboardBdPerBlock || dashboardBdPerBlock.length === 0) return [];

    const colors = ['#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6', '#F97316', '#14B8A6', '#EF4444', '#EC4899'];

    return dashboardBdPerBlock.map((block, index) => ({
      name: `Block ${block.area_code}`,
      population: block.total || 0,
      color: colors[index % colors.length],
      legendFontColor: '#1F2937',
      legendFontSize: 12,
    })).filter(item => item.population > 0);
  };

  // Prepare Bar Chart Data untuk Bird Drops - Sesuai Flutter format
  const getBirdDropBarData = () => {
    if (!dashboardBd || dashboardBd.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }

    // Determine number of bars based on filter
    const totalBars = selectedFilter === 'month' ? 12 : 7;
    const labels = [];
    const data = [];

    // Generate labels
    if (selectedFilter === 'month') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels.push(...months);
    } else {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      labels.push(...days);
    }

    // Map data by indicator (1-based index from API)
    for (let i = 1; i <= totalBars; i++) {
      const dataPoint = dashboardBd.find(item => item.indicator === i);
      data.push(dataPoint ? dataPoint.value : 0);
    }

    return {
      labels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
        },
      ],
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Dynamic Header Component */}
      <DynamicHeader
        title="Dashboard"
        subtitle="MPDS - Drone Operations Analytics"
        session={session}
        setSession={setSession}
        onThemeToggle={(value) => setIsDarkMode(value)}
        isDarkMode={isDarkMode}
      />

      {/* Navigation Bar */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12, width }}>
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

          <TouchableOpacity
            onPress={() => setActiveMenu('documentations')}
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
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Documentations</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
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
            {/* Filter + Stats Cards Row - PERSIS seperti Flutter */}
            <View style={styles.statsRow}>
              {/* Filter Chips - Vertical */}
              <View style={styles.filterContainer}>
                {filterOptions.map((filter, index) => {
                  const isSelected = selectedFilter === filter.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setSelectedFilter(filter.toLowerCase())}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipActive,
                        index < filterOptions.length - 1 && { marginBottom: 8 }
                      ]}
                    >
                      <Text style={[
                        styles.filterText,
                        isSelected && styles.filterTextActive
                      ]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stat Card 1: Total BD Confirmed */}
              <View style={[styles.statCard, styles.statCardBlue]}>
                <Text style={styles.statLabel}>Total BD Confirmed</Text>
                <Text style={[styles.statValue, { color: '#1E40AF' }]}>
                  {dashboardOverview?.total || 0}
                </Text>
              </View>

              {/* Stat Card 2: Daily Av. BD */}
              <View style={[styles.statCard, styles.statCardDark]}>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>
                  Daily Av. BD
                </Text>
                {dashboardOverview?.average_verified_trend && (
                  <Text style={styles.trendIcon}>
                    {dashboardOverview.average_verified_trend === 'upward' ? '📈' :
                     dashboardOverview.average_verified_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                    {dashboardOverview?.average_verified || 0}
                  </Text>
                  {dashboardOverview?.average_verified_percentage_delta != null && (
                    <Text style={styles.statPercentage}>
                      {Math.abs(dashboardOverview.average_verified_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Stat Card 3: Daily Av. Case List */}
              <View style={[styles.statCard, styles.statCardLightBlue]}>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>
                  Daily Av. Case List
                </Text>
                {dashboardOverview?.average_all_trend && (
                  <Text style={styles.trendIcon}>
                    {dashboardOverview.average_all_trend === 'upward' ? '📈' :
                     dashboardOverview.average_all_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                    {dashboardOverview?.average_all || 0}
                  </Text>
                  {dashboardOverview?.average_all_percentage_delta != null && (
                    <Text style={styles.statPercentage}>
                      {Math.abs(dashboardOverview.average_all_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Stat Card 4: Daily Av. Block Check */}
              <View style={[styles.statCard, styles.statCardDark]}>
                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.8)' }]}>
                  Daily Av. Block Check
                </Text>
                {dashboardOverview?.average_verified_block_trend && (
                  <Text style={styles.trendIcon}>
                    {dashboardOverview.average_verified_block_trend === 'upward' ? '📈' :
                     dashboardOverview.average_verified_block_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
                    {dashboardOverview?.average_verified_block || 0}
                  </Text>
                  {dashboardOverview?.average_verified_block_percentage_delta != null && (
                    <Text style={styles.statPercentage}>
                      {Math.abs(dashboardOverview.average_verified_block_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bar Chart: Number of Bird Drops Detected */}
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
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
                Number of Bird Drops Detected
              </Text>
              {dashboardBd && dashboardBd.length > 0 ? (
                <BarChart
                  data={getBirdDropBarData()}
                  width={width - 72}
                  height={220}
                  chartConfig={chartConfig}
                  style={{ borderRadius: 8 }}
                  showValuesOnTopOfBars
                  fromZero
                />
              ) : (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>No data available</Text>
                </View>
              )}
            </View>

            {/* Row: Bird Drop Status + Worker */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
              {/* Bird Drop Status Pie Chart */}
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
                  Bird Drop Status
                </Text>
                {getBirdDropStatusPieData().length > 0 ? (
                  <PieChart
                    data={getBirdDropStatusPieData()}
                    width={width / 2 - 48}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                  />
                ) : (
                  <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>No data</Text>
                  </View>
                )}
              </View>

              {/* Worker Pie Chart */}
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 }}>
                  Worker
                </Text>
                {getWorkerPieData().length > 0 ? (
                  <PieChart
                    data={getWorkerPieData()}
                    width={width / 2 - 48}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                  />
                ) : (
                  <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>No data</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Row: BD Confirmed Per Block + BD Per Block */}
            <View style={styles.chartsRow}>
              {/* BD Confirmed Per Block - Pie Chart */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>BD Confirm Per Block</Text>
                {getBDConfirmPerBlockPieData().length > 0 ? (
                  <PieChart
                    data={getBDConfirmPerBlockPieData()}
                    width={width / 2 - 48}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                  />
                ) : (
                  <View style={styles.emptyChart}>
                    <Text style={styles.emptyText}>No data</Text>
                  </View>
                )}
              </View>

              {/* BD Per Block - Table */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Bird Drop Per Block</Text>
                {dashboardBdPerBlock && dashboardBdPerBlock.length > 0 ? (
                  <View style={{ maxHeight: 300 }}>
                    {/* Header Row */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, { flex: 1 }]}>Block</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Total{'\n'}Case List</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Confirm</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>False{'\n'}Detection</Text>
                    </View>
                    <View style={styles.tableDivider} />
                    {/* Data Rows */}
                    <ScrollView style={{ maxHeight: 240 }}>
                      {dashboardBdPerBlock.map((item, index) => {
                        const bgColors = ['#F3E8FF', '#E8FFF3', '#E8F1FF', '#FFF7E8'];
                        const bgColor = bgColors[index % bgColors.length];
                        return (
                          <View
                            key={index}
                            style={[
                              styles.tableRow,
                              { backgroundColor: bgColor + '66' } // 40% opacity
                            ]}
                          >
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ marginRight: 6 }}>📍</Text>
                              <Text style={styles.tableCell}>BLK {item.area_code}</Text>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                              {item.total}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                              {item.true_detection}
                            </Text>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                              <View style={[styles.tableBadge, { backgroundColor: bgColor }]}>
                                <Text style={styles.tableBadgeText}>{item.false_detection}</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.emptyChart}>
                    <Text style={styles.emptyText}>No data</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Stats Row & Cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
  },
  filterChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  filterTextActive: {
    fontWeight: '700',
    color: '#1F2937',
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    justifyContent: 'space-between',
  },
  statCardBlue: {
    backgroundColor: '#DBEAFE',
  },
  statCardDark: {
    backgroundColor: '#1F2937',
  },
  statCardLightBlue: {
    backgroundColor: '#7DD3FC',
  },
  statLabel: {
    fontSize: 12,
    color: '#1E40AF',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendIcon: {
    fontSize: 20,
    alignSelf: 'flex-end',
  },

  // Charts
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  tableDivider: {
    height: 1.2,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginVertical: 6,
  },
  tableCell: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  tableBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
});
