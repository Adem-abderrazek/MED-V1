// Theme colors for different user types
export const THEME_COLORS = {
  patient: {
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    gradient: ['#10B981', '#34D399'],
    background: ['#1a1a2e', '#1B2E1F', '#1D3020'],
    cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'],
  },
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'theme.ts:40',message:'getThemeColors called',data:{userType,isNull:!userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  // #endregion
  // Use neutral/default theme (medecin/blue) when user is not logged in
  if (!userType || (userType !== 'patient' && userType !== 'medecin' && userType !== 'tuteur')) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'theme.ts:43',message:'Returning default theme (medecin/blue)',data:{userType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    return {
      ...THEME_COLORS.medecin,
      ...THEME_COLORS.shared,
    };
  }
  
  const baseTheme = THEME_COLORS[userType];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef6884b6-78e4-4a25-87fa-c5f8fa77e982',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'theme.ts:50',message:'Returning user-specific theme',data:{userType,primaryColor:baseTheme.primary},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
  // #endregion
  return {
    ...baseTheme,
    ...THEME_COLORS.shared,
  };
};


