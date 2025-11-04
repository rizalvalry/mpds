import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Responsive Utility for Dynamic Layouts
 * Supports all device sizes and orientations
 */

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference)
const baseWidth = 960; // Tablet landscape reference
const baseHeight = 600;

/**
 * Scale size based on screen width
 */
export const scale = (size) => {
  return (SCREEN_WIDTH / baseWidth) * size;
};

/**
 * Scale size based on screen height
 */
export const verticalScale = (size) => {
  return (SCREEN_HEIGHT / baseHeight) * size;
};

/**
 * Moderate scale with factor
 */
export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

/**
 * Font size scaling
 */
export const scaleFontSize = (size) => {
  const newSize = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get responsive padding based on screen size
 */
export const getResponsivePadding = () => {
  if (SCREEN_WIDTH < 600) {
    return 16; // Phone
  } else if (SCREEN_WIDTH < 960) {
    return 24; // Small tablet
  } else {
    return 32; // Large tablet/landscape
  }
};

/**
 * Get responsive font sizes
 */
export const fontSizes = {
  tiny: scaleFontSize(10),
  small: scaleFontSize(12),
  medium: scaleFontSize(14),
  regular: scaleFontSize(16),
  large: scaleFontSize(18),
  xlarge: scaleFontSize(20),
  xxlarge: scaleFontSize(24),
  huge: scaleFontSize(32),
  title: scaleFontSize(28),
  headerTitle: scaleFontSize(36),
};

/**
 * Get responsive spacing
 */
export const spacing = {
  tiny: scale(4),
  small: scale(8),
  medium: scale(12),
  regular: scale(16),
  large: scale(20),
  xlarge: scale(24),
  xxlarge: scale(32),
  huge: scale(40),
};

/**
 * Check if device is tablet
 */
export const isTablet = () => {
  return SCREEN_WIDTH >= 600;
};

/**
 * Check if device is in landscape
 */
export const isLandscape = () => {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
};

/**
 * Get number of columns for grid
 */
export const getGridColumns = () => {
  if (SCREEN_WIDTH < 600) return 1;
  if (SCREEN_WIDTH < 960) return 2;
  return 3;
};

/**
 * Responsive values based on screen size
 */
export const getResponsiveValue = (phone, tablet, desktop) => {
  if (SCREEN_WIDTH < 600) return phone;
  if (SCREEN_WIDTH < 960) return tablet;
  return desktop;
};

export const dimensions = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

export default {
  scale,
  verticalScale,
  moderateScale,
  scaleFontSize,
  getResponsivePadding,
  fontSizes,
  spacing,
  isTablet,
  isLandscape,
  getGridColumns,
  getResponsiveValue,
  dimensions,
};
