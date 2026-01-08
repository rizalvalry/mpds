import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image, Modal, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import apiService from '../services/ApiService';
import DynamicHeader from '../components/shared/DynamicHeader';
import { useTheme } from '../contexts/ThemeContext';
import BulkAssignDialog from '../components/cases/BulkAssignDialog';
import BulkValidateDialog from '../components/cases/BulkValidateDialog';
import BulkCancelationDialog from '../components/cases/BulkCancelationDialog';
import AssigneeDropdown from '../components/cases/AssigneeDropdown';
import ValidationButton from '../components/cases/ValidationButton';
import ValidationOptionsDialog from '../components/cases/ValidationOptionsDialog';
import ExportCaseDialog from '../components/cases/ExportCaseDialog';
import SuccessNotification from '../components/shared/SuccessNotification';

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

function CasesMockupContent({ session, setActiveMenu, setSession, embedded = false, onNavigate }) {
  console.log('[CasesMockup] ✅ LOADED WITH NEW FEATURES: Bulk Assign, Bulk Validate, Assignee Dropdown, Validation Button, Export Dialog, Advanced Filters');
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
  const [showBulkValidateDialog, setShowBulkValidateDialog] = useState(false);
  const [showBulkCancelationDialog, setShowBulkCancelationDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Advanced filter states
  const [filterIsConfirmed, setFilterIsConfirmed] = useState(null); // null = all, true = confirmed, false = not confirmed
  const [filterStatus, setFilterStatus] = useState(null); // null = all, 1 = Not Started, etc.

  // Success notification
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { theme, isDarkMode } = useTheme();
  const handleForceLogout = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      // ignore
    } finally {
      setSession && setSession(null);
    }
  };

  const handleSessionExpired = (origin = 'cases') => {
    console.warn(`[CasesMockup] Session expired while loading ${origin}, forcing logout`);
    Alert.alert('Session Expired', 'Sesi Anda telah berakhir. Silakan login kembali.', [
      { text: 'OK', onPress: handleForceLogout },
    ]);
    handleForceLogout();
  };

  // Load initial data when filters change
  useEffect(() => {
    let isMounted = true; // ✅ Track mount status to prevent state updates after unmount

    const loadData = async () => {
      if (!isMounted) return; // ✅ Safety check

      try {
        // Reset pagination and reload from page 1
        setCurrentPage(1);
        setHasMore(true);
        setCasesData([]);
        await loadInitialData();
      } catch (error) {
        console.error('[CasesMockup] Error in useEffect loadData:', error);
        // Don't propagate error to prevent crash
      }
    };

    loadData();

    // ✅ Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      console.log('[CasesMockup] Cleanup: Component unmounting, cancelling pending operations');
    };
  }, [selectedArea, filterIsConfirmed, filterStatus]); // Re-load when any filter changes

  const loadInitialData = async () => {
    try {
      console.log('[CasesMockup] 🔄 Loading initial data...');
      await Promise.all([
        loadCases(),
        loadWorkers(),
        loadAreas(),
      ]);
      console.log('[CasesMockup] ✅ Initial data loaded successfully');
    } catch (error) {
      console.error('[CasesMockup] ❌ Error loading initial data:', error);
      // Don't throw - just log to prevent crashes
    }
  };

  const loadCases = async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }

      // adminAreaId (user_id) is automatically retrieved from AsyncStorage in ApiService
      // No need to pass it explicitly - ApiService will get area_id from storage
      const response = await apiService.getCaseList({
        pageSize: 100, // Load 100 records per page as per spec
        page: page,
        filterAreaCode: selectedArea, // Specific area filter (L, C, D, K) - null means all areas
        filterIsConfirmed: filterIsConfirmed,
        filterStatusIds: filterStatus,
        // adminAreaId: removed - ApiService gets it from AsyncStorage automatically
      });

      console.log(`[CasesMockup] ====== LOAD CASES RESPONSE ======`);
      console.log(`[CasesMockup] Page: ${page}, Append: ${append}`);
      console.log(`[CasesMockup] Response success: ${response.success}`);
      console.log(`[CasesMockup] Data count: ${response.data?.length || 0}`);
      console.log('[CasesMockup] Active filters:', {
        area: selectedArea || 'all areas (null)',
        isConfirmed: filterIsConfirmed,
        statusId: filterStatus,
        note: 'areaId (user_id) is auto-added by ApiService from AsyncStorage',
      });
      console.log(`[CasesMockup] ================================`);

      if (response.success && response.data) {
        if (append) {
          // Append new data to existing
          console.log(`[CasesMockup] Appending ${response.data.length} cases to existing ${casesData.length} cases`);
          setCasesData(prev => [...prev, ...response.data]);
        } else {
          // Replace with fresh data
          console.log(`[CasesMockup] Replacing all data with ${response.data.length} new cases`);
          setCasesData(response.data);
        }

        setPagination(response.pagination);

        // Check if there are more pages
        if (response.pagination) {
          const totalPages = Math.ceil(response.pagination.row_count / 100);
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
      console.error('[CasesMockup] Error loading cases:', error);
      if (error?.message === 'SESSION_EXPIRED') {
        handleSessionExpired('cases');
        return;
      }
      if (!append) {
        setCasesData([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadWorkers = async () => {
    try {
      console.log('[CasesMockup] 📥 Loading workers...');
      const response = await apiService.getWorkers();

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
      console.error('[CasesMockup] ❌ Error loading workers:', error);
      if (error?.message === 'SESSION_EXPIRED') {
        handleSessionExpired('workers');
        return;
      }
      // Keep existing workers, don't crash
    }
  };

  const loadAreas = async () => {
    try {
      console.log('[CasesMockup] 📥 Loading areas...');
      const response = await apiService.getAreas();

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
      console.error('[CasesMockup] ❌ Error loading areas:', error);
      if (error?.message === 'SESSION_EXPIRED') {
        handleSessionExpired('areas');
        return;
      }
      // Keep existing areas, don't crash
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await loadInitialData();
    setRefreshing(false);
  };

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
    console.log('[CasesMockup] handleImagePress - caseItem.images:', JSON.stringify(caseItem.images, null, 2));
    console.log('[CasesMockup] handleImagePress - Full caseItem keys:', Object.keys(caseItem));
    setSelectedImage(caseItem.images);
    setImageViewIndex(0); // Start with detected image
    setImageModalVisible(true);
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

  const handleBulkAreaConfirm = async (workerId, areaCodes, statusId) => {
    try {
      console.log('[CasesMockup] Bulk Area Confirm:', { workerId, areaCodes, statusId });
      const response = await apiService.bulkUpdateCases(workerId, areaCodes, statusId);

      if (response.success) {
        const updatedCount = response.updated_count || 0;
        const statusLabel = statusId === 4 ? 'Confirmed (True)' : 'False Detection';

        Alert.alert(
          'Success',
          `Successfully updated ${updatedCount} case(s) to ${statusLabel}\n\n${response.message || ''}`
        );
        setShowBulkAssignDialog(false);
        loadCases(); // Refresh data
      } else {
        throw new Error(response.message || 'Failed to update cases');
      }
    } catch (error) {
      console.error('[CasesMockup] Error bulk area confirm:', error);
      Alert.alert('Error', error.message || 'Failed to bulk confirm area cases');
    }
  };

  const handleBulkValidate = async (workerId, areaCodes, statusId) => {
    try {
      console.log('[CasesMockup] Bulk Validate:', { workerId, areaCodes, statusId });
      
      // Backend only supports single areaCode per request
      // Loop through each area code and send separate requests
      const areaCodeArray = Array.isArray(areaCodes) ? areaCodes : [areaCodes];
      let totalUpdated = 0;
      const results = [];
      const errors = [];

      for (const areaCode of areaCodeArray) {
        try {
          console.log(`[CasesMockup] Bulk Validate - Processing area: ${areaCode}`);
          const response = await apiService.bulkUpdateCases(workerId, areaCode, statusId);
          
          if (response.success) {
            const count = response.updated_count || response.UpdatedCount || 0;
            totalUpdated += count;
            results.push({ areaCode, count, success: true });
            console.log(`[CasesMockup] Bulk Validate - Area ${areaCode}: ${count} cases updated`);
          } else {
            errors.push({ areaCode, message: response.message || 'Unknown error' });
            console.warn(`[CasesMockup] Bulk Validate - Area ${areaCode} failed: ${response.message}`);
          }
        } catch (areaError) {
          errors.push({ areaCode, message: areaError.message });
          console.error(`[CasesMockup] Bulk Validate - Area ${areaCode} error:`, areaError);
        }
      }

      // Show summary result
      if (totalUpdated > 0 || errors.length === 0) {
        const successAreas = results.filter(r => r.success && r.count > 0).map(r => `${r.areaCode}: ${r.count}`).join(', ');
        const errorAreas = errors.map(e => e.areaCode).join(', ');
        
        let message = `Successfully validated ${totalUpdated} case(s)\n\nStatus set to: Progress (ID: 2)`;
        if (successAreas) message += `\n\nAreas updated: ${successAreas}`;
        if (errorAreas) message += `\n\n⚠️ Failed areas: ${errorAreas}`;
        
        Alert.alert('Success', message);
        setShowBulkValidateDialog(false);
        loadCases(); // Refresh data
      } else {
        throw new Error(`All areas failed to validate. Errors: ${errors.map(e => `${e.areaCode}: ${e.message}`).join('; ')}`);
      }
    } catch (error) {
      console.error('[CasesMockup] Error bulk validate:', error);
      Alert.alert('Error', error.message || 'Failed to bulk validate cases');
    }
  };

  const handleBulkCancelation = async (areaCode, statusId) => {
    try {
      console.log('[CasesMockup] Bulk Cancelation:', { areaCode, statusId });
      const response = await apiService.bulkCancelation(areaCode, statusId);

      if (response.success) {
        const updatedCount = response.updated_count || 0;

        Alert.alert(
          'Success',
          `Successfully canceled ${updatedCount} case(s) in Area ${areaCode}\n\nStatus set to: Not Started (ID: 1)\n\n${response.message || ''}`
        );
        setShowBulkCancelationDialog(false);
        loadCases(); // Refresh data
      } else {
        throw new Error(response.message || 'Failed to cancel area block');
      }
    } catch (error) {
      console.error('[CasesMockup] Error bulk cancelation:', error);
      Alert.alert('Error', error.message || 'Failed to cancel area block');
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
        // SPA-style: Update local state immediately without full reload
        // Map statusId to status name for UI update
        const statusMap = {
          1: { id: 1, name: 'Not Started' },
          2: { id: 2, name: 'In Progress' },
          3: { id: 3, name: 'Completed' },
          4: { id: 4, name: 'Failed' },
        };

        const newStatus = statusMap[statusId] || { id: statusId, name: 'Unknown' };

        // Update the specific case in local state (real-time update)
        setCasesData(prevCases =>
          prevCases.map(c =>
            c.id === selectedCase.id
              ? { ...c, status: newStatus, is_confirmed: true }
              : c
          )
        );

        console.log('[CasesMockup] Real-time update: Case', selectedCase.id, 'status changed to', newStatus.name);

        // Show success notification (can be dismissed by clicking anywhere)
        setSuccessMessage('Case validated successfully');
        setShowSuccessNotification(true);
        setShowValidationDialog(false);
        setSelectedCase(null);

        // No need to call loadCases() - state is already updated
      }
    } catch (error) {
      console.error('[CasesMockup] Error validating case:', error);
      Alert.alert('Error', 'Failed to validate case');
    }
  };

  const handleGenerateReport = async (areaCode) => {
    try {
      console.log('[CasesMockup] Generating report for areaCode:', areaCode);
      const response = await apiService.generateReport(areaCode);
      console.log('[CasesMockup] Generate report response:', response);

      if (response.success) {
        return {
          reportUrl: response.report_url,
          encodeBase64: response.encode_base64
        };
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

  const applyAreaFilter = (areaCode) => {
    console.log(`[CasesMockup] applyAreaFilter called with areaCode: ${areaCode}`);
    setSelectedArea(areaCode);
    setShowFilterModal(false);
    // Data will reload because of useEffect dependency on selectedArea
  };

  const resetFilter = () => {
    console.log('[CasesMockup] resetFilter called - setting selectedArea to null');
    setSelectedArea(null);
    setShowFilterModal(false);
    // Data will reload because of useEffect dependency on selectedArea
  };


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
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

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
            title="Cases Management"
            subtitle="Track and Monitor All Drone Operations"
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
                  <Text style={{ fontSize: 18 }}>📋</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Cases</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleNavigate('monitoring')}
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Monitoring</Text>
                </TouchableOpacity>
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
                  {pagination?.row_count || casesData.length} Total Cases (Today)
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
                  backgroundColor: '#95b6ed',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: '#f0f3f5',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>
                  {selectedArea && Array.isArray(areas) && areas.length > 0 ? areas.find(a => a.area_code === selectedArea)?.name || 'All Areas' : 'All Areas'}
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
                  backgroundColor: '#67b6db',
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

              {/* Bulk Validate Button */}
              <TouchableOpacity
                onPress={() => {
                  if (workers && workers.length > 0) {
                    setShowBulkValidateDialog(true);
                  } else {
                    Alert.alert('Info', 'Workers data not available. Please refresh the page.');
                  }
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 6,
                  backgroundColor: '#00D9FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                  opacity: workers && workers.length > 0 ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 14, color: '#FFFFFF' }}>✓</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                  Bulk Validate
                </Text>
              </TouchableOpacity>

              {/* Cancelation Button */}
              <TouchableOpacity
                onPress={() => {
                  if (areas && areas.length > 0) {
                    setShowBulkCancelationDialog(true);
                  } else {
                    Alert.alert('Info', 'Area data not available. Please refresh the page.');
                  }
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 6,
                  backgroundColor: '#EF4444',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                  opacity: areas && areas.length > 0 ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 14, color: '#FFFFFF' }}>✖</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                  Cancelation
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

          {/* Filter Chips Row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* All Filter */}
            <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(null);
                setFilterStatus(null);
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterIsConfirmed === null && filterStatus === null ? '#0EA5E9' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterIsConfirmed === null && filterStatus === null ? '#0EA5E9' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterIsConfirmed === null && filterStatus === null ? '#FFFFFF' : '#6B7280',
              }}>
                All Cases
              </Text>
            </TouchableOpacity>

            {/* Confirmed Filter */}
            <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(true);
                setFilterStatus(null);
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterIsConfirmed === true ? '#10B981' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterIsConfirmed === true ? '#10B981' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterIsConfirmed === true ? '#FFFFFF' : '#6B7280',
              }}>
                ✓ Confirmed
              </Text>
            </TouchableOpacity>

            {/* Not Confirmed Filter */}
            <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(false);
                setFilterStatus(null);
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterIsConfirmed === false ? '#F59E0B' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterIsConfirmed === false ? '#F59E0B' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterIsConfirmed === false ? '#FFFFFF' : '#6B7280',
              }}>
                ⏳ Not Confirmed
              </Text>
            </TouchableOpacity>

            {/* Not Started Filter */}
            <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(null);
                setFilterStatus(1); // statusId 1 = Not Started
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterStatus === 1 ? '#EF4444' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterStatus === 1 ? '#EF4444' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterStatus === 1 ? '#FFFFFF' : '#6B7280',
              }}>
                🚫 Not Started
              </Text>
            </TouchableOpacity>

            {/* True Detection Filter (statusId = 4) * matikan dulu saat ini/}
            {/* <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(null);
                setFilterStatus(4); // statusId 4 = True Detection
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterStatus === 4 ? '#22C55E' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterStatus === 4 ? '#22C55E' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterStatus === 4 ? '#FFFFFF' : '#6B7280',
              }}>
                ✅ True
              </Text>
            </TouchableOpacity> */}

            {/* False Detection Filter (statusId = 5) * matikan dulu saat ini/}
            {/* <TouchableOpacity
              onPress={() => {
                setFilterIsConfirmed(null);
                setFilterStatus(5); // statusId 5 = False Detection
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: filterStatus === 5 ? '#EF4444' : '#F3F4F6',
                borderWidth: 1,
                borderColor: filterStatus === 5 ? '#EF4444' : '#E5E7EB',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: filterStatus === 5 ? '#FFFFFF' : '#6B7280',
              }}>
                ❌ False
              </Text>
            </TouchableOpacity> */}
          </View>

          {/* Quick Stats */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View key="stat-completed" style={{ flex: 1, backgroundColor: '#00ffff', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#004B4D' }}>
                {casesData.filter(c => c.status?.name === 'Completed' || c.status?.name === 'Complete').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#004B4D' }}>Completed</Text>
            </View>
            <View key="stat-progress" style={{ flex: 1, backgroundColor: '#00ebff', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#004556' }}>
                {casesData.filter(c => c.status?.name === 'In Progress' || c.status?.name === 'Processing').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#004556' }}>In Progress</Text>
            </View>
            <View key="stat-notstarted" style={{ flex: 1, backgroundColor: '#00d9ff', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#003F4D' }}>
                {casesData.filter(c => c.status?.name === 'Not Started' || c.status?.name === 'Pending').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#003F4D' }}>Not Started</Text>
            </View>
            <View key="stat-failed" style={{ flex: 1, backgroundColor: '#00baff', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#003544' }}>
                {casesData.filter(c => c.status?.name === 'Failed' || c.status?.name === 'Error').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#003544' }}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Cases Table with Sticky Header */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          maxHeight: 600, // Set max height for table to enable internal scroll
        }}>
          {/* Table Header - STICKY/FREEZE */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#F3F4F6',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            zIndex: 10,
            elevation: 5,
          }}>
            <Text style={{ flex: 0.4, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>NO</Text>
            <Text style={{ flex: 0.8, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>PHOTO</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>AREA</Text>
            <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>DATE</Text>
            <Text style={{ flex: 1.8, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>ASSIGNED</Text>
            <Text style={{ flex: 1.3, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>VALIDATION</Text>
            <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '700', color: '#6B7280', textAlign: 'center' }}>STATUS</Text>
          </View>

          {/* Table Rows - Scrollable Content */}
          <ScrollView
            style={{ maxHeight: 550 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
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
                  <Text style={{ flex: 0.4, fontSize: 14, color: '#1F2937', fontWeight: '600', textAlign: 'center' }}>
                    {index + 1}
                  </Text>
                  <TouchableOpacity
                    style={{ flex: 0.8, justifyContent: 'center', alignItems: 'center' }}
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
                  <Text style={{ flex: 1, fontSize: 14, color: '#1F2937', textAlign: 'center' }}>
                    {caseItem.carpool?.block || '-'}
                  </Text>
                  <Text style={{ flex: 1.2, fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
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
                  <View style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: statusColors.bg,
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
                Page {currentPage} of {pagination ? Math.ceil(pagination.row_count / 100) : '...'}
              </Text>
            </View>
          )}
          </ScrollView>
          {/* End of Scrollable Table Content */}

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
          areas={areas}
          onBulkAssign={handleBulkAssign}
          onBulkAreaConfirm={handleBulkAreaConfirm}
        />
      )}

      {/* Bulk Validate Dialog */}
      {Array.isArray(workers) && workers.length > 0 && (
        <BulkValidateDialog
          visible={showBulkValidateDialog}
          onClose={() => setShowBulkValidateDialog(false)}
          workers={workers}
          areas={areas}
          onBulkValidate={handleBulkValidate}
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

      {/* Bulk Cancelation Dialog */}
      {Array.isArray(areas) && areas.length > 0 && (
        <BulkCancelationDialog
          visible={showBulkCancelationDialog}
          onClose={() => setShowBulkCancelationDialog(false)}
          areas={areas}
          onBulkCancelation={handleBulkCancelation}
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
              {[
                /* All Areas Option */
                <TouchableOpacity
                  key="all-areas"
                  onPress={resetFilter}
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
                </TouchableOpacity>,

                /* Individual Areas */
                ...(Array.isArray(areas) && areas.length > 0
                  ? areas.map((area) => (
                      <TouchableOpacity
                        key={`area-${area.id}`}
                        onPress={() => applyAreaFilter(area.area_code)}
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: selectedArea === area.area_code ? '#E0F2FE' : '#F9FAFB',
                          borderWidth: selectedArea === area.area_code ? 2 : 1,
                          borderColor: selectedArea === area.area_code ? '#0EA5E9' : '#E5E7EB',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          fontSize: 16,
                          fontWeight: selectedArea === area.area_code ? '700' : '500',
                          color: selectedArea === area.area_code ? '#0EA5E9' : '#1F2937',
                        }}>
                          {area.name}
                        </Text>
                        {selectedArea === area.area_code && (
                          <Text style={{ fontSize: 18, color: '#0EA5E9' }}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  : [
                      <View key="no-areas" style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: '#6B7280' }}>
                          No areas available
                        </Text>
                      </View>
                    ]
                )
              ]}
            </ScrollView>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={resetFilter}
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
              {/* <TouchableOpacity
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
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal with Swipe & Zoom - Ultra Smooth Transition */}
      <Modal
        visible={imageModalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {/* Title Indicator - Enhanced Visibility */}
          <View style={{
            position: 'absolute',
            top: 15,
            left: 15,
            zIndex: 999,
            backgroundColor: 'rgba(0,0,0,0.9)',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: imageViewIndex === 0 ? 'rgba(0,217,255,0.8)' : 'rgba(255,152,0,0.8)',
            shadowColor: imageViewIndex === 0 ? '#00D9FF' : '#FF9800',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
            elevation: 10,
          }}>
            <Text style={{
              fontSize: 10,
              fontWeight: '900',
              color: imageViewIndex === 0 ? '#00D9FF' : '#FF9800',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {imageViewIndex === 0 ? '🏷️ LABELED' : '📷 ORIGINAL'}
            </Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setImageModalVisible(false)}
            style={{
              position: 'absolute',
              top: 15,
              right: 15,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(239,68,68,0.95)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.4)',
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '900' }}>✕</Text>
          </TouchableOpacity>

          {/* Image Zoom Viewer - Optimized for Smooth Swipe */}
          {selectedImage && (
            <ImageViewer
              imageUrls={[
                {
                  url: selectedImage.case_photo || selectedImage.thumbnail,
                  props: {
                    source: { uri: selectedImage.case_photo || selectedImage.thumbnail },
                    resizeMode: 'contain',
                  }
                },
                {
                  url: selectedImage.origin_photo || selectedImage.thumbnail,
                  props: {
                    source: { uri: selectedImage.origin_photo || selectedImage.thumbnail },
                    resizeMode: 'contain',
                  }
                },
              ]}
              index={imageViewIndex}
              onChange={(index) => {
                console.log('[ImageViewer] Index changed to:', index);
                setImageViewIndex(index);
              }}
              enableSwipeDown={true}
              onSwipeDown={() => setImageModalVisible(false)}
              backgroundColor="#000000"
              saveToLocalByLongPress={false}
              enablePreload={true}
              maxOverflow={100}
              pageAnimateTime={150}
              flipThreshold={50}
              useNativeDriver={true}
              renderIndicator={() => null}
              loadingRender={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
                  <ActivityIndicator size="large" color="#00D9FF" />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 12, fontWeight: '600' }}>Loading...</Text>
                </View>
              )}
              renderFooter={() => (
                <View style={{
                  width: '100%',
                  paddingBottom: 50,
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                }}>
                  {/* Enhanced Page Indicator with Label */}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 14,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 28,
                    borderWidth: 2,
                    borderColor: imageViewIndex === 0 ? 'rgba(0,217,255,0.5)' : 'rgba(255,152,0,0.5)',
                    shadowColor: imageViewIndex === 0 ? '#00D9FF' : '#FF9800',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                  }}>
                    {/* Left Dot - LABELED */}
                    <View style={{
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <View style={{
                        width: imageViewIndex === 0 ? 36 : 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: imageViewIndex === 0 ? '#00D9FF' : 'rgba(255,255,255,0.25)',
                        borderWidth: imageViewIndex === 0 ? 2 : 0,
                        borderColor: '#FFFFFF',
                        shadowColor: imageViewIndex === 0 ? '#00D9FF' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: imageViewIndex === 0 ? 0.8 : 0,
                        shadowRadius: 6,
                      }} />
                      {imageViewIndex === 0 && (
                        <Text style={{
                          fontSize: 8,
                          fontWeight: '700',
                          color: '#00D9FF',
                          letterSpacing: 0.3,
                        }}>
                          LABELED
                        </Text>
                      )}
                    </View>

                    {/* Center Divider */}
                    <View style={{
                      width: 2,
                      height: 20,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }} />

                    {/* Right Dot - ORIGINAL */}
                    <View style={{
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <View style={{
                        width: imageViewIndex === 1 ? 36 : 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: imageViewIndex === 1 ? '#FF9800' : 'rgba(255,255,255,0.25)',
                        borderWidth: imageViewIndex === 1 ? 2 : 0,
                        borderColor: '#FFFFFF',
                        shadowColor: imageViewIndex === 1 ? '#FF9800' : 'transparent',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: imageViewIndex === 1 ? 0.8 : 0,
                        shadowRadius: 6,
                      }} />
                      {imageViewIndex === 1 && (
                        <Text style={{
                          fontSize: 8,
                          fontWeight: '700',
                          color: '#FF9800',
                          letterSpacing: 0.3,
                        }}>
                          ORIGINAL
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Swipe Instructions */}
                  <Text style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '600',
                    textAlign: 'center',
                    paddingHorizontal: 20,
                    letterSpacing: 0.3,
                  }}>
                    ← Swipe to switch • Pinch to zoom • Swipe down to close →
                  </Text>
                </View>
              )}
              footerContainerStyle={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'transparent',
              }}
            />
          )}
        </View>
      </Modal>

      {/* Success Notification - Can be dismissed by clicking anywhere */}
      <SuccessNotification
        visible={showSuccessNotification}
        message={successMessage}
        onDismiss={() => setShowSuccessNotification(false)}
        autoHideDuration={3000}
      />
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
