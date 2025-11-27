import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen() {
  return (
    <LinearGradient
      colors={['#00baff', '#00baff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <LottieView
        source={require('../../../assets/fly.json')}
        autoPlay
        loop
        style={styles.lottie}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width,
    height: height * 0.8,
  },
});
