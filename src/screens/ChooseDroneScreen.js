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
      {/* Premium Background */}
      <LinearGradient
        colors={['#0A0E27', '#1a1f3a', '#0047AB', '#1E90FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Decorative Circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Motor Pool Drone Systems</Text>
            <View style={styles.dividerLine} />
            <Text style={styles.subtitle}>Drone Selection</Text>
          </View>

          {/* Drone Selection Card */}
          <BlurView intensity={20} tint="dark" style={styles.droneCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            >
              {/* <Text style={styles.cardTitle}>SELECTED DRONE</Text> */}

              {/* Drone Icon */}
              {/* <View style={styles.droneIconContainer}>
                <Text style={styles.droneIcon}>🚁</Text>
              </View> */}

              {/* Drone Code Display */}
              <View style={styles.droneInfoContainer}>
                <Text style={styles.droneLabel}>DRONE CODE</Text>
                <View style={styles.droneCodeBox}>
                  <Text style={styles.droneCode}>
                    {loginResponse?.drone?.drone_code || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Operator Info */}
              <View style={styles.operatorInfo}>
                <Text style={styles.operatorLabel}>OPERATOR</Text>
                <Text style={styles.operatorName}>{loginResponse?.username || 'Unknown'}</Text>
              </View>

              {/* Next Button */}
              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextButtonContainer}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00BFFF', '#1E90FF', '#0047AB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextButtonText}>PROCEED</Text>
                  <Text style={styles.nextButtonArrow}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </BlurView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>POWERED BY BSI RESEARCH & DEVELOPMENT</Text>
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
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.1,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#00BFFF',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#1E90FF',
    bottom: -50,
    left: -50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 768 ? width * 0.25 : 32,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: width > 768 ? 32 : 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  dividerLine: {
    width: 80,
    height: 2,
    backgroundColor: '#00BFFF',
    marginVertical: 12,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00BFFF',
    letterSpacing: 1.5,
  },
  droneCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  glassGradient: {
    padding: 32,
    borderRadius: 24,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  droneIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  droneIcon: {
    fontSize: 72,
    textShadowColor: 'rgba(0, 191, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  droneInfoContainer: {
    marginBottom: 24,
  },
  droneLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  droneCodeBox: {
    backgroundColor: 'rgba(0, 191, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00BFFF',
    alignItems: 'center',
  },
  droneCode: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00BFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 191, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  operatorInfo: {
    marginBottom: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  operatorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  nextButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  nextButtonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
});
