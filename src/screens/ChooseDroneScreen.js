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
    paddingHorizontal: width > 768 ? width * 0.25 : 32,
    paddingVertical: 40,
  },
  // Elegant Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: width > 768 ? 32 : 26,
    fontWeight: '700',
    color: '#0047AB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Clean Drone Info Card
  droneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0047AB',
    marginBottom: 24,
    textAlign: 'center',
  },
  // Info Groups
  infoGroup: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0047AB',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  // Proceed Button
  proceedButtonContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerVersion: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});
