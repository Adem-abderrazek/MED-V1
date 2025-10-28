import NetInfo from '@react-native-community/netinfo';

type NetworkListener = (isOnline: boolean) => void;

/**
 * Network Monitor Service
 * Monitors network connectivity and notifies listeners of changes
 */
class NetworkMonitor {
  private listeners: NetworkListener[] = [];
  private isInitialized = false;
  private currentOnlineState: boolean | null = null;

  /**
   * Initialize network monitoring
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ NetworkMonitor already initialized');
      return;
    }

    console.log('🌐 Initializing NetworkMonitor...');

    // Subscribe to network state changes with debouncing
    NetInfo.addEventListener(state => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      
      // Only notify if state changed and add small delay to prevent rapid changes
      if (this.currentOnlineState !== isOnline) {
        console.log(`🌐 Network state changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        this.currentOnlineState = isOnline;
        
        // Debounce network state changes to prevent rapid toggling
        setTimeout(() => {
          // Notify all listeners
          this.listeners.forEach(listener => {
            try {
              listener(isOnline);
            } catch (error) {
              console.error('❌ Error in network listener:', error);
            }
          });
        }, 100); // 100ms debounce
      }
    });

    // Get initial state
    const initialState = await NetInfo.fetch();
    this.currentOnlineState = !!(initialState.isConnected && initialState.isInternetReachable);
    console.log(`✅ NetworkMonitor initialized. Current state: ${this.currentOnlineState ? 'ONLINE' : 'OFFLINE'}`);
    
    this.isInitialized = true;
  }

  /**
   * Check if device is currently online
   */
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return !!(state.isConnected && state.isInternetReachable);
    } catch (error) {
      console.error('❌ Error checking online status:', error);
      return false; // Assume offline on error
    }
  }

  /**
   * Add a listener for network state changes
   */
  addListener(listener: NetworkListener): void {
    this.listeners.push(listener);
    console.log(`🎧 Network listener added. Total listeners: ${this.listeners.length}`);
    
    // Immediately notify with current state if known
    if (this.currentOnlineState !== null) {
      listener(this.currentOnlineState);
    }
  }

  /**
   * Remove a listener
   */
  removeListener(listener: NetworkListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
      console.log(`🔇 Network listener removed. Total listeners: ${this.listeners.length}`);
    }
  }

  /**
   * Get current network state
   */
  getCurrentState(): boolean | null {
    return this.currentOnlineState;
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();
export default networkMonitor;





