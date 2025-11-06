import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import apiService from '../services/ApiService';
import BulkAssignDialog from '../components/cases/BulkAssignDialog';
import AssigneeDropdown from '../components/cases/AssigneeDropdown';
import ValidationButton from '../components/cases/ValidationButton';
import ValidationOptionsDialog from '../components/cases/ValidationOptionsDialog';
import ExportCaseDialog from '../components/cases/ExportCaseDialog';

const { width } = Dimensions.get('window');

export default function CasesScreen({ session, setSession, activeMenu, setActiveMenu, isDarkMode }) {
  console.log('[CasesScreen] Component loaded with NEW features: Bulk Assign, Assignee Dropdown, Validation, Export');
  const [cases, setCases] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const pageSize = 10;

  // Filter
  const [selectedArea, setSelectedArea] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Selected case for actions
  const [selectedCase, setSelectedCase] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Bulk assign and export dialogs
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // FIX: Tambahkan ref untuk track mounted status dan loading state
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // FIX: Cleanup saat component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // FIX: Update time every second dengan cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme
  const theme = {
    background: isDarkMode ? '#001a33' : '#e6f2ff',
    text: isDarkMode ? '#fff' : '#0047AB',
    card: isDarkMode ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
  };

  // FIX: loadCases dengan useCallback dan mounted check
  const loadCases = useCallback(async (page = 1, isRefresh = false) => {
    // Prevent multiple overlapping calls
    if (isLoadingRef.current && isRefresh) {
      console.log('[Cases] Already loading, skipping duplicate call');
      return;
    }

    try {
      isLoadingRef.current = true;
      const response = await apiService.getCaseList({
        pageSize,
        page,
        filterAreaCode: selectedArea?.code || null,
      });

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('[Cases] Component unmounted, skipping state update');
        return;
      }

      if (response.success && response.data) {
        const newCases = response.data;

        if (isRefresh) {
          setCases(newCases);
          setCurrentPage(1);
        } else {
          setCases(prev => [...prev, ...newCases]);
        }

        setHasMoreData(newCases.length >= pageSize);
        if (!isRefresh) {
          setCurrentPage(page);
        }
      }
    } catch (error) {
      // Check if component is still mounted before handling error
      if (!isMountedRef.current) {
        console.log('[Cases] Component unmounted, skipping error handling');
        return;
      }
      
      // Don't throw error if it's a session expired - let loadInitialData handle it
      if (error.message !== 'SESSION_EXPIRED' && error.message !== 'SESSION_INVALID') {
        console.error('[Cases] Error loading cases:', error);
      }
      throw error;
    } finally {
      isLoadingRef.current = false;
    }
  }, [selectedArea, pageSize]);

  // FIX: loadWorkers dengan mounted check
  const loadWorkers = useCallback(async () => {
    try {
      const response = await apiService.getWorkers();
      console.log('[Cases] Workers response:', response);

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (response.success && response.data) {
        setWorkers(response.data);
      } else if (Array.isArray(response)) {
        // Fallback jika response langsung array
        setWorkers(response);
      }
    } catch (error) {
      console.error('[Cases] Error loading workers:', error);
      // Set empty array to prevent crash, but only if mounted
      if (isMountedRef.current) {
        setWorkers([]);
      }
    }
  }, []);

  // FIX: loadAreas dengan mounted check
  const loadAreas = useCallback(async () => {
    try {
      const response = await apiService.getAreas();
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (response.success && response.data) {
        setAreas(response.data);
      }
    } catch (error) {
      console.error('[Cases] Error loading areas:', error);
      // Set empty array only if mounted
      if (isMountedRef.current) {
        setAreas([]);
      }
    }
  }, []);

  // FIX: loadInitialData dengan mounted check dan prevent duplicate calls
  const loadInitialData = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('[Cases] Initial data already loading, skipping');
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    isLoadingRef.current = true;
    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const results = await Promise.allSettled([
        loadCases(1, true),
        loadWorkers(),
        loadAreas(),
      ]);

      // Check if component is still mounted before processing results
      if (!isMountedRef.current) {
        return;
      }

      const rejected = results.filter(r => r.status === 'rejected');
      if (rejected.length > 0) {
        const sessionError = rejected.find(r =>
          r.reason && (r.reason.message === 'SESSION_EXPIRED' || r.reason.message === 'SESSION_INVALID')
        );
        if (sessionError) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please login again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (isMountedRef.current) {
                    setSession(null);
                  }
                },
              },
            ]
          );
        } else {
          console.warn('[Cases] Some resources failed to load, continuing with partial data');
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[Cases] Unexpected error loading initial data:', error);
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadCases, loadWorkers, loadAreas, setSession]);

  // FIX: useEffect untuk loadInitialData - hanya dipanggil sekali saat mount
  useEffect(() => {
    // Load initial data hanya sekali saat component mount
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - hanya run sekali saat mount

  // FIX: onRefresh dengan useCallback dan proper dependencies
  const onRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (refreshing || isLoadingRef.current) {
      console.log('[Cases] Already refreshing, skipping duplicate refresh');
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    setRefreshing(true);
    try {
      await loadCases(1, true);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [loadCases, refreshing]);

  // FIX: loadMore dengan mounted check
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreData || !isMountedRef.current || isLoadingRef.current) {
      return;
    }

    setLoadingMore(true);
    try {
      await loadCases(currentPage + 1, false);
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [loadCases, currentPage, loadingMore, hasMoreData]);

  const handleAssignWorker = async (workerId) => {
    if (!selectedCase) return;

    try {
      const response = await apiService.assignWorker(selectedCase.id, workerId);
      if (response.success) {
        Alert.alert('Success', 'Worker assigned successfully');
        setShowAssignModal(false);
        onRefresh();
      }
    } catch (error) {
      console.error('[Cases] Error assigning worker:', error);
      Alert.alert('Error', 'Failed to assign worker');
    }
  };

  const handleValidateCase = async (statusId) => {
    if (!selectedCase) return;

    if (!selectedCase.worker) {
      Alert.alert('Error', 'Please assign a worker first');
      return;
    }

    try {
      const response = await apiService.validateCase(selectedCase.id, statusId);
      if (response.success) {
        Alert.alert('Success', 'Case validated successfully');
        setShowValidateModal(false);
        setShowValidationDialog(false);
        onRefresh();
      }
    } catch (error) {
      console.error('[Cases] Error validating case:', error);
      Alert.alert('Error', 'Failed to validate case');
    }
  };

  const handleBulkAssign = async (workerId) => {
    try {
      const response = await apiService.bulkAssign(workerId);
      if (response.success) {
        Alert.alert('Success', 'Bulk assign completed successfully');
        setShowBulkAssignDialog(false);
        onRefresh();
      }
    } catch (error) {
      console.error('[Cases] Error bulk assigning:', error);
      Alert.alert('Error', 'Failed to bulk assign workers');
    }
  };

  const handleAssigneeChange = async (caseItem, worker) => {
    try {
      const response = await apiService.assignWorker(caseItem.id, worker.id);
      if (response.success) {
        // Update local state
        setCases(prevCases =>
          prevCases.map(c =>
            c.id === caseItem.id ? { ...c, worker } : c
          )
        );
      }
    } catch (error) {
      console.error('[Cases] Error assigning worker:', error);
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

  const handleGenerateReport = async (areaCode) => {
    try {
      const response = await apiService.generateReport(areaCode);
      if (response.success) {
        return { reportUrl: response.reportUrl || response.data?.reportUrl };
      }
      throw new Error('Failed to generate report');
    } catch (error) {
      console.error('[Cases] Error generating report:', error);
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
      console.error('[Cases] Error sending email:', error);
      throw error;
    }
  };

  // FIX: applyFilter dengan mounted check
  const applyFilter = useCallback((area) => {
    if (!isMountedRef.current) {
      return;
    }
    setSelectedArea(area);
    setShowFilterModal(false);
    setCurrentPage(1);
    setHasMoreData(true);
    // loadCases akan dipanggil otomatis karena selectedArea berubah
    loadCases(1, true);
  }, [loadCases]);

  // FIX: resetFilter dengan mounted check
  const resetFilter = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    setSelectedArea(null);
    setShowFilterModal(false);
    setCurrentPage(1);
    setHasMoreData(true);
    // loadCases akan dipanggil otomatis karena selectedArea berubah
    loadCases(1, true);
  }, [loadCases]);

  const getStatusColor = (statusName) => {
    switch (statusName?.toLowerCase()) {
      case 'not started':
        return '#9E9E9E';
      case 'in progress':
        return '#2196F3';
      case 'confirmed':
      case 'completed':
        return '#4CAF50';
      case 'false detection':
        return '#F44336';
      default:
        return '#FFB74D';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Table Header Component
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.colNo]}>NO</Text>
      <Text style={[styles.headerCell, styles.colImage]}>PHOTO</Text>
      <Text style={[styles.headerCell, styles.colArea]}>AREA</Text>
      <Text style={[styles.headerCell, styles.colDate]}>DATE</Text>
      <Text style={[styles.headerCell, styles.colAssigned]}>ASSIGNED</Text>
      <Text style={[styles.headerCell, styles.colValidation]}>VALIDATION</Text>
      <Text style={[styles.headerCell, styles.colStatus]}>STATUS</Text>
    </View>
  );

  // Table Row Component
  const renderTableRow = ({ item, index }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.colNo]}>{index + 1}</Text>

      <TouchableOpacity
        style={[styles.cell, styles.colImage]}
        onPress={() => {
          setSelectedCase(item);
          setShowImageModal(true);
        }}
      >
        <Image
          source={{ uri: item.images?.thumbnail || item.images?.case_photo }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Text style={[styles.cell, styles.colArea]} numberOfLines={1}>
        {item.carpool?.block || '-'}
      </Text>

      <Text style={[styles.cell, styles.colDate]} numberOfLines={2}>
        {formatDate(item.detected_date)}
      </Text>

      <View style={[styles.cell, styles.colAssigned]}>
        <AssigneeDropdown
          currentWorker={item.worker}
          workers={workers}
          onWorkerChange={(worker) => handleAssigneeChange(item, worker)}
        />
      </View>

      <View style={[styles.cell, styles.colValidation]}>
        <ValidationButton
          statusName={item.status?.name}
          onPress={(hasWorker) => handleValidationPress(item, hasWorker)}
          hasWorker={!!item.worker}
        />
      </View>

      <TouchableOpacity
        style={[styles.cell, styles.colStatus]}
        onPress={() => {
          setSelectedCase(item);
          setShowValidateModal(true);
        }}
      >
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status?.name) }]}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {item.status?.name || 'Not Started'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient colors={['#00BFFF', '#1E90FF', '#0047AB']} style={styles.header}>
          <Text style={styles.headerTitle}>Cases</Text>
        </LinearGradient>

        {/* Menu Bar */}
        <View style={styles.topBarContainer}>
          <View style={styles.topBarLeft}>
            <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.menuNavBlur}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuNavScrollContent}>
                <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('dashboard')}>
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📊</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Dashboard</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('upload')}>
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📤</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Upload</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('cases')}>
                  <LinearGradient colors={['#00BFFF', '#1E90FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.menuNavActiveTab}>
                    <Text style={styles.menuNavIconActive}>📋</Text>
                    <Text style={styles.menuNavTextActive}>Cases</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('monitoring')}>
                  <View style={styles.menuNavInactiveTab}>
                    <Text style={styles.menuNavIconInactive}>📈</Text>
                    <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Monitoring</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </BlurView>
          </View>
          <View style={styles.topBarRight}>
            <BlurView intensity={80} tint="light" style={styles.dateTimeBlurCard}>
              <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']} style={styles.dateTimeGradientCard}>
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.dateTimeIcon}>🚁</Text>
                  <Text style={styles.dateTimeText}>{session?.drone?.drone_code || 'N/A'}</Text>
                </View>
                <View style={styles.dateTimeDivider} />
                <View style={styles.dateTimeColumn}>
                  <Text style={styles.dateTimeIcon}>🕒</Text>
                  <Text style={styles.timeText}>{currentTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </LinearGradient>
            </BlurView>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading cases...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#00BFFF', '#1E90FF', '#0047AB']} style={styles.header}>
        <Text style={styles.headerTitle}>Cases</Text>
      </LinearGradient>

      {/* Menu Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.topBarLeft}>
          <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={styles.menuNavBlur}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuNavScrollContent}>
              <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('dashboard')}>
                <View style={styles.menuNavInactiveTab}>
                  <Text style={styles.menuNavIconInactive}>📊</Text>
                  <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Dashboard</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('upload')}>
                <View style={styles.menuNavInactiveTab}>
                  <Text style={styles.menuNavIconInactive}>📤</Text>
                  <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Upload</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('cases')}>
                <LinearGradient colors={['#00BFFF', '#1E90FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.menuNavActiveTab}>
                  <Text style={styles.menuNavIconActive}>📋</Text>
                  <Text style={styles.menuNavTextActive}>Cases</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuNavItem} onPress={() => setActiveMenu('reports')}>
                <View style={styles.menuNavInactiveTab}>
                  <Text style={styles.menuNavIconInactive}>📈</Text>
                  <Text style={[styles.menuNavTextInactive, { color: theme.text }]}>Reports</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </View>
        <View style={styles.topBarRight}>
          <BlurView intensity={80} tint="light" style={styles.dateTimeBlurCard}>
            <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(240,248,255,0.95)']} style={styles.dateTimeGradientCard}>
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🚁</Text>
                <Text style={styles.dateTimeText}>{session?.drone?.drone_code || 'N/A'}</Text>
              </View>
              <View style={styles.dateTimeDivider} />
              <View style={styles.dateTimeColumn}>
                <Text style={styles.dateTimeIcon}>🕒</Text>
                <Text style={styles.timeText}>{currentTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Text style={styles.filterButtonText}>
            {selectedArea ? `Area: ${selectedArea.name}` : '🔍 Filter Area'}
          </Text>
        </TouchableOpacity>
        {selectedArea && (
          <TouchableOpacity style={styles.resetButton} onPress={resetFilter}>
            <Text style={styles.resetButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.bulkButton} onPress={() => setShowBulkAssignDialog(true)}>
          <Text style={styles.bulkButtonIcon}>👥</Text>
          <Text style={styles.bulkButtonText}>Bulk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportDialog(true)}>
          <Text style={styles.exportButtonIcon}>📄</Text>
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.tableContainer}>
        <TableHeader />
        <FlatList
          data={cases}
          renderItem={renderTableRow}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E90FF']} tintColor="#1E90FF" progressViewOffset={130} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: theme.text }]}>No cases found</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color="#1E90FF" /></View> : null}
        />
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter by Area</Text>
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity style={styles.modalOption} onPress={resetFilter}>
                  <Text style={styles.modalOptionText}>All Areas</Text>
                </TouchableOpacity>
                {areas.map((area) => (
                  <TouchableOpacity key={area.code} style={styles.modalOption} onPress={() => applyFilter(area)}>
                    <Text style={styles.modalOptionText}>{area.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Worker</Text>
              <ScrollView style={styles.modalScroll}>
                {workers.map((worker) => (
                  <TouchableOpacity key={worker.id} style={styles.modalOption} onPress={() => handleAssignWorker(worker.id)}>
                    <Text style={styles.modalOptionText}>{worker.fullname}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Validate Modal */}
      <Modal visible={showValidateModal} transparent animationType="slide" onRequestClose={() => setShowValidateModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Validate Case</Text>
              <TouchableOpacity style={[styles.validateButton, { backgroundColor: '#4CAF50' }]} onPress={() => handleValidateCase(2)}>
                <Text style={styles.validateButtonText}>✓ True Detection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.validateButton, { backgroundColor: '#F44336' }]} onPress={() => handleValidateCase(3)}>
                <Text style={styles.validateButtonText}>✕ False Detection</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowValidateModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setShowImageModal(false)}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedCase?.images?.case_photo || selectedCase?.images?.origin_photo }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <View style={styles.imageInfo}>
            <Text style={styles.imageInfoText}>Area: {selectedCase?.carpool?.block || '-'}</Text>
          </View>
        </View>
      </Modal>

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        visible={showBulkAssignDialog}
        onClose={() => setShowBulkAssignDialog(false)}
        workers={workers}
        onBulkAssign={handleBulkAssign}
      />

      {/* Validation Options Dialog */}
      <ValidationOptionsDialog
        visible={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={handleValidateCase}
        caseName={selectedCase?.carpool?.block}
      />

      {/* Export Case Dialog */}
      <ExportCaseDialog
        visible={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        areas={areas}
        onGenerateReport={handleGenerateReport}
        onSendEmail={handleSendEmail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 88,
    paddingBottom: 6,
    gap: 6,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bulkButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bulkButtonIcon: {
    fontSize: 14,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportButtonIcon: {
    fontSize: 14,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tableContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0047AB',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cell: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
    justifyContent: 'center',
  },
  colNo: {
    flex: 0.4,
  },
  colImage: {
    flex: 1,
  },
  colArea: {
    flex: 0.8,
  },
  colDate: {
    flex: 1.5,
  },
  colAssigned: {
    flex: 1.8,
  },
  colValidation: {
    flex: 1.2,
  },
  colStatus: {
    flex: 1.3,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    alignSelf: 'center',
  },
  assignText: {
    color: '#1E90FF',
    fontSize: 10,
    fontWeight: '600',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'center',
    minWidth: 60,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0047AB',
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F5F5F5',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0047AB',
  },
  validateButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  fullImage: {
    width: width - 40,
    height: '80%',
  },
  imageInfo: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
  },
  imageInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Menu Bar
  topBarContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
    zIndex: 99,
  },
  topBarLeft: {
    flex: 3,
  },
  topBarRight: {
    flex: 1,
  },
  menuNavBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  menuNavScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  menuNavItem: {
    marginHorizontal: 2,
  },
  menuNavActiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuNavInactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    backgroundColor: 'transparent',
  },
  menuNavIconActive: {
    fontSize: 16,
  },
  menuNavIconInactive: {
    fontSize: 14,
    opacity: 0.6,
  },
  menuNavTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  menuNavTextInactive: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  dateTimeBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.2)',
  },
  dateTimeGradientCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  dateTimeColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeIcon: {
    fontSize: 12,
  },
  dateTimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
  },
  dateTimeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0047AB',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E90FF',
    textAlign: 'center',
  },
});
