import { Platform, PermissionsAndroid } from 'react-native';
import * as Notifications from 'expo-notifications';
import { alarmService } from './alarmService';
import { CRITICAL_ALERTS_ENABLED } from './notificationService';

export type PermissionStatus = {
  notifications: boolean;
  exactAlarms: boolean;
  overlays: boolean;
  batteryOptimizations: boolean;
  allGranted: boolean;
};

export async function getNotificationPermissionStatus(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const settings = await Notifications.getPermissionsAsync();
    return settings.status === 'granted';
  } catch (error) {
    console.error('Failed to check notification permission:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: false,
        allowCriticalAlerts: CRITICAL_ALERTS_ENABLED,
        provideAppNotificationSettings: false,
        allowProvisional: false,
      },
    });
    return result.status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const notifications = await getNotificationPermissionStatus();

  if (Platform.OS !== 'android') {
    return {
      notifications,
      exactAlarms: true,
      overlays: true,
      batteryOptimizations: true,
      allGranted: notifications,
    };
  }

  const [exactAlarms, overlays, batteryOptimizations] = await Promise.all([
    alarmService.canScheduleExactAlarms().catch(() => false),
    alarmService.canDrawOverlays().catch(() => false),
    alarmService.isIgnoringBatteryOptimizations().catch(() => false),
  ]);

  return {
    notifications,
    exactAlarms,
    overlays,
    batteryOptimizations,
    allGranted: notifications && exactAlarms && overlays && batteryOptimizations,
  };
}
