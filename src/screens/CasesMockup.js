import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image, Modal, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/ApiService';
import DynamicHeader from '../components/shared/DynamicHeader';
import BulkAssignDialog from '../components/cases/BulkAssignDialog';
import AssigneeDropdown from '../components/cases/AssigneeDropdown';
import ValidationButton from '../components/cases/ValidationButton';
import ValidationOptionsDialog from '../components/cases/ValidationOptionsDialog';
import ExportCaseDialog from '../components/cases/ExportCaseDialog';

const { width } = Dimensions.get('window');

// ✅ Error Boundary Component to catch crashes
class CasesErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CasesMockup] ❌ Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444', marginBottom: 12 }}>
            ⚠️ Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0EA5E9', borderRadius: 8 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function CasesMockupContent({ session, setActiveMenu, setSession }) {
  // FIX: Prevent duplicate console logs
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    console.log('[CasesMockup] ✅ LOADED WITH NEW FEATURES: Bulk Assign, Assignee Dropdown, Validation Button, Export Dialog');
    hasLoggedRef.current = true;
  }

  const [selectedArea, setSelectedArea] = useState(null);
  const [casesData, setCasesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0); // 0 = case_photo, 1 = origin_photo

  // Pagination states for lazy loading
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // New feature states
  const [workers, setWorkers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // FIX: Tambahkan ref untuk track mounted status dan prevent memory leaks
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const isInitialLoadRef = useRef(false);

  // FIX: Cleanup saat component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isLoadingRef.current = false;
      console.log('[CasesMockup] Cleanup: Component unmounting, cancelling pending operations');
    };
  }, []);

  // FIX: Load initial data when area filter changes dengan mounted check
  // useEffect akan dipindah setelah loadInitialData didefinisikan

  const loadCases = useCallback(async (page = 1, append = false) => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      if (!append && isMountedRef.current) {
        setLoading(true);
      }

      const response = await apiService.getCaseList({
        pageSize: 10, // ✅ Load only 10 rows at a time
        page: page,
        filterAreaCode: selectedArea,
      });

      console.log(`[CasesMockup] Loading page ${page}, Cases Response:`, response);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('[CasesMockup] Component unmounted, skipping state update');
        return;
      }

      if (response.success && response.data) {
        if (append) {
          // Append new data to existing
          setCasesData(prev => [...prev, ...response.data]);
        } else {
          // Replace with fresh data
          setCasesData(response.data);
        }

        setPagination(response.pagination);

        // Check if there are more pages
        if (response.pagination) {
          const totalPages = Math.ceil(response.pagination.row_count / 10);
          setHasMore(page < totalPages);
        } else {
          setHasMore(false);
        }
      } else {
        if (!append) {
          setCasesData([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[CasesMockup] Error loading cases:', error);
        if (!append) {
          setCasesData([]);
        }
        setHasMore(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [selectedArea]);

  const loadWorkers = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      console.log('[CasesMockup] 📥 Loading workers...');
      const response = await apiService.getWorkers();

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (response && response.success && response.data && Array.isArray(response.data)) {
        console.log('[CasesMockup] ✅ Workers loaded:', response.data.length);
        setWorkers(response.data);
      } else if (Array.isArray(response)) {
        console.log('[CasesMockup] ✅ Workers loaded (direct array):', response.length);
        setWorkers(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        console.log('[CasesMockup] ⚠️ Workers loaded (success=false):', response.data.length);
        setWorkers(response.data);
      } else {
        console.warn('[CasesMockup] ⚠️ Invalid workers response, keeping existing data');
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[CasesMockup] ❌ Error loading workers:', error);
      }
    }
  }, []);

  const loadAreas = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      console.log('[CasesMockup] 📥 Loading areas...');
      const response = await apiService.getAreas();

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (response && response.success && response.data && Array.isArray(response.data)) {
        console.log('[CasesMockup] ✅ Areas loaded:', response.data.length);
        setAreas(response.data);
      } else if (response && response.data && Array.isArray(response.data)) {
        console.log('[CasesMockup] ⚠️ Areas loaded (success=false):', response.data.length);
        setAreas(response.data);
      } else {
        console.warn('[CasesMockup] ⚠️ Invalid areas response, keeping existing data');
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[CasesMockup] ❌ Error loading areas:', error);
      }
    }
  }, []);

  // FIX: loadInitialData dipindah setelah loadCases, loadWorkers, loadAreas didefinisikan
  const loadInitialData = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      console.log('[CasesMockup] 🔄 Loading initial data...');
      await Promise.all([
        loadCases(),
        loadWorkers(),
        loadAreas(),
      ]);
      if (isMountedRef.current) {
        console.log('[CasesMockup] ✅ Initial data loaded successfully');
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[CasesMockup] ❌ Error loading initial data:', error);
      }
    }
  }, [loadCases, loadWorkers, loadAreas]);

  // FIX: Load initial data when area filter changes dengan mounted check
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('[CasesMockup] Already loading, skipping duplicate load');
      return;
    }

    const loadData = async () => {
      if (!isMountedRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        // Reset pagination and reload from page 1
        if (isMountedRef.current) {
          setCurrentPage(1);
          setHasMore(true);
          setCasesData([]);
        }
        await loadInitialData();
      } catch (error) {
        if (isMountedRef.current) {
          console.error('[CasesMockup] Error in useEffect loadData:', error);
        }
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArea]); // loadInitialData dependency diabaikan untuk mencegah infinite loop

  const onRefresh = useCallback(async () => {
    if (!isMountedRef.current || refreshing || isLoadingRef.current) {
      return;
    }

    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    try {
      await loadInitialData();
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [loadInitialData, refreshing]);

  // Load more data when scrolling to bottom
  const loadMoreCases = async () => {
    if (loadingMore || !hasMore || loading) {
      return; // Prevent multiple simultaneous loads
    }

    console.log('[CasesMockup] Loading more cases, page:', currentPage + 1);
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadCases(nextPage, true); // append = true
  };

  // Detect when user scrolls to bottom
  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200; // Trigger earlier (200px before bottom)
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !loadingMore && !loading) {
      console.log('[CasesMockup] 🔄 Scroll reached bottom, loading more...');
      loadMoreCases();
    }
  };

  const handleImagePress = (caseItem) => {
    setSelectedImage(caseItem.images);
    setImageViewIndex(0); // Start with detected image
    setImageModalVisible(true);
  };

  const toggleImageView = () => {
    setImageViewIndex(prev => prev === 0 ? 1 : 0);
  };

  // New feature handlers
  const handleBulkAssign = async (workerId) => {
    try {
      const response = await apiService.bulkAssign(workerId);
      if (response.success) {
        Alert.alert('Success', 'Bulk assign completed successfully');
        setShowBulkAssignDialog(false);
        loadCases();
      }
    } catch (error) {
      console.error('[CasesMockup] Error bulk assigning:', error);
      Alert.alert('Error', 'Failed to bulk assign workers');
    }
  };

  const handleAssigneeChange = async (caseItem, worker) => {
    try {
      const response = await apiService.assignWorker(caseItem.id, worker.id);
      if (response.success) {
        // Update local state
        setCasesData(prevCases =>
          prevCases.map(c =>
            c.id === caseItem.id ? { ...c, worker } : c
          )
        );
      }
    } catch (error) {
      console.error('[CasesMockup] Error assigning worker:', error);
      Alert.alert('Error', 'Failed to assign worker');
    }
  };

  const handleValidationPress = (caseItem, hasWorker) => {
    if (!hasWorker) {
      Alert.alert('Error', 'Please assign a worker first');
      return;
    }
    setSelectedCase(caseItem);
    setShowValidationDialog(true);
  };

  const handleValidateCase = async (statusId) => {
    if (!selectedCase) return;

    try {
      const response = await apiService.validateCase(selectedCase.id, statusId);
      if (response.success) {
        Alert.alert('Success', 'Case validated successfully');
        setShowValidationDialog(false);
        loadCases();
      }
    } catch (error) {
      console.error('[CasesMockup] Error validating case:', error);
      Alert.alert('Error', 'Failed to validate case');
    }
  };

  const handleGenerateReport = async (areaCode) => {
    try {
      const response = await apiService.generateReport(areaCode);
      if (response.success) {
        return { reportUrl: response.reportUrl || response.data?.reportUrl };
      }
      throw new Error('Failed to generate report');
    } catch (error) {
      console.error('[CasesMockup] Error generating report:', error);
      throw error;
    }
  };

  const handleSendEmail = async (reportUrl) => {
    try {
      const response = await apiService.sendReportViaEmail(reportUrl);
      if (!response.success) {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('[CasesMockup] Error sending email:', error);
      throw error;
    }
  };

  // FIX: applyAreaFilter dengan mounted check
  const applyAreaFilter = useCallback((areaCode) => {
    if (!isMountedRef.current) {
      return;
    }
    setSelectedArea(areaCode);
    setShowFilterModal(false);
    // Data will reload because of useEffect dependency
  }, []);

  // FIX: resetFilter dengan mounted check dan prevent double call
  const resetFilter = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    // Only reset if area is actually selected (prevent unnecessary state update)
    if (selectedArea !== null) {
      setSelectedArea(null);
    }
    setShowFilterModal(false);
  }, [selectedArea]);


  const getStatusColor = (statusName) => {
    switch (statusName) {
      case 'Completed':
      case 'Complete':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'In Progress':
      case 'Processing':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Not Started':
      case 'Pending':
        return { bg: '#F3F4F6', text: '#6B7280' };
      case 'Failed':
      case 'Error':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Dynamic Header Component */}
      <DynamicHeader
        title="Cases Management"
        subtitle="Track and Monitor All Drone Operations"
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
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <TouchableOpacity
          onPress={() => setActiveMenu('dashboard')}
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#6B7280' }}>Dashboard</Text>
        </TouchableOpacity>

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
          <Text style={{ fontSize: 18 }}>📋</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Cases</Text>
        </View>

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
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Filter & Stats Card */}
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
          {/* Header Row with Title and Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {/* Left Side - Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#0EA5E9',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 24 }}>📋</Text>
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937' }}>
                  CASES OVERVIEW
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  {pagination?.row_count || casesData.length} Total Cases
                </Text>
              </View>
            </View>

            {/* Right Side - Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {/* Filter Area Dropdown */}
              <TouchableOpacity
                onPress={() => setShowFilterModal(true)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 14 }}>📍</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
                  {selectedArea && Array.isArray(areas) && areas.length > 0 ? areas.find(a => a.code === selectedArea)?.name || 'All Areas' : 'All Areas'}
                </Text>
                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>▼</Text>
              </TouchableOpacity>

              {/* Bulk Assign Button */}
              <TouchableOpacity
                onPress={() => {
                  if (workers && workers.length > 0) {
                    setShowBulkAssignDialog(true);
                  } else {
                    Alert.alert('Info', 'Workers data not available. Please refresh the page.');
                  }
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                  opacity: workers && workers.length > 0 ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 14 }}>👥</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
                  Bulk Assign
                </Text>
              </TouchableOpacity>

              {/* Export Button */}
              <TouchableOpacity
                onPress={() => setShowExportDialog(true)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 6,
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 14 }}>📄</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
                  Export
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View key="stat-completed" style={{ flex: 1, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#065F46' }}>
                {Array.isArray(casesData) ? casesData.filter(c => c.status?.name === 'Completed' || c.status?.name === 'Complete').length : 0}
              </Text>
              <Text style={{ fontSize: 12, color: '#065F46' }}>Completed</Text>
            </View>
            <View key="stat-progress" style={{ flex: 1, backgroundColor: '#DBEAFE', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E40AF' }}>
                {Array.isArray(casesData) ? casesData.filter(c => c.status?.name === 'In Progress' || c.status?.name === 'Processing').length : 0}
              </Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}>In Progress</Text>
            </View>
            <View key="stat-notstarted" style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#6B7280' }}>
                {Array.isArray(casesData) ? casesData.filter(c => c.status?.name === 'Not Started' || c.status?.name === 'Pending').length : 0}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Not Started</Text>
            </View>
            <View key="stat-failed" style={{ flex: 1, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#991B1B' }}>
                {Array.isArray(casesData) ? casesData.filter(c => c.status?.name === 'Failed' || c.status?.name === 'Error').length : 0}
              </Text>
              <Text style={{ fontSize: 12, color: '#991B1B' }}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Cases Table */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          {/* Table Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#F3F4F6',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <Text style={{ flex: 0.4, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>NO</Text>
            <Text style={{ flex: 0.8, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>PHOTO</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>AREA</Text>
            <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>DATE</Text>
            <Text style={{ flex: 1.8, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>ASSIGNED</Text>
            <Text style={{ flex: 1.3, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>VALIDATION</Text>
            <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>STATUS</Text>
          </View>

          {/* Table Rows */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0EA5E9" />
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>Loading cases...</Text>
            </View>
          ) : casesData.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>No cases found</Text>
            </View>
          ) : (
            casesData.map((caseItem, index) => {
              const statusColors = getStatusColor(caseItem.status?.name);
              return (
                <View
                  key={caseItem.id}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderBottomWidth: index < casesData.length - 1 ? 1 : 0,
                    borderBottomColor: '#F3F4F6',
                    backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ flex: 0.4, fontSize: 14, color: '#1F2937', fontWeight: '600' }}>
                    {index + 1}
                  </Text>
                  <TouchableOpacity
                    style={{ flex: 0.8, justifyContent: 'center' }}
                    onPress={() => handleImagePress(caseItem)}
                  >
                    {caseItem.images?.thumbnail ? (
                      <Image
                        source={{ uri: caseItem.images.thumbnail }}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 8,
                          backgroundColor: '#E0F2FE',
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: '#E0F2FE',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 20 }}>📷</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={{ flex: 1, fontSize: 14, color: '#1F2937' }}>
                    {caseItem.carpool?.block || '-'}
                  </Text>
                  <Text style={{ flex: 1.2, fontSize: 14, color: '#6B7280' }}>
                    {formatDate(caseItem.detected_date)}
                  </Text>
                  <View style={{ flex: 1.8, paddingRight: 8 }}>
                    {Array.isArray(workers) && workers.length > 0 ? (
                      <AssigneeDropdown
                        currentWorker={caseItem.worker}
                        workers={workers}
                        onWorkerChange={(worker) => handleAssigneeChange(caseItem, worker)}
                      />
                    ) : (
                      <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                        {caseItem.worker?.fullname || '-'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1.3, paddingRight: 8 }}>
                    <ValidationButton
                      statusName={caseItem.status?.name}
                      onPress={(hasWorker) => handleValidationPress(caseItem, hasWorker)}
                      hasWorker={!!caseItem.worker}
                    />
                  </View>
                  <View style={{ flex: 1.2 }}>
                    <View style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      backgroundColor: statusColors.bg,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: statusColors.text }}>
                        {caseItem.status?.name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <View style={{
              paddingVertical: 24,
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB'
            }}>
              <ActivityIndicator size="large" color="#0EA5E9" />
              <Text style={{ fontSize: 14, color: '#374151', marginTop: 12, fontWeight: '600' }}>
                Loading more cases...
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                Page {currentPage} of {pagination ? Math.ceil(pagination.row_count / 10) : '...'}
              </Text>
            </View>
          )}

          {/* End of List Indicator */}
          {!hasMore && !loadingMore && casesData.length > 0 && (
            <View style={{
              paddingVertical: 20,
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB'
            }}>
              <Text style={{ fontSize: 14, color: '#10B981', fontWeight: '600' }}>✓ All Cases Loaded</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {casesData.length} total cases displayed
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bulk Assign Dialog */}
      {Array.isArray(workers) && workers.length > 0 && (
        <BulkAssignDialog
          visible={showBulkAssignDialog}
          onClose={() => setShowBulkAssignDialog(false)}
          workers={workers}
          onBulkAssign={handleBulkAssign}
        />
      )}

      {/* Validation Options Dialog */}
      <ValidationOptionsDialog
        visible={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={handleValidateCase}
        caseName={selectedCase?.carpool?.block}
      />

      {/* Export Case Dialog */}
      {Array.isArray(areas) && areas.length > 0 && (
        <ExportCaseDialog
          visible={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          areas={areas}
          onGenerateReport={handleGenerateReport}
          onSendEmail={handleSendEmail}
        />
      )}

      {/* Filter Area Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: width * 0.85,
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>
                Filter by Area
              </Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={{ fontSize: 24, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Area List */}
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true}>
              {/* All Areas Option */}
              <TouchableOpacity
                key="all-areas"
                onPress={() => {
                  // FIX: Close modal first, then reset filter to prevent double call
                  setShowFilterModal(false);
                  // Use setTimeout to ensure state update happens after modal closes
                  setTimeout(() => {
                    if (isMountedRef.current && selectedArea !== null) {
                      setSelectedArea(null);
                    }
                  }, 100);
                }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: !selectedArea ? '#E0F2FE' : '#F9FAFB',
                  borderWidth: !selectedArea ? 2 : 1,
                  borderColor: !selectedArea ? '#0EA5E9' : '#E5E7EB',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: !selectedArea ? '700' : '500',
                  color: !selectedArea ? '#0EA5E9' : '#1F2937',
                }}>
                  All Areas
                </Text>
                {!selectedArea && (
                  <Text style={{ fontSize: 18, color: '#0EA5E9' }}>✓</Text>
                )}
              </TouchableOpacity>

              {/* Individual Areas */}
              {Array.isArray(areas) && areas.length > 0 ? (
                areas.map((area) => (
                  <TouchableOpacity
                    key={`area-${area.code || area.id || Math.random()}`}
                    onPress={() => {
                      // FIX: Close modal first, then apply filter
                      setShowFilterModal(false);
                      setTimeout(() => {
                        if (isMountedRef.current) {
                          applyAreaFilter(area.code);
                        }
                      }, 100);
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      marginBottom: 8,
                      backgroundColor: selectedArea === area.code ? '#E0F2FE' : '#F9FAFB',
                      borderWidth: selectedArea === area.code ? 2 : 1,
                      borderColor: selectedArea === area.code ? '#0EA5E9' : '#E5E7EB',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: selectedArea === area.code ? '700' : '500',
                      color: selectedArea === area.code ? '#0EA5E9' : '#1F2937',
                    }}>
                      {area.name || 'Unknown Area'}
                    </Text>
                    {selectedArea === area.code && (
                      <Text style={{ fontSize: 18, color: '#0EA5E9' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View key="no-areas" style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    No areas available
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  // FIX: Reset filter and close modal
                  setShowFilterModal(false);
                  setTimeout(() => {
                    if (isMountedRef.current && selectedArea !== null) {
                      setSelectedArea(null);
                    }
                  }, 100);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>
                  RESET
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#0EA5E9',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  APPLY
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setImageModalVisible(false)}
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text style={{ fontSize: 24, color: '#FFFFFF' }}>✕</Text>
          </TouchableOpacity>

          {/* Image Title */}
          <View style={{
            position: 'absolute',
            top: 40,
            left: 20,
            right: 80,
            zIndex: 10,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {imageViewIndex === 0 ? 'Detected Image' : 'Original Image'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Swipe or tap toggle button to switch view
            </Text>
          </View>

          {/* Image Display */}
          {selectedImage && (
            <View style={{ width: width * 0.9, height: width * 0.9 }}>
              <Image
                source={{
                  uri: imageViewIndex === 0
                    ? selectedImage.case_photo
                    : selectedImage.origin_photo
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 12,
                }}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Toggle Button */}
          <TouchableOpacity
            onPress={toggleImageView}
            style={{
              position: 'absolute',
              bottom: 40,
              backgroundColor: '#0EA5E9',
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#0EA5E9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 20 }}>↔️</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
              {imageViewIndex === 0 ? 'Show Original' : 'Show Detected'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ✅ Export with Error Boundary wrapper
export default function CasesMockup(props) {
  return (
    <CasesErrorBoundary>
      <CasesMockupContent {...props} />
    </CasesErrorBoundary>
  );
}
