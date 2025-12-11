import NetInfo from '@react-native-community/netinfo';

type NetworkListener = (isOnline: boolean) => void;

// Internal state
let listeners: NetworkListener[] = [];
let isInitialized = false;
let currentOnlineState: boolean | null = null;

/**
 * Initialize network monitoring (idempotent)
 */
export async function init(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️ NetworkMonitor already initialized');
    return;
  }

  console.log('🌐 Initializing NetworkMonitor...');

  // Subscribe to network state changes with debouncing
  NetInfo.addEventListener(state => {
    const isOnline = !!(state.isConnected && state.isInternetReachable);

    if (currentOnlineState !== isOnline) {
      console.log(`🌐 Network state changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      currentOnlineState = isOnline;

      // Debounce to avoid rapid toggling
      setTimeout(() => {
        listeners.forEach(listener => {
          try {
            listener(isOnline);
          } catch (error) {
            console.error('❌ Error in network listener:', error);
          }
        });
      }, 100);
    }
  });

  // Get initial state
  const initialState = await NetInfo.fetch();
  currentOnlineState = !!(initialState.isConnected && initialState.isInternetReachable);
  console.log(`✅ NetworkMonitor initialized. Current state: ${currentOnlineState ? 'ONLINE' : 'OFFLINE'}`);

  isInitialized = true;
}

/**
 * Check if device is currently online (fresh fetch)
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  } catch (error) {
    console.error('❌ Error checking online status:', error);
    return false;
  }
}

/**
 * Add a listener for network state changes
 */
export function addListener(listener: NetworkListener): void {
  listeners.push(listener);
  console.log(`🎧 Network listener added. Total listeners: ${listeners.length}`);

  // Immediately notify with current state if known
  if (currentOnlineState !== null) {
    listener(currentOnlineState);
  }
}

/**
 * Remove a listener
 */
export function removeListener(listener: NetworkListener): void {
  const index = listeners.indexOf(listener);
  if (index > -1) {
    listeners.splice(index, 1);
    console.log(`🔇 Network listener removed. Total listeners: ${listeners.length}`);
  }
}

/**
 * Get last known network state (null if not initialized)
 */
export function getCurrentState(): boolean | null {
  return currentOnlineState;
}

/**
 * Temporary compatibility export so existing code using
 * `networkMonitor.init()` style continues to work.
 * You can later import functions directly:
 *   import { init, isOnline, addListener, removeListener, getCurrentState } from './networkMonitor';
 */
export const networkMonitor = {
  init,
  isOnline,
  addListener,
  removeListener,
  getCurrentState,
};

export default networkMonitor;