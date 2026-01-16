import Constants from 'expo-constants';

// API Configuration
export const API_CONFIG = {
  BASE_URL: "http://51.91.249.6:5000/api",
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

export const getApiConfig = () => {
  let envUrl: string | undefined;
  
  // Try process.env (works in development/Expo Go)
  envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // If not found, try Constants.expoConfig.extra (works in production builds)
  if (!envUrl && Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL) {
    envUrl = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL as string;
  }
  
  if (envUrl) {
    console.log('🌍 Using API URL from config:', envUrl);
    const source = process.env.EXPO_PUBLIC_API_URL ? 'process.env' : 'Constants.expoConfig.extra';
    console.log('📍 Source:', source);
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

// Helper function to fix URLs that might have old IP addresses
// This is needed because the backend might return URLs with old IPs stored in the database
export const fixUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // Extract the current base URL (without /api)
  const config = getApiConfig();
  const currentBaseUrl = config.BASE_URL.replace('/api', '');
  
  // Extract the current IP and port from the base URL
  const currentBaseMatch = currentBaseUrl.match(/http:\/\/([^/]+)/);
  if (!currentBaseMatch) {
    return url; // Can't extract current base, return as-is
  }
  
  const currentHost = currentBaseMatch[1]; 
  
  // Replace any IP:port pattern in the URL with the current one
  // Match http://192.168.1.15:5000 or http://192.168.1.16:5000 (or any other IP:port)
  const urlPattern = /http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)/;
  const match = url.match(urlPattern);
  
  if (match) {
    const oldHost = `${match[1]}:${match[2]}`; // e.g., "192.168.1.15:5000"
    // Only replace if it's different from the current host
    if (oldHost !== currentHost) {
      return url.replace(`http://${oldHost}`, `http://${currentHost}`);
    }
  }
  
  return url;
};

