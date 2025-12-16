import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function ChooseDroneScreen({ loginResponse, setSession }) {
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleNext = () => {
    // Save session and navigate to dashboard
    setSession(loginResponse);
  };

  return (
    <View style={styles.container}>
      {/* Clean Gradient Background - matching login screen */}
      <LinearGradient
        colors={['#e6f2ff', '#f0f8ff', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Elegant Header */}
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Motor Pool Drone Systems</Text>
            <Text style={styles.subtitle}>Drone Information</Text>
          </View>

          {/* Clean Drone Info Card */}
          <View style={styles.droneCard}>
            {/* Drone Code */}
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Drone Code</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoValue}>
                  {loginResponse?.drone?.drone_code || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Operator */}
            <View style={styles.infoGroup}>
              <Text style={styles.infoLabel}>Operator</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoValue}>
                  {loginResponse?.username || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Proceed Button */}
            <TouchableOpacity
              onPress={handleNext}
              style={styles.proceedButtonContainer}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00BFFF', '#1E90FF', '#0047AB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proceedButton}
              >
                <Text style={styles.proceedButtonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerVersion}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 1024 ? width * 0.3 : width > 768 ? width * 0.2 : width > 480 ? 40 : 24,
    paddingVertical: width > 768 ? 60 : 32,
  },
  // Elegant Header
  headerSection: {
    alignItems: 'center',
    marginBottom: width > 768 ? 40 : 32,
  },
  mainTitle: {
    fontSize: width > 1024 ? 36 : width > 768 ? 30 : width > 480 ? 24 : 20,
    fontWeight: '700',
    color: '#0047AB',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: width > 768 ? 16 : 13,
    color: '#666',
    fontWeight: '500',
  },
  // Clean Drone Info Card
  droneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: width > 768 ? 40 : width > 480 ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: width > 768 ? 28 : width > 480 ? 22 : 20,
    fontWeight: '700',
    color: '#0047AB',
    marginBottom: width > 768 ? 28 : 20,
    textAlign: 'center',
  },
  // Info Groups
  infoGroup: {
    marginBottom: width > 768 ? 20 : 16,
  },
  infoLabel: {
    fontSize: width > 768 ? 14 : 12,
    fontWeight: '600',
    color: '#0047AB',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    paddingHorizontal: width > 768 ? 18 : 14,
    paddingVertical: width > 768 ? 16 : 12,
  },
  infoValue: {
    fontSize: width > 768 ? 18 : 15,
    color: '#333',
    fontWeight: '600',
  },
  // Proceed Button
  proceedButtonContainer: {
    marginTop: width > 768 ? 16 : 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedButton: {
    paddingVertical: width > 768 ? 18 : 14,
    paddingHorizontal: width > 768 ? 36 : 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: width > 768 ? 18 : 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: width > 768 ? 40 : 28,
  },
  footerVersion: {
    fontSize: width > 768 ? 13 : 11,
    color: '#999',
    fontWeight: '500',
  },
});
