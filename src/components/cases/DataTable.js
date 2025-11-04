import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusPill } from '../shared/StatusPill';

/**
 * Enhanced Data Table for Cases Management
 * Inspired by modern table designs (Azure Portal, AWS Console)
 */

export const DataTable = ({
  data = [],
  columns = [],
  onRowPress,
  renderActions,
  emptyMessage = 'No data available',
  style,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);

  const renderCell = (item, column) => {
    const value = item[column.key];

    // Handle different column types
    switch (column.type) {
      case 'image':
        return (
          <TouchableOpacity
            onPress={() => setSelectedImage(value)}
            style={styles.imageCell}
          >
            <Image
              source={{ uri: value }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );

      case 'status':
        return <StatusPill status={value} size="small" />;

      case 'badge':
        return (
          <View
            style={[
              styles.badge,
              { backgroundColor: column.getBadgeColor?.(value) || theme.primary },
            ]}
          >
            <Text style={styles.badgeText}>{value}</Text>
          </View>
        );

      case 'date':
        return (
          <Text style={[styles.cellText, { color: theme.textSecondary }]}>
            {value ? new Date(value).toLocaleDateString('id-ID') : '-'}
          </Text>
        );

      default:
        return (
          <Text
            style={[styles.cellText, { color: theme.text }]}
            numberOfLines={column.maxLines || 1}
          >
            {value || '-'}
          </Text>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tableContainer, style]}
      >
        <View style={[styles.table, { backgroundColor: theme.card }]}>
          {/* Header Row */}
          <View
            style={[
              styles.headerRow,
              { backgroundColor: isDarkMode ? theme.neutral100 : theme.neutral50 },
            ]}
          >
            {columns.map((column, index) => (
              <View
                key={index}
                style={[
                  styles.headerCell,
                  { width: column.width || 150 },
                  index > 0 && styles.cellBorder,
                  { borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.headerText,
                    { color: theme.text },
                    column.align === 'center' && styles.textCenter,
                    column.align === 'right' && styles.textRight,
                  ]}
                >
                  {column.label}
                </Text>
              </View>
            ))}
            {renderActions && (
              <View
                style={[
                  styles.headerCell,
                  styles.cellBorder,
                  { width: 120, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.headerText, { color: theme.text }, styles.textCenter]}>
                  ACTIONS
                </Text>
              </View>
            )}
          </View>

          {/* Data Rows */}
          {data.map((item, rowIndex) => (
            <TouchableOpacity
              key={rowIndex}
              style={[
                styles.dataRow,
                { backgroundColor: theme.card },
                rowIndex % 2 === 1 && {
                  backgroundColor: isDarkMode
                    ? theme.backgroundSecondary
                    : theme.neutral50,
                },
              ]}
              onPress={() => onRowPress?.(item)}
              activeOpacity={onRowPress ? 0.7 : 1}
            >
              {columns.map((column, colIndex) => (
                <View
                  key={colIndex}
                  style={[
                    styles.dataCell,
                    { width: column.width || 150 },
                    colIndex > 0 && styles.cellBorder,
                    { borderColor: theme.border },
                  ]}
                >
                  {renderCell(item, column)}
                </View>
              ))}
              {renderActions && (
                <View
                  style={[
                    styles.dataCell,
                    styles.cellBorder,
                    { width: 120, borderColor: theme.border },
                  ]}
                >
                  {renderActions(item)}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export const FilterBar = ({ filters = [], selectedFilter, onFilterChange, style }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.filterBar, style]}>
      <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>
        Filter by:
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterChips}>
          {filters.map((filter, index) => {
            const isSelected = selectedFilter === filter.value;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => onFilterChange(filter.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
  },
  table: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  headerCell: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Data Rows
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataCell: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cellBorder: {
    borderLeftWidth: 1,
  },
  cellText: {
    fontSize: 14,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },

  // Image Cell
  imageCell: {
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  // Badge
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    borderRadius: 16,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
