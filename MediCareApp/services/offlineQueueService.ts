import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

export interface QueuedAction {
  id: string;
  type: 'confirm' | 'snooze';
  reminderId: string;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

/**
 * Offline Queue Service
 * Manages offline actions (confirm/snooze) and syncs them when online
 */
class OfflineQueueService {
  private QUEUE_KEY = '@medication_action_queue';
  private MAX_RETRY_COUNT = 3;
  private isSyncing = false;

  /**
   * Add an action to the queue
   */
  async addAction(type: 'confirm' | 'snooze', reminderId: string): Promise<void> {
    try {
      console.log(`📝 Adding ${type} action to queue for reminder:`, reminderId);

      const action: QueuedAction = {
        id: `${type}_${reminderId}_${Date.now()}`,
        type,
        reminderId,
        timestamp: new Date().toISOString(),
        synced: false,
        retryCount: 0,
      };

      // Get existing queue
      const queue = await this.getQueue();
      
      // Add new action
      queue.push(action);
      
      // Save updated queue
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`✅ Action added to queue. Queue size: ${queue.length}`);
    } catch (error) {
      console.error('❌ Error adding action to queue:', error);
      throw error;
    }
  }

  /**
   * Get all queued actions
   */
  async getQueue(): Promise<QueuedAction[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (!queueJson) {
        return [];
      }
      return JSON.parse(queueJson);
    } catch (error) {
      console.error('❌ Error reading queue:', error);
      return [];
    }
  }

  /**
   * Get count of pending (unsynced) actions
   */
  async getPendingCount(): Promise<number> {
    try {
      const queue = await this.getQueue();
      return queue.filter(action => !action.synced).length;
    } catch (error) {
      console.error('❌ Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Sync queue with backend
   */
  async syncQueue(token: string): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
  }> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping');
      return { success: false, syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;

    try {
      console.log('🔄 Starting queue sync...');

      const queue = await this.getQueue();
      const unsyncedActions = queue.filter(action => !action.synced);

      if (unsyncedActions.length === 0) {
        console.log('✅ No actions to sync');
        return { success: true, syncedCount: 0, failedCount: 0 };
      }

      console.log(`📤 Syncing ${unsyncedActions.length} actions...`);

      let syncedCount = 0;
      let failedCount = 0;

      // Batch sync all actions in one request
      try {
        console.log(`  Batch syncing ${unsyncedActions.length} actions to backend...`);
        
        const result = await apiService.syncOfflineActions(
          token, 
          unsyncedActions.map(a => ({
            id: a.id,
            type: a.type,
            reminderId: a.reminderId,
            timestamp: a.timestamp,
          }))
        );

        if (result.success && result.data?.results) {
          // Process results from backend
          result.data.results.forEach((syncResult: any) => {
            const action = unsyncedActions.find(a => a.id === syncResult.id);
            if (action) {
              if (syncResult.success) {
                action.synced = true;
                syncedCount++;
                console.log(`  ✅ Synced ${action.type} action: ${action.reminderId}`);
              } else {
                action.retryCount++;
                if (action.retryCount >= this.MAX_RETRY_COUNT) {
                  action.synced = true; // Remove from queue
                  console.log(`  ⚠️ Max retries exceeded for ${action.id}`);
                }
                failedCount++;
                console.log(`  ❌ Failed to sync ${action.type}: ${syncResult.error}`);
              }
            }
          });
        } else {
          // Batch sync failed - mark all for retry
          console.error('  ❌ Batch sync failed');
          unsyncedActions.forEach(action => {
            action.retryCount++;
            if (action.retryCount >= this.MAX_RETRY_COUNT) {
              action.synced = true;
            }
          });
          failedCount = unsyncedActions.length;
        }
      } catch (batchError) {
        console.error('  ❌ Error in batch sync:', batchError);
        // Mark all for retry
        unsyncedActions.forEach(action => {
          action.retryCount++;
          if (action.retryCount >= this.MAX_RETRY_COUNT) {
            action.synced = true;
          }
        });
        failedCount = unsyncedActions.length;
      }

      // Update queue (remove synced actions)
      const updatedQueue = queue.filter(action => !action.synced);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(updatedQueue));

      console.log(`✅ Sync completed: ${syncedCount} synced, ${failedCount} failed, ${updatedQueue.length} remaining`);

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
      };
    } catch (error) {
      console.error('❌ Error syncing queue:', error);
      return { success: false, syncedCount: 0, failedCount: unsyncedActions.length };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clear all synced actions from queue
   */
  async clearSynced(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const unsynced = queue.filter(action => !action.synced);
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(unsynced));
      console.log(`🧹 Cleared synced actions. ${unsynced.length} actions remaining`);
    } catch (error) {
      console.error('❌ Error clearing synced actions:', error);
    }
  }

  /**
   * Clear entire queue (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('🧹 Queue cleared completely');
    } catch (error) {
      console.error('❌ Error clearing queue:', error);
    }
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;

