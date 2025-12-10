import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Linking, Platform, View, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { EventType } from '@notifee/react-native';
import { notificationService } from '../services/notificationService';
import { networkMonitor } from '../services/networkMonitor';
import localReminderService from '../services/localReminderService';
import notifeeAlarmService from '../services/notifeeAlarmService';
import * as apiService from '../services/api/patient';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import '../config/i18n'; // Initialize i18n

// Register background event handler for notifee (handles events when app is killed/background)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (!notification?.data?.reminderId) return;

  const reminderId = notification.data.reminderId as string;

  console.log('🔔 Notifee background event:', EventType[type], pressAction?.id);

  // Handle action button presses in background
  if (type === EventType.ACTION_PRESS && pressAction) {
    if (pressAction.id === 'confirm') {
      console.log('✅ Background confirm action');
      try {
        await localReminderService.confirmReminderLocally(reminderId);
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          await apiService.confirmMedicationTaken(token, [reminderId]);
        }
        await notifee.cancelNotification(notification.id!);
      } catch (error) {
        console.error('Error confirming medication in background:', error);
      }
    } else if (pressAction.id === 'snooze') {
      console.log('⏰ Background snooze action');
      try {
        await localReminderService.snoozeReminderLocally(reminderId);
        await notifee.cancelNotification(notification.id!);
      } catch (error) {
        console.error('Error snoozing in background:', error);
      }
    }
  }
});

function AppContent() {
  const router = useRouter();
  const { isRTL, currentLanguage, t } = useLanguage();

  useEffect(() => {
    console.log('🚀 Initializing notification and network systems...');

    // Initialize notifee alarm service for Android
    if (Platform.OS === 'android') {
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

    // Handle notifee events (for Android full-screen alarms)
    const handleNotifeeEvent = async ({ type, detail }: { type: EventType; detail: any }) => {
      const { notification, pressAction } = detail;

      if (!notification?.data?.reminderId) return;

      const reminderId = notification.data.reminderId as string;
      const medicationName = notification.data.medicationName as string;
      const dosage = notification.data.dosage as string;

      console.log('🔔 Notifee event:', EventType[type], pressAction?.id);

      // Handle full-screen action - navigate to alarm screen automatically when delivered
      // This ensures the alarm shows immediately when notification is delivered, not just on tap
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        if (notification.data.type === 'medication_alarm') {
          console.log('💊 Medication alarm delivered - navigating to alarm screen automatically');
          router.push({
            pathname: '/medication-alarm',
            params: {
              medicationName,
              dosage,
              instructions: notification.data.instructions || '',
              reminderId,
              patientId: notification.data.patientId || '',
              audioPath: notification.data.audioPath || '',
            }
          });
        }
      }

      // Handle action button presses
      if (type === EventType.ACTION_PRESS && pressAction) {
        if (pressAction.id === 'confirm') {
          console.log('✅ Confirm action pressed');
          try {
            await localReminderService.confirmReminderLocally(reminderId);
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
              await apiService.confirmMedicationTaken(token, [reminderId]);
            }
            await notifee.cancelNotification(notification.id);
          } catch (error) {
            console.error('Error confirming medication:', error);
          }
        } else if (pressAction.id === 'snooze') {
          console.log('⏰ Snooze action pressed');
          try {
            await localReminderService.snoozeReminderLocally(reminderId);
            await notifee.cancelNotification(notification.id);
          } catch (error) {
            console.error('Error snoozing reminder:', error);
          }
        }
      }
    };

    // Subscribe to notifee foreground events
    const notifeeUnsubscribe = notifee.onForegroundEvent(handleNotifeeEvent);

    // Handle notification received while app is in foreground
    const notificationReceivedListener = notificationService.addNotificationReceivedListener(
      async (notification) => {
        console.log('📩 Notification received in foreground:', notification);

        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('💊 Medication reminder detected, navigating to alarm screen:', medicationData);

          // Navigate to medication alarm screen with medication data
          router.push({
            pathname: '/medication-alarm',
            params: {
              medicationName: medicationData.medicationName,
              dosage: medicationData.dosage,
              instructions: medicationData.instructions || '',
              reminderId: medicationData.reminderId,
              patientId: medicationData.patientId || '',
            }
          });
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
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

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
            const isOnline = await networkMonitor.isOnline();
            if (isOnline) {
              await localReminderService.confirmReminderLocally(reminderId);
            } else {
              await localReminderService.confirmReminderLocally(reminderId);
            }
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

        // User tapped on the notification body - navigate to alarm screen
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('ℹ️ Notification tapped by user, navigating to alarm screen:', medicationData);

          router.push({
            pathname: '/medication-alarm',
            params: {
              medicationName: medicationData.medicationName,
              dosage: medicationData.dosage,
              instructions: medicationData.instructions || '',
              reminderId: medicationData.reminderId,
              patientId: medicationData.patientId || '',
            }
          });
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
          const isOnline = await networkMonitor.isOnline();
          if (isOnline) {
            await localReminderService.confirmReminderLocally(reminderId);
          } else {
            await localReminderService.confirmReminderLocally(reminderId);
          }
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

    return () => {
      console.log('🧹 Cleaning up notification listeners');
      notificationReceivedListener.remove();
      notificationResponseListener.remove();
      appStateSubscription.remove();
      linkingSubscription.remove();
      notifeeUnsubscribe();
      notificationService.cleanup();
    };
  }, [router]);

  return (
    <View 
      style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}
      key={`app-${currentLanguage}-${isRTL}`} // Force re-render when RTL changes
    >
      <Stack screenOptions={{ animation: 'none' }}>
        {/* Auth Routes */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="verify-code" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />

        {/* Doctor & Tutor Routes (unified) */}
        <Stack.Screen name="doctor-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-profile" options={{ headerShown: false }} />

        {/* Patient Routes */}
        <Stack.Screen name="patient-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="patient-profile-settings" options={{ headerShown: false }} />
        <Stack.Screen name="patient-edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="patient-adherence-history" options={{ headerShown: false }} />

        {/* Shared Routes */}
        <Stack.Screen name="add-patient" options={{ headerShown: false }} />
        <Stack.Screen name="patient-profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />

        {/* Alarm Screen - Full screen, no gestures */}
        <Stack.Screen
          name="medication-alarm"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>

      <StatusBar style="dark" translucent={false} backgroundColor="#FFFFFF" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </LanguageProvider>
  );
}