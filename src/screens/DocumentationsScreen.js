import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import DynamicHeader from '../components/shared/DynamicHeader';

const { width } = Dimensions.get('window');

export default function DocumentationsScreen({ session, setActiveMenu, setSession }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Dynamic Header Component */}
      <DynamicHeader
        title="Documentations"
        subtitle="Project Documents & Guides"
        session={session}
        setSession={setSession}
        onThemeToggle={(value) => setIsDarkMode(value)}
        isDarkMode={isDarkMode}
      />

      {/* Navigation Bar (tetap tampil; Documentations bukan fullscreen) */}
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

          {/* Penunjuk tab aktif: Documentations */}
          <View style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: '#0EA5E9',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginLeft: 12,
            shadowColor: '#0EA5E9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}>
            <Text style={{ fontSize: 18 }}>📚</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Documentations</Text>
          </View>
        </ScrollView>
      </View>

      {/* Content: WebView ditampilkan di area konten, tidak fullscreen */}
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
          <WebView
            source={{ uri: 'https://doc.clickup.com/9018025471/d/h/8cr89fz-2498/b3ff2cac7155b92' }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}


