// Theme colors for different user types
export const THEME_COLORS = {
  medecin: {
    primary: '#4facfe',
    primaryLight: '#00f2fe',
    primaryDark: '#0091ea',
    gradient: ['#4facfe', '#00f2fe'],
    background: ['#1a1a2e', '#16213e', '#0f3460'],
    cardBg: ['rgba(79, 172, 254, 0.1)', 'rgba(79, 172, 254, 0.05)'],
  },
  tuteur: {
    primary: '#F97316',
    primaryLight: '#FB923C',
    primaryDark: '#EA580C',
    gradient: ['#F97316', '#FB923C'],
    background: ['#1a1a2e', '#2E1B12', '#3D1D10'],
    cardBg: ['rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.05)'],
  },
  shared: {
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    border: 'rgba(255, 255, 255, 0.2)',
  }
};

// Function to get theme colors based on user type
export const getThemeColors = (userType: 'medecin' | 'tuteur' | 'patient' | null) => {
  const baseTheme = userType && userType !== 'patient' ? THEME_COLORS[userType] : THEME_COLORS.medecin;
  return {
    ...baseTheme,
    ...THEME_COLORS.shared,
  };
};

