// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://med-production-f99d.up.railway.app/api', // Production URL as fallback
  TIMEOUT: 30000, // Increased timeout to 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

export const getApiConfig = () => {
  // Check for environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envUrl) {
    console.log('🌍 Using environment API URL:', envUrl);
    console.log('📍 Full URL will be:', envUrl);
    return {
      ...API_CONFIG,
      BASE_URL: envUrl,
    };
  }
  
  // Fallback to default development URL
  console.log('🏠 Using default development API URL:', API_CONFIG.BASE_URL);
  console.log('⚠️ Note: This is a local development URL. Make sure your backend server is running!');
  return API_CONFIG;
};

// Helper function to get the current API base URL
export const getBaseUrl = () => {
  const config = getApiConfig();
  console.log('📡 Current API Base URL:', config.BASE_URL);
  return config.BASE_URL;
};
