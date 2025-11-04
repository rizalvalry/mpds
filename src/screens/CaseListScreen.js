import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import { BirdDrop } from '../models';

export default function CaseListScreen() {
  const { theme } = useTheme();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [selectedAreaCode, setSelectedAreaCode] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);

  const pageSize = 10;

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadCases(true), loadWorkers(), loadAreas()]);
  };

  // Load cases with pagination
  const loadCases = async (isRefresh = false) => {
    if (isRefresh) {
      setCurrentPage(1);
      setHasMoreData(true);
      setRefreshing(true);
    } else {
      if (!hasMoreData || loadingMore) return;
      setLoadingMore(true);
    }

    setLoading(true);

    try {
      const response = await ApiService.getCaseList({
        pageSize,
        page: isRefresh ? 1 : currentPage,
        filterAreaCode: selectedAreaCode,
      });

      const fetchedCases = (response.data || []).map((item) => BirdDrop.fromJson(item));

      if (isRefresh) {
        setCases(fetchedCases);
      } else {
        setCases((prev) => [...prev, ...fetchedCases]);
      }

      if (fetchedCases.length < pageSize) {
        setHasMoreData(false);
      } else {
        setCurrentPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('[CaseList] Error loading cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Load workers
  const loadWorkers = async () => {
    try {
      const response = await ApiService.getWorkers();
      setWorkers(response.data || []);
    } catch (error) {
      console.error('[CaseList] Error loading workers:', error);
    }
  };

  // Load areas
  const loadAreas = async () => {
    try {
      const response = await ApiService.getAreas();
      setAreas(response.data || []);
    } catch (error) {
      console.error('[CaseList] Error loading areas:', error);
    }
  };

  // Handle area filter
  const applyAreaFilter = (areaCode, areaName) => {
    setSelectedAreaCode(areaCode);
    setSelectedAreaName(areaName);
    setShowFilterModal(false);
    loadCases(true);
  };

  // Reset filter
  const resetFilter = () => {
    setSelectedAreaCode(null);
    setSelectedAreaName(null);
    setShowFilterModal(false);
    loadCases(true);
  };

  // Handle worker assignment
  const handleAssignWorker = async (caseId, workerId) => {
    try {
      await ApiService.assignWorker(caseId, workerId);
      console.log('[CaseList] Worker assigned successfully');
      loadCases(true);
    } catch (error) {
      console.error('[CaseList] Error assigning worker:', error);
    }
  };

  // Handle case validation
  const handleValidateCase = async (caseId, statusId) => {
    try {
      await ApiService.validateCase(caseId, statusId);
      console.log('[CaseList] Case validated successfully');
      loadCases(true);
    } catch (error) {
      console.error('[CaseList] Error validating case:', error);
    }
  };

  // Render case item
  const renderCaseItem = ({ item, index }) => (
    <CaseItem
      caseData={item}
      index={index}
      workers={workers}
      onAssignWorker={handleAssignWorker}
      onValidateCase={handleValidateCase}
      onViewImages={() => setSelectedCase(item)}
      theme={theme}
    />
  );

  // Render header
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.primary }]}>
      <Text style={[styles.headerText, { flex: 0.5 }]}>NO</Text>
      <Text style={[styles.headerText, { flex: 1 }]}>CASE PHOTO</Text>
      <Text style={[styles.headerText, { flex: 1 }]}>AREA</Text>
      <Text style={[styles.headerText, { flex: 1.5 }]}>DETECTION DATE</Text>
      <Text style={[styles.headerText, { flex: 1.5 }]}>ASSIGNED TO</Text>
      <Text style={[styles.headerText, { flex: 1 }]}>VALIDATION</Text>
      <Text style={[styles.headerText, { flex: 1 }]}>PROGRESS</Text>
    </View>
  );

  // Render footer (loading more)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.toolbarButtonText}>
            {selectedAreaName ? `Filter: ${selectedAreaName}` : 'Filter by Area'}
          </Text>
        </TouchableOpacity>

        {selectedAreaCode && (
          <TouchableOpacity
            style={[styles.toolbarButton, { backgroundColor: theme.accent }]}
            onPress={resetFilter}
          >
            <Text style={styles.toolbarButtonText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Case List */}
      {renderHeader()}
      <FlatList
        data={cases}
        renderItem={renderCaseItem}
        keyExtractor={(item) => `case-${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCases(true)} />
        }
        onEndReached={() => loadCases(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.text }]}>No cases found</Text>
            </View>
          )
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        areas={areas}
        selectedAreaCode={selectedAreaCode}
        onApply={applyAreaFilter}
        onReset={resetFilter}
        onClose={() => setShowFilterModal(false)}
        theme={theme}
      />

      {/* Image Viewer Modal */}
      {selectedCase && (
        <ImageViewerModal
          caseData={selectedCase}
          visible={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          theme={theme}
        />
      )}
    </View>
  );
}

// Case Item Component
function CaseItem({ caseData, index, workers, onAssignWorker, onValidateCase, onViewImages, theme }) {
  const [showWorkerMenu, setShowWorkerMenu] = useState(false);
  const [showValidationMenu, setShowValidationMenu] = useState(false);

  return (
    <View style={[styles.caseItem, { borderBottomColor: theme.border }]}>
      <Text style={[styles.caseText, { flex: 0.5, color: theme.text }]}>{index + 1}</Text>

      {/* Case Photo */}
      <TouchableOpacity style={{ flex: 1 }} onPress={onViewImages}>
        <Image
          source={{ uri: caseData.images.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Area */}
      <Text style={[styles.caseText, { flex: 1, color: theme.text }]}>
        {caseData.carpool.block || '-'}
      </Text>

      {/* Detection Date */}
      <Text style={[styles.caseText, { flex: 1.5, color: theme.text }]}>
        {formatDate(caseData.detectedDate)}
      </Text>

      {/* Assigned To */}
      <TouchableOpacity
        style={[styles.assignButton, { flex: 1.5, backgroundColor: theme.card }]}
        onPress={() => setShowWorkerMenu(true)}
      >
        <Text style={[styles.assignText, { color: theme.text }]} numberOfLines={1}>
          {caseData.worker ? caseData.worker.fullname : 'Unassigned'}
        </Text>
      </TouchableOpacity>

      {/* Validation */}
      <TouchableOpacity
        style={[styles.validationButton, { flex: 1 }]}
        onPress={() => caseData.status.isPending && setShowValidationMenu(true)}
        disabled={!caseData.status.isPending}
      >
        <Text
          style={[
            styles.validationText,
            {
              color: caseData.status.isConfirmed
                ? 'green'
                : caseData.status.isFalseDetection
                ? 'red'
                : theme.text,
            },
          ]}
        >
          {caseData.status.name}
        </Text>
      </TouchableOpacity>

      {/* Progress Badge */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View
          style={[
            styles.progressBadge,
            {
              backgroundColor: caseData.status.isPending
                ? '#FFA500'
                : caseData.status.isConfirmed
                ? '#4CAF50'
                : '#F44336',
            },
          ]}
        >
          <Text style={styles.progressText}>
            {caseData.status.isPending ? 'Pending' : 'Done'}
          </Text>
        </View>
      </View>

      {/* Worker Menu Modal */}
      <Modal visible={showWorkerMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWorkerMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>Assign Worker</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {workers.map((worker) => (
                <TouchableOpacity
                  key={worker.id}
                  style={styles.menuItem}
                  onPress={() => {
                    onAssignWorker(caseData.id, worker.id);
                    setShowWorkerMenu(false);
                  }}
                >
                  <Text style={[styles.menuItemText, { color: theme.text }]}>
                    {worker.fullname || worker.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Validation Menu Modal */}
      <Modal visible={showValidationMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowValidationMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>Validate Case</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onValidateCase(caseData.id, 4); // Confirmed
                setShowValidationMenu(false);
              }}
            >
              <Text style={[styles.menuItemText, { color: 'green' }]}>✓ Confirmed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onValidateCase(caseData.id, 5); // False Detection
                setShowValidationMenu(false);
              }}
            >
              <Text style={[styles.menuItemText, { color: 'red' }]}>✗ False Detection</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Filter Modal Component
function FilterModal({ visible, areas, selectedAreaCode, onApply, onReset, onClose, theme }) {
  const [tempAreaCode, setTempAreaCode] = useState(selectedAreaCode);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModalContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Filter by Area</Text>

          <ScrollView style={{ maxHeight: 300, marginVertical: 16 }}>
            {areas.map((area) => (
              <TouchableOpacity
                key={area.code}
                style={[
                  styles.areaItem,
                  tempAreaCode === area.code && { backgroundColor: theme.primary + '20' },
                ]}
                onPress={() => setTempAreaCode(area.code)}
              >
                <Text style={[styles.areaText, { color: theme.text }]}>{area.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={() => {
                onReset();
                setTempAreaCode(null);
              }}
            >
              <Text style={{ color: theme.text }}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (tempAreaCode) {
                  const area = areas.find((a) => a.code === tempAreaCode);
                  onApply(tempAreaCode, area?.name);
                }
              }}
            >
              <Text style={{ color: '#fff' }}>Apply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={{ color: theme.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Image Viewer Modal Component
function ImageViewerModal({ caseData, visible, onClose, theme }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = [
    { url: caseData.images.casePhoto, label: 'Case Photo' },
    { url: caseData.images.originPhoto, label: 'Original Photo' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.imageViewerOverlay}>
        <View style={[styles.imageViewerContainer, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <Text style={[styles.imageViewerTitle, { color: theme.text }]}>
              {images[currentImageIndex].label}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Image */}
          <Image
            source={{ uri: images[currentImageIndex].url }}
            style={styles.fullImage}
            resizeMode="contain"
          />

          {/* Image Indicators */}
          <View style={styles.imageIndicators}>
            {images.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  {
                    backgroundColor:
                      currentImageIndex === index ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setCurrentImageIndex(index)}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.primary }]}
              onPress={() => setCurrentImageIndex((prev) => (prev === 0 ? 1 : 0))}
            >
              <Text style={styles.navButtonText}>
                {currentImageIndex === 0 ? 'Original Photo →' : '← Case Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Area Info */}
          <Text style={[styles.areaInfo, { color: theme.text }]}>
            Area: {caseData.carpool.block || '-'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// Utility function to format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  toolbarButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toolbarButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  caseItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  caseText: {
    fontSize: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  assignButton: {
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  assignText: {
    fontSize: 12,
  },
  validationButton: {
    padding: 8,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 250,
    borderRadius: 12,
    padding: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  menuItem: {
    padding: 12,
    borderRadius: 6,
  },
  menuItemText: {
    fontSize: 14,
  },
  filterModalContainer: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  areaItem: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  areaText: {
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '90%',
    maxWidth: 800,
    borderRadius: 12,
    padding: 16,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
  },
  fullImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  navigationButtons: {
    marginTop: 16,
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  areaInfo: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
