import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../services/ApiService';

const { width } = Dimensions.get('window');

export default function CasesMockup({ session, setActiveMenu }) {
  const [selectedArea, setSelectedArea] = useState(null);
  const [casesData, setCasesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0); // 0 = case_photo, 1 = origin_photo

  // Load cases dari API
  useEffect(() => {
    loadCases();
  }, [selectedArea]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCaseList({
        pageSize: 100,
        page: 1,
        filterAreaCode: selectedArea,
      });

      console.log('Cases Response:', response);

      if (response.success && response.data) {
        setCasesData(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      setCasesData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCases();
  };

  const handleImagePress = (caseItem) => {
    setSelectedImage(caseItem.images);
    setImageViewIndex(0); // Start with detected image
    setImageModalVisible(true);
  };

  const toggleImageView = () => {
    setImageViewIndex(prev => prev === 0 ? 1 : 0);
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
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

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
            Cases Management
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
            Track and Monitor All Drone Operations
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
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
        }
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
                <Text style={{ fontSize: 14, color: '#0EA5E9' }}>
                  {pagination?.row_count || casesData.length} Total Cases
                </Text>
              </View>
            </View>

            {/* Filter Dropdown */}
            <TouchableOpacity style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: '#F3F4F6',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>📍</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                {selectedArea || 'All Areas'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#065F46' }}>
                {casesData.filter(c => c.status?.name === 'Completed' || c.status?.name === 'Complete').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#065F46' }}>Completed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#DBEAFE', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E40AF' }}>
                {casesData.filter(c => c.status?.name === 'In Progress' || c.status?.name === 'Processing').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#1E40AF' }}>In Progress</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#6B7280' }}>
                {casesData.filter(c => c.status?.name === 'Not Started' || c.status?.name === 'Pending').length}
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Not Started</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#991B1B' }}>
                {casesData.filter(c => c.status?.name === 'Failed' || c.status?.name === 'Error').length}
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
            <Text style={{ flex: 0.5, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>NO</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>PHOTO</Text>
            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>AREA</Text>
            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>DATE</Text>
            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>ASSIGNED</Text>
            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#6B7280' }}>STATUS</Text>
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
                  }}
                >
                  <Text style={{ flex: 0.5, fontSize: 14, color: '#1F2937', fontWeight: '600' }}>
                    {index + 1}
                  </Text>
                  <TouchableOpacity
                    style={{ flex: 1, justifyContent: 'center' }}
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
                  <Text style={{ flex: 1.5, fontSize: 14, color: '#1F2937' }}>
                    {caseItem.carpool?.block || '-'}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 14, color: '#6B7280' }}>
                    {formatDate(caseItem.detected_date)}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 14, color: '#1F2937' }}>
                    {caseItem.worker?.fullname || caseItem.worker?.username || '-'}
                  </Text>
                  <View style={{ flex: 1.5 }}>
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
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <TouchableOpacity style={{
            flex: 1,
            backgroundColor: '#0EA5E9',
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
            shadowColor: '#0EA5E9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
              ➕ New Case
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#0EA5E9',
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0EA5E9' }}>
              📄 Export Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
