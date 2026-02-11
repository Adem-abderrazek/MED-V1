import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_CACHE_PREFIX = '@user_profile_cache';

export const getProfileCacheKey = (userId?: string | null) =>
  `${PROFILE_CACHE_PREFIX}:${userId || 'current'}`;

export async function loadCachedProfile<T = any>(userId?: string | null): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(getProfileCacheKey(userId));
    if (!stored) return null;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error('Error loading cached profile:', error);
    return null;
  }
}

export async function saveCachedProfile(profile: any, userId?: string | null): Promise<void> {
  try {
    await AsyncStorage.setItem(getProfileCacheKey(userId), JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving cached profile:', error);
  }
}

export async function clearAllProfileCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(PROFILE_CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('Error clearing profile cache:', error);
  }
}
