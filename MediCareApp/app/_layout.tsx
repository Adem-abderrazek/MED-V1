import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { notificationService } from '../services/notificationService';
import { networkMonitor } from '../services/networkMonitor';
import localReminderService from '../services/localReminderService';

export default function RootLayout() {
  useEffect(() => {
    console.log('🚀 Initializing notification and network systems...');

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

    // Handle notification received while app is in foreground
    const notificationReceivedListener = notificationService.addNotificationReceivedListener(
      async (notification) => {
        console.log('📩 Notification received in foreground:', notification);

        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('💊 Medication reminder detected:', medicationData);
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

        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('ℹ️ Notification tapped by user:', medicationData);
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
      notificationService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
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
      </Stack>

      <StatusBar style="dark" translucent={false} backgroundColor="#FFFFFF" />
    </SafeAreaProvider>
  );
}