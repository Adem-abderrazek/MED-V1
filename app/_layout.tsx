import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alarmService } from '../shared/services/alarmService';
import { notificationService } from '../shared/services/notificationService';
import { networkMonitor } from '../shared/services/networkMonitor';
import localReminderService from '../shared/services/localReminderService';
import notifeeAlarmService from '../shared/services/notifeeAlarmService';
import * as apiService from '../shared/services/api/patient';
import { offlineQueueService } from '../shared/services/offlineQueueService';
import { getNotificationPermissionStatus, getPermissionStatus } from '../shared/services/permissionService';
import '../i18n';

// Safely import notifee - it may not be available in Expo Go
let notifee: any = null;
let EventType: any = null;

try {
  const notifeeModule = require('@notifee/react-native');
  notifee = notifeeModule.default;
  EventType = notifeeModule.EventType;
  
  // Register background event handler for notifee (only if available)
  if (notifee && notifee.onBackgroundEvent) {
    notifee.onBackgroundEvent(async ({ type, detail }: any) => {
      const { notification, pressAction } = detail;

      if (!notification?.data?.reminderId) return;

      const reminderId = notification.data.reminderId as string;

      console.log('🔔 Notifee background event:', EventType?.[type], pressAction?.id);

      if (type === EventType?.ACTION_PRESS && pressAction) {
        if (pressAction.id === 'confirm') {
          console.log('✅ Background confirm action');
          try {
            await confirmReminderAndSync(reminderId);
            if (notifee?.cancelNotification) {
              await notifee.cancelNotification(notification.id!);
            }
          } catch (error) {
            console.error('Error confirming medication in background:', error);
          }
        } else if (pressAction.id === 'snooze') {
          console.log('⏰ Background snooze action');
          try {
            await localReminderService.snoozeReminderLocally(reminderId);
            if (notifee?.cancelNotification) {
              await notifee.cancelNotification(notification.id!);
            }
          } catch (error) {
            console.error('Error snoozing in background:', error);
          }
        }
      }
    });
  }
} catch (error) {
  console.warn('⚠️ Notifee not available (expected in Expo Go):', error);
}

const MEDS_CACHE_PREFIX = '@patient_medications_by_date:';
const STATS_CACHE_PREFIX = '@patient_medication_stats_by_date:';

const updateCachedMedicationStatus = async (reminderIds: string[]) => {
  try {
    const reminderSet = new Set(reminderIds);
    const keys = await AsyncStorage.getAllKeys();
    const medsKeys = keys.filter(key => key.startsWith(MEDS_CACHE_PREFIX));

    for (const medsKey of medsKeys) {
      const medsJson = await AsyncStorage.getItem(medsKey);
      if (!medsJson) continue;

      const meds = JSON.parse(medsJson) as Array<{ reminderId: string; status: string }>;
      let updated = false;
      const updatedMeds = meds.map(med => {
        if (reminderSet.has(med.reminderId) && med.status !== 'taken') {
          updated = true;
          return { ...med, status: 'taken' };
        }
        return med;
      });

      if (!updated) continue;

      await AsyncStorage.setItem(medsKey, JSON.stringify(updatedMeds));

      const dateKey = medsKey.replace(MEDS_CACHE_PREFIX, '');
      const total = updatedMeds.length;
      const taken = updatedMeds.filter(med => med.status === 'taken').length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
      const statsKey = `${STATS_CACHE_PREFIX}${dateKey}`;
      await AsyncStorage.setItem(
        statsKey,
        JSON.stringify({ totalMedicationsToday: total, takenToday: taken, adherenceRate })
      );
    }
  } catch (error) {
    console.error('Error updating cached medication status:', error);
  }
};

const confirmReminderAndSync = async (reminderId: string) => {
  try {
    await localReminderService.confirmReminderLocally(reminderId);
    await updateCachedMedicationStatus([reminderId]);
    await AsyncStorage.setItem('@patient_dashboard_refresh', new Date().toISOString());

    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      return;
    }

    const online = await networkMonitor.isOnline();
    if (online) {
      try {
        await apiService.confirmMedicationTaken(token, [reminderId]);
      } catch (error) {
        console.error('Error confirming medication with backend:', error);
        await offlineQueueService.addAction('confirm', reminderId);
      }
    } else {
      await offlineQueueService.addAction('confirm', reminderId);
    }
  } catch (error) {
    console.error('Error confirming reminder:', error);
  }
};

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const permissionRouteInFlight = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    console.log('🚀 Initializing notification and network systems...');

    // Initialize notifee alarm service for Android
    if (Platform.OS === 'android' && notifee) {
      notifeeAlarmService.initialize().catch(err => {
        console.error('❌ Error initializing notifee alarm service:', err);
      });
    }

    // Initialize network monitoring
    networkMonitor.init().catch(err => {
      console.error('❌ Error initializing network monitor:', err);
    });

    // Initialize notification service
    const initNotifications = async () => {
      try {
        const token = await notificationService.initialize();
        if (token) {
          console.log('✅ Notification service initialized with token');
        } else {
          console.log('⚠️ Notification service initialized without token (emulator or no permissions)');
        }
      } catch (error: any) {
        console.error('❌ Error initializing notifications:', error);
        if (error.message && error.message.includes('Firebase')) {
          console.log('📱 Firebase error detected - continuing with local notifications only');
        }
      }
    };

    initNotifications();

    let isProcessingPendingConfirmations = false;

    const processNativePendingConfirmations = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      if (isProcessingPendingConfirmations) {
        console.log('Pending confirmations already processing, skipping');
        return;
      }

      isProcessingPendingConfirmations = true;

      try {
        const pending = await alarmService.getPendingConfirmations();
        if (!pending.length) {
          return;
        }

        const reminderIds = Array.from(new Set(pending.map(item => item.reminderId).filter(Boolean)));
        if (!reminderIds.length) {
          return;
        }
        for (const reminderId of reminderIds) {
          await confirmReminderAndSync(reminderId);
        }

        await alarmService.clearPendingConfirmations();
        await AsyncStorage.setItem('@patient_dashboard_refresh', new Date().toISOString());
      } catch (error) {
        console.error('Error processing native pending confirmations:', error);
      } finally {
        isProcessingPendingConfirmations = false;
      }
    };

    const resolveHomeRoute = (userType?: string | null) => {
      if (userType === 'medecin' || userType === 'tuteur') {
        return '/(doctor)/dashboard';
      }
      return '/(patient)/dashboard';
    };

    const maybeEnforcePermissions = async (source: string) => {
      if (permissionRouteInFlight.current) {
        return;
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          return;
        }

        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        if (user?.userType !== 'patient') {
          return;
        }

        const permissionStatus = await getPermissionStatus();
        const isOnboarding = pathnameRef.current?.includes('permissions-onboarding');

        if (!permissionStatus.allGranted && !isOnboarding) {
          permissionRouteInFlight.current = true;
          router.replace('/(shared)/permissions-onboarding' as any);
          setTimeout(() => {
            permissionRouteInFlight.current = false;
          }, 500);
          return;
        }

        if (permissionStatus.allGranted && isOnboarding) {
          permissionRouteInFlight.current = true;
          router.replace(resolveHomeRoute(user?.userType) as any);
          setTimeout(() => {
            permissionRouteInFlight.current = false;
          }, 500);
        }
      } catch (error) {
        console.error(`Error enforcing permissions (${source}):`, error);
      }
    };

    const maybeReconcileReminders = async (source: string) => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          return;
        }

        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        if (user?.userType !== 'patient') {
          return;
        }

        console.log(`Starting reminder reconcile (${source})`);
        await localReminderService.reconcileReminders(token);
      } catch (error) {
        console.error(`Error reconciling reminders (${source}):`, error);
      }
    };

    // Permissions are handled by the onboarding flow.
    if (false) {
      alarmService.ensureAlarmPermissions().catch(err => {
        console.error('❌ Error requesting alarm permissions:', err);
      });
    }

    // Handle notifee events (for Android full-screen alarms)
    const handleNotifeeEvent = async ({ type, detail }: { type: any; detail: any }) => {
      const { notification, pressAction } = detail;

      if (!notification?.data?.reminderId) return;

      const reminderId = notification.data.reminderId as string;

      console.log('🔔 Notifee event:', EventType?.[type], pressAction?.id);

      // Native XML alarm handles full-screen UI; no RN alarm navigation.

      // Handle action button presses
      if (EventType && type === EventType.ACTION_PRESS && pressAction) {
        if (pressAction.id === 'confirm') {
          console.log('✅ Confirm action pressed');
          try {
            await confirmReminderAndSync(reminderId);
            if (notifee?.cancelNotification) {
              await notifee.cancelNotification(notification.id);
            }
          } catch (error) {
            console.error('Error confirming medication:', error);
          }
        } else if (pressAction.id === 'snooze') {
          console.log('⏰ Snooze action pressed');
          try {
            await localReminderService.snoozeReminderLocally(reminderId);
            if (notifee?.cancelNotification) {
              await notifee.cancelNotification(notification.id);
            }
          } catch (error) {
            console.error('Error snoozing reminder:', error);
          }
        }
      }
    };

    // Subscribe to notifee foreground events
    let notifeeUnsubscribe: (() => void) | null = null;
    if (notifee && notifee.onForegroundEvent) {
      try {
        notifeeUnsubscribe = notifee.onForegroundEvent(handleNotifeeEvent);
      } catch (error) {
        console.warn('⚠️ Could not set up notifee foreground events:', error);
      }
    }

    // Handle notification received while app is in foreground
    const notificationReceivedListener = notificationService.addNotificationReceivedListener(
      async (notification) => {
        console.log('📩 Notification received in foreground:', notification);

        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log("?Y'S Medication reminder detected (native alarm handles UI):", medicationData);
        }
      }
    );

    // Handle app state changes to detect when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);

      if (nextAppState === 'active') {
        console.log('🚀 App is now active - checking for pending medication reminders');
        notificationService.handleBackgroundNotificationCheck().catch(err => {
          console.error('❌ Error in background notification check:', err);
        });
        processNativePendingConfirmations();
        maybeEnforcePermissions('app-active');
        maybeReconcileReminders('app-active');
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const handleNetworkChange = (online: boolean) => {
      if (online) {
        maybeReconcileReminders('network-online');
      }
    };

    networkMonitor.addListener(handleNetworkChange);

    // Handle notification tapped (user clicked on notification or action button)
    const notificationResponseListener = notificationService.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('👆 Notification response:', response);
        console.log('   Action identifier:', response.actionIdentifier);

        const notification = response.notification;
        const actionIdentifier = response.actionIdentifier;
        const data = notification.request.content.data;
        const reminderId = data.reminderId as string | undefined;

        if (!reminderId) {
          return;
        }

        if (actionIdentifier === 'confirm') {
          console.log('✅ Quick confirm action from lock screen');
          try {
            await confirmReminderAndSync(reminderId);
            console.log('✅ Reminder confirmed from lock screen');
          } catch (error) {
            console.error('❌ Error confirming from lock screen:', error);
          }
          return;
        } else if (actionIdentifier === 'snooze') {
          console.log('⏰ Quick snooze action from lock screen');
          try {
            await localReminderService.snoozeReminderLocally(reminderId);
            console.log('✅ Reminder snoozed from lock screen');
          } catch (error) {
            console.error('❌ Error snoozing from lock screen:', error);
          }
          return;
        }

        // User tapped on the notification body - open dashboard
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('Notification tapped by user, opening dashboard:', medicationData);
        }

        if (medicationData && Platform.OS === 'ios') {
          try {
            await localReminderService.cancelPendingNotifications(reminderId);
          } catch (error) {
            console.warn('Error cancelling pending iOS notifications:', error);
          }

          const audioPath = medicationData.voicePath ? encodeURIComponent(medicationData.voicePath) : '';
          const nameParam = medicationData.medicationName
            ? encodeURIComponent(medicationData.medicationName)
            : '';
          const dosageParam = medicationData.dosage ? encodeURIComponent(medicationData.dosage) : '';

          router.replace({
            pathname: '/(patient)/alarm',
            params: {
              reminderId,
              audioPath,
              medicationName: nameParam,
              dosage: dosageParam,
            },
          } as any);
          return;
        }

        try {
          const userData = await AsyncStorage.getItem('userData');
          const user = userData ? JSON.parse(userData) : null;
          await AsyncStorage.setItem('@patient_dashboard_refresh', new Date().toISOString());
          if (user?.userType === 'patient') {
            router.replace('/(patient)/dashboard' as any);
          } else if (user?.userType === 'medecin' || user?.userType === 'tuteur') {
            router.replace('/(doctor)/dashboard' as any);
          }
        } catch (error) {
          console.error('Error opening dashboard from notification:', error);
        }
      }
    );

    // Handle deep links from native AlarmActivity (Android)
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 Deep link received:', event.url);

      const url = new URL(event.url);
      const action = url.searchParams.get('action');
      const reminderId = url.searchParams.get('reminderId');

      if (action === 'confirm' && reminderId) {
        try {
          await confirmReminderAndSync(reminderId);
          console.log('✅ Reminder confirmed from native alarm');
        } catch (error) {
          console.error('❌ Error confirming from native alarm:', error);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    processNativePendingConfirmations();
    maybeEnforcePermissions('startup');
    maybeReconcileReminders('startup');

    return () => {
      console.log('🧹 Cleaning up notification listeners');
      notificationReceivedListener.remove();
      notificationResponseListener.remove();
      appStateSubscription.remove();
      networkMonitor.removeListener(handleNetworkChange);
      linkingSubscription.remove();
      if (notifeeUnsubscribe) {
        notifeeUnsubscribe();
      }
      notificationService.cleanup();
    };
  }, [router]);

  useEffect(() => {
    const enforcePermissionsOnRouteChange = async () => {
      if (permissionRouteInFlight.current) {
        return;
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          return;
        }

        const userData = await AsyncStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        if (user?.userType !== 'patient') {
          return;
        }

        const permissionStatus = await getPermissionStatus();
        const isOnboarding = pathname.includes('permissions-onboarding');

        if (!permissionStatus.allGranted && !isOnboarding) {
          permissionRouteInFlight.current = true;
          router.replace('/(shared)/permissions-onboarding' as any);
          setTimeout(() => {
            permissionRouteInFlight.current = false;
          }, 500);
          return;
        }

        if (permissionStatus.allGranted && isOnboarding) {
          permissionRouteInFlight.current = true;
          router.replace('/(patient)/dashboard' as any);
          setTimeout(() => {
            permissionRouteInFlight.current = false;
          }, 500);
        }
      } catch (error) {
        console.error('Error enforcing permissions on route change:', error);
      }
    };

    enforcePermissionsOnRouteChange();
  }, [pathname, router]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ animation: 'none' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/verify-code" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)/profile" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)/edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/alarm" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/profile" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/profile-settings" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)/adherence-history" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/permissions-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/add-patient" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/terms" options={{ headerShown: false }} />
        <Stack.Screen name="(shared)/privacy-policy" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" translucent={false} backgroundColor="#FFFFFF" />
    </SafeAreaProvider>
  );
}
