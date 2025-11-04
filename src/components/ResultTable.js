// src/components/ResultsTable.js
import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ResultsTable({ data = [] }) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions(); // ✅ dynamic screen width

  if (!data.length)
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>No results yet</Text>
      </View>
    );

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      {/* ✅ horizontal scroll for small screens */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ✅ table fills at least screen width */}
        <View
          style={[
            styles.table,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              minWidth: screenWidth - 340, // accounts for sidebar width (adjust if needed)
            },
          ]}
        >
          {/* Header Row */}
          <View style={[styles.headerRow, { backgroundColor: theme.card }]}>
            <Text style={[styles.headerCell, { color: theme.text, flex: 0.4 }]}>No.</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 1.3 }]}>Case Photo</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 1 }]}>Area</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 1.3 }]}>Detection Date</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 1 }]}>Assigned To</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 1 }]}>Validation</Text>
            <Text style={[styles.headerCell, { color: theme.text, flex: 0.8 }]}>Progress</Text>
          </View>

          {/* Data Rows */}
          {data.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                styles.row,
                {
                  backgroundColor: index % 2 === 0 ? theme.background : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.cell, { color: theme.text, flex: 0.4 }]}>{index + 1}</Text>

              <View style={[styles.cell, { flex: 1.3, alignItems: 'center' }]}>
                {item.uri ? (
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbnail, { backgroundColor: theme.border }]} />
                )}
              </View>

              <Text style={[styles.cell, { color: theme.text, flex: 1 }]}>{item.area || 'N/A'}</Text>
              <Text style={[styles.cell, { color: theme.text, flex: 1.3 }]}>{item.date || 'N/A'}</Text>
              <Text style={[styles.cell, { color: theme.text, flex: 1 }]}>{item.assignedTo || 'Unassigned'}</Text>

              <Text
                style={[
                  styles.cell,
                  {
                    flex: 1,
                    color:
                      item.validation === 'Approved'
                        ? '#4caf50'
                        : item.validation === 'Pending'
                        ? '#e3a500'
                        : theme.text,
                  },
                ]}
              >
                {item.validation || 'Pending'}
              </Text>

              <Text style={[styles.cell, { color: theme.accent, flex: 0.8 }]}>
                {item.progress ?? '0%'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    padding: 12,
  },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  headerCell: {
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
  },
  cell: {
    textAlign: 'center',
    fontSize: 13,
  },
  thumbnail: {
    width: 45,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#ccc',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
