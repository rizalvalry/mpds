import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function BackgroundWrapper({ children }) {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  const startFloat = (anim) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: -20, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  };

  useEffect(() => {
    startFloat(float1);
    startFloat(float2);
    startFloat(float3);
  }, []);

  // ✅ Web version: use a CSS div background
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* floating lights */}
        <div style={circleStyle('20%', '80%', 'rgba(120,119,198,0.3)')} />
        <div style={circleStyle('80%', '20%', 'rgba(255,119,198,0.3)')} />
        <div style={circleStyle('40%', '40%', 'rgba(120,255,198,0.3)')} />
        <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    );
  }

  // ✅ Native version: use Animated + LinearGradient
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.circle,
          { top: height * 0.8, left: width * 0.2, backgroundColor: 'rgba(120,119,198,0.3)', transform: [{ translateY: float1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          { top: height * 0.2, left: width * 0.8, backgroundColor: 'rgba(255,119,198,0.3)', transform: [{ translateY: float2 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          { top: height * 0.4, left: width * 0.4, backgroundColor: 'rgba(120,255,198,0.3)', transform: [{ translateY: float3 }] },
        ]}
      />

      <View style={{ flex: 1, zIndex: 2 }}>{children}</View>
    </View>
  );
}

// 🎨 Web radial circle generator
const circleStyle = (x, y, color) => ({
  position: 'absolute',
  top: y,
  left: x,
  width: '250px',
  height: '250px',
  borderRadius: '50%',
  background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)`,
  transform: 'translate(-50%, -50%)',
  zIndex: 1,
  animation: 'float 6s ease-in-out infinite',
});

// 📱 Native styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.8,
  },
});

// 🪶 Web animation
if (Platform.OS === 'web') {
  const styleSheet = document.styleSheets[0];
  const keyframes = `
  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
    50% { transform: translate(-50%, -50%) translateY(-20px) rotate(180deg); }
  }`;
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
}
