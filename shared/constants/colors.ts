/**
 * Color constants used throughout the app
 */
export const COLORS = {
  // Patient theme (green)
  patient: {
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    background: ['#1a1a2e', '#1B2E1F', '#1D3020'] as const,
    cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const,
  },
  // Doctor theme (blue)
  doctor: {
    primary: '#4facfe',
    primaryLight: '#00f2fe',
    primaryDark: '#0091ea',
    background: ['#1a1a2e', '#16213e', '#0f3460'] as const,
    cardBg: ['rgba(79, 172, 254, 0.1)', 'rgba(79, 172, 254, 0.05)'] as const,
  },
  // Shared colors
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
  success: ['#10B981', '#059669'] as const,
  warning: ['#F59E0B', '#D97706'] as const,
  error: ['#EF4444', '#DC2626'] as const,
  info: ['#3B82F6', '#2563EB'] as const,
  border: 'rgba(255, 255, 255, 0.2)',
  white: '#FFFFFF',
  black: '#000000',
};





