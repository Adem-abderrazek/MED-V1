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
 * Offline Queue Service (functional)
 * Manages offline actions (confirm/snooze) and syncs them when online
 */

const QUEUE_KEY = '@medication_action_queue';
const MAX_RETRY_COUNT = 3;
let isSyncing = false;


export async function addAction(type: 'confirm' | 'snooze', reminderId: string): Promise<void> {
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

    const queue = await getQueue();
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    console.log(`✅ Action added to queue. Queue size: ${queue.length}`);
  } catch (error) {
    console.error('❌ Error adding action to queue:', error);
    throw error;
  }
}


export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) return [];
    return JSON.parse(queueJson);
  } catch (error) {
    console.error('❌ Error reading queue:', error);
    return [];
  }
}


export async function getPendingCount(): Promise<number> {
  try {
    const queue = await getQueue();
    return queue.filter(action => !action.synced).length;
  } catch (error) {
    console.error('❌ Error getting pending count:', error);
    return 0;
  }
}


export async function syncQueue(token: string): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
}> {
  if (isSyncing) {
    console.log('⚠️ Sync already in progress, skipping');
    return { success: false, syncedCount: 0, failedCount: 0 };
  }

  isSyncing = true;

  try {
    console.log('🔄 Starting queue sync...');

    const queue = await getQueue();
    const unsyncedActions = queue.filter(action => !action.synced);

    if (unsyncedActions.length === 0) {
      console.log('✅ No actions to sync');
      return { success: true, syncedCount: 0, failedCount: 0 };
    }

    console.log(`📤 Syncing ${unsyncedActions.length} actions...`);

    let syncedCount = 0;
    let failedCount = 0;

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

      // Fix: handle when result.data may not have 'results', and fix lint error
      const resultsArray = Array.isArray((result.data as any)?.results) ? (result.data as any).results : [];
      if (result.success && resultsArray.length > 0) {
        resultsArray.forEach((syncResult: any) => {
          const action = unsyncedActions.find(a => a.id === syncResult.id);
          if (action) {
            if (syncResult.success) {
              action.synced = true;
              syncedCount++;
              console.log(`  ✅ Synced ${action.type} action: ${action.reminderId}`);
            } else {
              action.retryCount++;
              if (action.retryCount >= MAX_RETRY_COUNT) {
                action.synced = true; // drop after max retries
                console.log(`  ⚠️ Max retries exceeded for ${action.id}`);
              }
              failedCount++;
              console.log(`  ❌ Failed to sync ${action.type}: ${syncResult.error}`);
            }
          }
        });
      } else {
        console.error('  ❌ Batch sync failed');
        unsyncedActions.forEach(action => {
          action.retryCount++;
          if (action.retryCount >= MAX_RETRY_COUNT) {
            action.synced = true;
          }
        });
        failedCount = unsyncedActions.length;
      }
    } catch (batchError) {
      console.error('  ❌ Error in batch sync:', batchError);
      unsyncedActions.forEach(action => {
        action.retryCount++;
        if (action.retryCount >= MAX_RETRY_COUNT) {
          action.synced = true;
        }
      });
      failedCount = unsyncedActions.length;
    }

    const updatedQueue = queue.filter(action => !action.synced);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));

    console.log(`✅ Sync completed: ${syncedCount} synced, ${failedCount} failed, ${updatedQueue.length} remaining`);

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
    };
  } catch (error) {
    console.error('❌ Error syncing queue:', error);
    return { success: false, syncedCount: 0, failedCount: 0 };
  } finally {
    isSyncing = false;
  }
}


export async function clearSynced(): Promise<void> {
  try {
    const queue = await getQueue();
    const unsynced = queue.filter(action => !action.synced);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(unsynced));
    console.log(`🧹 Cleared synced actions. ${unsynced.length} actions remaining`);
  } catch (error) {
    console.error('❌ Error clearing synced actions:', error);
  }
}


export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('🧹 Queue cleared completely');
  } catch (error) {
    console.error('❌ Error clearing queue:', error);
  }
}


export const offlineQueueService = {
  addAction,
  getQueue,
  getPendingCount,
  syncQueue,
  clearSynced,
  clearAll,
};