import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import DynamicHeader from '../components/shared/DynamicHeader';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function DocumentationsScreen({
  session,
  setActiveMenu,
  setSession,
  embedded = false,
  onNavigate,
}) {
  const { theme } = useTheme();

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
            title="Documentations"
            subtitle="Project Documents & Guides"
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

                <TouchableOpacity
                  onPress={() => handleNavigate('cases')}
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>Cases</Text>
                </TouchableOpacity>

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

              <View style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: theme.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginLeft: 12,
                shadowColor: theme.primary,
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
        </>
      )}

      {/* Content: WebView ditampilkan di area konten, tidak fullscreen */}
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden' }}>
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


