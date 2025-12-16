import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, StyleSheet, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, BarChart } from 'react-native-chart-kit';
import apiService from '../services/ApiService';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 1200 ? (width - 96) / 5 : (width - 72) / 5; // For 5 cards (filter + 4 stats)

export default function DashboardComplete() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('today'); // today, week, month
  const [exporting, setExporting] = useState(false);
  const { isDarkMode } = useTheme();

  // Data states
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [dashboardWorkers, setDashboardWorkers] = useState([]);
  const [dashboardBd, setDashboardBd] = useState([]);
  const [dashboardBdPerBlock, setDashboardBdPerBlock] = useState([]);

  const filterOptions = ['Today', 'Week', 'Month'];

  const theme = useMemo(() => (
    isDarkMode
      ? {
          background: '#050A27',
          surface: 'rgba(13, 24, 54, 0.95)',
          surfaceAlt: 'rgba(20, 34, 74, 0.9)',
          surfaceMuted: 'rgba(25, 41, 89, 0.65)',
          border: 'rgba(79, 132, 255, 0.35)',
          textPrimary: '#E8ECFF',
          textSecondary: 'rgba(198, 210, 255, 0.82)',
          textMuted: 'rgba(198, 210, 255, 0.6)',
          accent: '#38BDF8',
          accentStrong: '#2563EB',
          warning: '#FACC15',
          chipActiveBg: 'rgba(56, 189, 248, 0.18)',
          chipActiveText: '#F0F4FF',
          chipInactiveText: 'rgba(198, 210, 255, 0.6)',
        }
      : {
          background: '#F5F5F5',
          surface: '#FFFFFF',
          surfaceAlt: '#FFFFFF',
          surfaceMuted: '#F3F4F6',
          border: 'rgba(15, 23, 42, 0.08)',
          textPrimary: '#1F2937',
          textSecondary: '#6B7280',
          textMuted: '#9CA3AF',
          accent: '#0EA5E9',
          accentStrong: '#1E40AF',
          warning: '#F59E0B',
          chipActiveBg: '#FFFFFF',
          chipActiveText: '#1F2937',
          chipInactiveText: '#6B7280',
        }
  ), [isDarkMode]);

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    color: (opacity = 1) =>
      isDarkMode ? `rgba(56, 189, 248, ${opacity})` : `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDarkMode ? `rgba(232, 236, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
      fill: isDarkMode ? '#E8ECFF' : '#1F2937',
    },
  }), [theme, isDarkMode]);

  const cardContainerStyle = useMemo(() => ({
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: theme.border,
    shadowColor: isDarkMode ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0 : 0.08,
    shadowRadius: 8,
    elevation: isDarkMode ? 0 : 4,
  }), [theme, isDarkMode]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // For month filter, calculate startDate and endDate for current year
      let startDate = null;
      let endDate = null;

      if (selectedFilter === 'month') {
        const now = new Date();
        const year = now.getFullYear();
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
        console.log('[Dashboard] Month filter - Using date range:', { startDate, endDate });
      }

      // Fetch all dashboard data dari API seperti Flutter
      const [overviewRes, statusRes, workerRes, bdRes, bdPerBlockRes] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getDashboardStatus(selectedFilter),
        apiService.getDashboardWorker(selectedFilter),
        apiService.getDashboardData(selectedFilter, startDate, endDate),
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

  const handleExportDashboard = async () => {
    if (exporting) {
      return;
    }

    try {
      setExporting(true);
      const response = await apiService.exportDashboard(selectedFilter);

      if (response?.status_code === 200 && response?.report_url) {
        await Linking.openURL(response.report_url);
      } else {
        Alert.alert(
          'Export Failed',
          response?.message || 'Unable to generate dashboard report.'
        );
      }
    } catch (error) {
      console.error('Error exporting dashboard report:', error);
      Alert.alert(
        'Export Error',
        error?.message || 'Terjadi kesalahan saat mengekspor laporan.'
      );
    } finally {
      setExporting(false);
    }
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
        legendFontColor: theme.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'Pending',
        population: dashboardStatus.pending || 0,
        color: '#9CA3AF',
        legendFontColor: theme.textPrimary,
        legendFontSize: 12,
      },
      {
        name: 'False Detection',
        population: dashboardStatus.false_detection || 0,
        color: '#EF4444',
        legendFontColor: theme.textPrimary,
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
      legendFontColor: theme.textPrimary,
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
      legendFontColor: theme.textPrimary,
      legendFontSize: 12,
    })).filter(item => item.population > 0);
  };

  // Prepare Bar Chart Data untuk Bird Drops - Sesuai Flutter format
  const getBirdDropBarData = () => {
    if (!dashboardBd || dashboardBd.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = [];
    const data = [];

    // Generate labels based on filter type
    if (selectedFilter === 'today') {
      // Today filter - single bar, ambil value langsung dari data pertama
      labels.push('Today');
      const todayData = dashboardBd[0]; // Data hari ini
      data.push(todayData ? todayData.value : 0);

      console.log('[getBirdDropBarData] Today - Indicator:', todayData?.indicator, 'Value:', todayData?.value);
    } else if (selectedFilter === 'week') {
      // Week filter - 7 bars (Mon-Sun), indicator 1-7
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      labels.push(...days);

      for (let i = 1; i <= 7; i++) {
        const dataPoint = dashboardBd.find(item => item.indicator === i);
        data.push(dataPoint ? dataPoint.value : 0);
      }
    } else if (selectedFilter === 'month') {
      // Month filter - 12 bars (Jan-Dec), indicator 1-12
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels.push(...months);

      console.log('[getBirdDropBarData] Month - Raw API data:', JSON.stringify(dashboardBd, null, 2));

      for (let i = 1; i <= 12; i++) {
        const dataPoint = dashboardBd.find(item => item.indicator === i);
        const value = dataPoint ? dataPoint.value : 0;
        data.push(value);

        if (dataPoint) {
          console.log(`[getBirdDropBarData] Month ${i} (${months[i-1]}): Found indicator ${dataPoint.indicator} with value ${value}`);
        }
      }
    }

    console.log('[getBirdDropBarData] Filter:', selectedFilter, 'Labels:', labels.length, 'Data:', data);

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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
      }
    >
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ fontSize: 16, color: theme.textSecondary, marginTop: 16 }}>Loading Dashboard...</Text>
        </View>
      ) : (
        <>
            {/* Filter + Stats Cards Row */}
            <View style={styles.statsRow}>
              {/* Filter Chips - Vertical */}
              <View style={[
                styles.filterContainer,
                isDarkMode ? styles.filterContainerDark : styles.filterContainerLight,
                { borderColor: theme.border, borderWidth: isDarkMode ? 1 : 0 }
              ]}>
                {filterOptions.map((filter, index) => {
                  const isSelected = selectedFilter === filter.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setSelectedFilter(filter.toLowerCase())}
                      style={[
                        styles.filterChip,
                        isDarkMode && { backgroundColor: 'transparent' },
                        isSelected && (isDarkMode ? styles.filterChipActiveDark : styles.filterChipActive),
                        index < filterOptions.length - 1 && { marginBottom: 8 }
                      ]}
                    >
                      <Text style={[
                        styles.filterText,
                        { color: theme.chipInactiveText },
                        isSelected && { color: theme.chipActiveText }
                      ]}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stat Card 1: Total BD Confirmed */}
              <View style={[
                styles.statCard,
                isDarkMode ? styles.statCardBlueDark : styles.statCardBlue
              ]}>
                <Text style={[
                  styles.statLabel,
                  { color: isDarkMode ? theme.textSecondary : theme.accentStrong }
                ]}>
                  Total BD Confirmed
                </Text>
                <Text style={[
                  styles.statValue,
                  { color: isDarkMode ? theme.textPrimary : '#1E40AF' }
                ]}>
                  {dashboardOverview?.total || 0}
                </Text>
              </View>

              {/* Stat Card 2: Daily Av. BD */}
              <View style={[
                styles.statCard,
                isDarkMode ? styles.statCardPrimaryDark : styles.statCardDark
              ]}>
                <Text style={[
                  styles.statLabel,
                  { color: isDarkMode ? theme.textSecondary : 'rgba(255,255,255,0.8)' }
                ]}>
                  Daily Av. BD
                </Text>
                {dashboardOverview?.average_verified_trend && (
                  <Text style={[
                    styles.trendIcon,
                    { color: isDarkMode ? theme.warning : '#FFFFFF' }
                  ]}>
                    {dashboardOverview.average_verified_trend === 'upward' ? '📈' :
                     dashboardOverview.average_verified_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[
                    styles.statValue,
                    { color: isDarkMode ? theme.textPrimary : '#FFFFFF' }
                  ]}>
                    {dashboardOverview?.average_verified || 0}
                  </Text>
                  {dashboardOverview?.average_verified_percentage_delta != null && (
                    <Text style={[
                      styles.statPercentage,
                      { color: isDarkMode ? theme.accent : '#FFFFFF' }
                    ]}>
                      {Math.abs(dashboardOverview.average_verified_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Stat Card 3: Daily Av. Case List */}
              <View style={[
                styles.statCard,
                isDarkMode ? styles.statCardBlueDark : styles.statCardLightBlue
              ]}>
                <Text style={[
                  styles.statLabel,
                  { color: isDarkMode ? theme.textSecondary : '#FFFFFF' }
                ]}>
                  Daily Av. Case List
                </Text>
                {dashboardOverview?.average_all_trend && (
                  <Text style={[
                    styles.trendIcon,
                    { color: isDarkMode ? theme.warning : '#FFFFFF' }
                  ]}>
                    {dashboardOverview.average_all_trend === 'upward' ? '📈' :
                     dashboardOverview.average_all_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[
                    styles.statValue,
                    { color: isDarkMode ? theme.textPrimary : '#FFFFFF' }
                  ]}>
                    {dashboardOverview?.average_all || 0}
                  </Text>
                  {dashboardOverview?.average_all_percentage_delta != null && (
                    <Text style={[
                      styles.statPercentage,
                      { color: isDarkMode ? theme.accent : '#FFFFFF' }
                    ]}>
                      {Math.abs(dashboardOverview.average_all_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>

              {/* Stat Card 4: Daily Av. Block Check */}
              <View style={[
                styles.statCard,
                isDarkMode ? styles.statCardPrimaryDark : styles.statCardDark
              ]}>
                <Text style={[
                  styles.statLabel,
                  { color: isDarkMode ? theme.textSecondary : 'rgba(255,255,255,0.8)' }
                ]}>
                  Daily Av. Block Check
                </Text>
                {dashboardOverview?.average_verified_block_trend && (
                  <Text style={[
                    styles.trendIcon,
                    { color: isDarkMode ? theme.warning : '#FFFFFF' }
                  ]}>
                    {dashboardOverview.average_verified_block_trend === 'upward' ? '📈' :
                     dashboardOverview.average_verified_block_trend === 'downward' ? '📉' : '➡️'}
                  </Text>
                )}
                <View style={styles.statValueRow}>
                  <Text style={[
                    styles.statValue,
                    { color: isDarkMode ? theme.textPrimary : '#FFFFFF' }
                  ]}>
                    {dashboardOverview?.average_verified_block || 0}
                  </Text>
                  {dashboardOverview?.average_verified_block_percentage_delta != null && (
                    <Text style={[
                      styles.statPercentage,
                      { color: isDarkMode ? theme.accent : '#FFFFFF' }
                    ]}>
                      {Math.abs(dashboardOverview.average_verified_block_percentage_delta).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Export Button */}
            <View style={[
              styles.exportButtonWrapper,
              { alignSelf: 'flex-end' }
            ]}>
              <TouchableOpacity
                onPress={handleExportDashboard}
                activeOpacity={0.85}
                disabled={exporting}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#1E3A8A', '#2563EB', '#0EA5E9'] : ['#00BFFF', '#1E90FF', '#0EA5E9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.exportButtonGradient,
                    !isDarkMode && { borderColor: 'rgba(255,255,255,0)' },
                    exporting && styles.exportButtonDisabled
                  ]}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.exportButtonIcon}>📄</Text>
                      <Text style={styles.exportButtonText}>Export PDF</Text>
                      <Text style={styles.exportButtonArrow}>↗</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bar Chart: Number of Bird Drops Detected */}
            <View style={[
              cardContainerStyle,
              { marginBottom: 24 }
            ]}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16 }}>
                Number of Bird Drops Detected (True & False)
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
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>No data available</Text>
                </View>
              )}
            </View>

            {/* Row: Bird Drop Status + Worker */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
              {/* Bird Drop Status Pie Chart */}
              <View style={[
                cardContainerStyle,
                { flex: 1, marginBottom: 0 }
              ]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16 }}>
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
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>No data</Text>
                  </View>
                )}
              </View>

              {/* Worker Pie Chart */}
              <View style={[
                cardContainerStyle,
                { flex: 1, marginBottom: 0 }
              ]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16 }}>
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
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>No data</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Row: BD Confirmed Per Block + BD Per Block */}
            <View style={styles.chartsRow}>
              {/* BD Confirmed Per Block - Pie Chart */}
              <View style={[
                styles.chartCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: isDarkMode ? 1 : 0,
                  shadowColor: isDarkMode ? 'transparent' : '#000',
                  shadowOpacity: isDarkMode ? 0 : 0.1,
                  elevation: isDarkMode ? 0 : 4,
                }
              ]}>
                <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>BD Confirm Per Block</Text>
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
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data</Text>
                  </View>
                )}
              </View>

              {/* BD Per Block - Table */}
              <View style={[
                styles.chartCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: isDarkMode ? 1 : 0,
                  shadowColor: isDarkMode ? 'transparent' : '#000',
                  shadowOpacity: isDarkMode ? 0 : 0.1,
                  elevation: isDarkMode ? 0 : 4,
                }
              ]}>
                <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Bird Drop Per Block</Text>
                {dashboardBdPerBlock && dashboardBdPerBlock.length > 0 ? (
                  <View style={styles.tableContainer}>
                    {/* Header Row */}
                    <View style={[styles.tableHeader, { borderColor: theme.border }]}>
                      <Text style={[styles.tableHeaderText, { flex: 1, color: theme.textPrimary }]}>Block</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: theme.textPrimary }]}>Total{'\n'}Case List</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: theme.textPrimary }]}>Confirm</Text>
                      <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: theme.textPrimary }]}>False{'\n'}Detection</Text>
                    </View>
                    <View style={[styles.tableDivider, { backgroundColor: theme.border }]} />
                    {/* Data Rows */}
                    <ScrollView
                      style={styles.tableScroll}
                      contentContainerStyle={styles.tableScrollContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {dashboardBdPerBlock.map((item, index) => {
                        const lightColors = ['#F3E8FF', '#E8FFF3', '#E8F1FF', '#FFF7E8'];
                        const darkColors = ['rgba(59,130,246,0.18)', 'rgba(16,185,129,0.18)', 'rgba(125,211,252,0.18)', 'rgba(249,115,22,0.18)'];
                        const palette = isDarkMode ? darkColors : lightColors;
                        const baseColor = palette[index % palette.length];
                        const rowBackground = isDarkMode ? baseColor : baseColor + '66';
                        return (
                          <View
                            key={index}
                            style={[
                              styles.tableRow,
                              {
                                backgroundColor: rowBackground,
                                borderColor: isDarkMode ? theme.border : 'transparent',
                                borderWidth: isDarkMode ? 1 : 0
                              }
                            ]}
                          >
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ marginRight: 6 }}>📍</Text>
                              <Text style={[styles.tableCell, { color: theme.textPrimary }]}>BLK {item.area_code}</Text>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: theme.textPrimary }]}>
                              {item.total}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: theme.textPrimary }]}>
                              {item.true_detection}
                            </Text>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                              <View style={[styles.tableBadge, { backgroundColor: baseColor }]}>
                                <Text style={[styles.tableBadgeText, { color: theme.textPrimary }]}>{item.false_detection}</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.emptyChart}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  exportButtonWrapper: {
    marginTop: -8,
    marginBottom: 24,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  exportButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  exportButtonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  // Stats Row & Cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
  },
  filterContainerLight: {
    backgroundColor: '#F3F4F6',
  },
  filterContainerDark: {
    backgroundColor: 'rgba(25, 41, 89, 0.6)',
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
  filterChipActiveDark: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  statCardBlueDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  statCardPrimaryDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(79, 132, 255, 0.28)',
  },
  statLabel: {
    fontSize: 12,
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
    borderRadius: 12,
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },

  // Table
  tableContainer: {
    maxHeight: 300,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableDivider: {
    height: 1.2,
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
  },
  tableBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  tableScroll: {
    maxHeight: 240,
  },
  tableScrollContent: {
    paddingBottom: 8,
  },
});
