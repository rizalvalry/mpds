/**
 * Design System Constants
 * Based on fix-design mockups
 */

// Colors from mockup
export const colors = {
  // Primary Blue (dari header mockup)
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  primaryLight: '#38BDF8',

  // Background
  background: '#F5F5F5',
  backgroundWhite: '#FFFFFF',
  backgroundGray: '#E5E7EB',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textWhite: '#FFFFFF',
  textLink: '#0EA5E9',

  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Status Pills
  notStarted: '#E5E7EB',
  notStartedText: '#6B7280',
  inProgress: '#FEF3C7',
  inProgressText: '#92400E',
  failed: '#FEE2E2',
  failedText: '#991B1B',
  completed: '#D1FAE5',
  completedText: '#065F46',

  // Borders and shadows
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Typography (sesuai mockup)
export const typography = {
  // Header title (Upload Images, Monitoring, Cases)
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textWhite,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Card title (AZURE BLOB MONITOR, DRONE AI UPLOAD)
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textLink,
  },

  // Section title (PROCESSING PIPELINE)
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Body text
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },

  // Numbers/Stats
  statNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },

  // Tab navigation
  tabActive: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  tabInactive: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
};

// Layout spacing (sesuai mockup)
export const layout = {
  // Container padding
  containerPadding: 24,
  containerPaddingSmall: 16,

  // Card spacing
  cardPadding: 20,
  cardMargin: 16,
  cardBorderRadius: 12,

  // Header height
  headerHeight: 96,
  headerPadding: 20,

  // Navigation bar height
  navBarHeight: 60,
  navBarPadding: 16,

  // Grid spacing
  gridGap: 16,

  // Section spacing
  sectionMarginBottom: 24,
};

// Shadows (elevation)
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Border radius
export const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  pill: 999,
};

export default {
  colors,
  typography,
  layout,
  shadows,
  borderRadius,
};
