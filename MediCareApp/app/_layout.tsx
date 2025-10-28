import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { notificationService, MedicationNotificationData } from '../services/notificationService';
import * as Notifications from 'expo-notifications';
import { networkMonitor } from '../services/networkMonitor';
import localReminderService from '../services/localReminderService';
import MedicationReminderModal from '../components/MedicationReminderModal';

// Create a context for medication reminders
interface NotificationContextType {
  currentReminder: MedicationNotificationData | null;
  setCurrentReminder: (data: MedicationNotificationData | null) => void;
  showReminderModal: boolean;
  setShowReminderModal: (show: boolean) => void;
  localVoicePath: string | null;
  setLocalVoicePath: (path: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  currentReminder: null,
  setCurrentReminder: () => {},
  showReminderModal: false,
  setShowReminderModal: () => {},
  localVoicePath: null,
  setLocalVoicePath: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export default function RootLayout() {
  const [currentReminder, setCurrentReminder] = useState<MedicationNotificationData | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [localVoicePath, setLocalVoicePath] = useState<string | null>(null);

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
        // Handle Firebase initialization errors gracefully
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
          console.log('💊 Medication reminder received:', medicationData);
          
          // Extract voice path from notification data
          const voicePath = notification.request.content.data?.localVoicePath as string;
          console.log('🎤 Voice path from notification:', voicePath || 'none');
          
          // Store voice path in context for modal to use
          setLocalVoicePath(voicePath || null);
          setCurrentReminder(medicationData);
          setShowReminderModal(true);
          
          // Note: Voice playback is now handled by MedicationReminderModal on repeat
        }
      }
    );

    // Handle app state changes to detect when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('🚀 App is now active - checking for pending medication reminders');
        // Enhanced background notification check
        notificationService.handleBackgroundNotificationCheck().catch(err => {
          console.error('❌ Error in background notification check:', err);
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Initialize unified notification handler for automatic modal display
    notificationService.initUnifiedHandler({
      currentReminder,
      setCurrentReminder,
      showReminderModal,
      setShowReminderModal,
      localVoicePath,
      setLocalVoicePath,
    });

    // Handle notification tapped (user clicked on notification or action button)
    const notificationResponseListener = notificationService.addNotificationResponseReceivedListener(
      async (response) => {
        console.log('👆 Notification response:', response);
        console.log('   Action identifier:', response.actionIdentifier);

        const notification = response.notification;
        const actionIdentifier = response.actionIdentifier;
        const data = notification.request.content.data;
        const reminderId = data.reminderId as string;

        // Handle action buttons (confirm/snooze from lock screen)
        if (actionIdentifier === 'confirm') {
          console.log('✅ Quick confirm action from lock screen');
          try {
            const isOnline = await networkMonitor.isOnline();
            if (isOnline) {
              // TODO: Call API to confirm (needs token - will queue for now)
              await localReminderService.confirmReminderLocally(reminderId);
            } else {
              await localReminderService.confirmReminderLocally(reminderId);
            }
            console.log('✅ Reminder confirmed from lock screen');
          } catch (error) {
            console.error('❌ Error confirming from lock screen:', error);
          }
          return; // Don't open modal
        } else if (actionIdentifier === 'snooze') {
          console.log('⏰ Quick snooze action from lock screen');
          try {
            await localReminderService.snoozeReminderLocally(reminderId);
            console.log('✅ Reminder snoozed from lock screen');
          } catch (error) {
            console.error('❌ Error snoozing from lock screen:', error);
          }
          return; // Don't open modal
        }

        // User tapped notification itself (not action button) - open modal
        const medicationData = notificationService.parseMedicationNotification(notification);
        if (medicationData) {
          console.log('💊 Opening medication reminder modal:', medicationData);
          
          // Extract voice path from notification data (critical for background/killed state)
          const voicePath = data.localVoicePath as string;
          console.log('🎤 Voice path from notification:', voicePath || 'none');
          
          // Store voice path in context for modal to use
          setLocalVoicePath(voicePath || null);
          setCurrentReminder(medicationData);
          setShowReminderModal(true);
          
          // Note: Voice playback on repeat is now handled by MedicationReminderModal
        }
      }
    );

    // Handle AppState changes (app comes to foreground from background/killed)
    // This is handled by the background notification handler service

    // Handle deep links from native AlarmActivity (Android)
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 Deep link received:', event.url);
      
      // Parse URL like: medicare://alarm?action=confirm&reminderId=123
      const url = new URL(event.url);
      const action = url.searchParams.get('action');
      const reminderId = url.searchParams.get('reminderId');
      
      if (action && reminderId) {
        console.log(`🔔 Alarm action from native: ${action} for ${reminderId}`);
        
        if (action === 'confirm') {
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
      }
    };
    
    // Listen for deep links (for native alarm actions)
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL (if app opened via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Cleanup listeners on unmount
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
      <NotificationContext.Provider
        value={{
          currentReminder,
          setCurrentReminder,
          showReminderModal,
          setShowReminderModal,
          localVoicePath,
          setLocalVoicePath,
        }}
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
        </Stack>
        
        {/* Medication Reminder Modal */}
        <MedicationReminderModal
          visible={showReminderModal}
          data={currentReminder}
          localVoicePath={localVoicePath}
          onConfirm={async (reminderIds: string[]) => {
            console.log('✅ Medication confirmed:', reminderIds);
            if (currentReminder) {
              await localReminderService.confirmReminderLocally(currentReminder.reminderId);
            }
            setShowReminderModal(false);
            setCurrentReminder(null);
          }}
          onSnooze={async (reminderIds: string[]) => {
            console.log('⏰ Medication snoozed:', reminderIds);
            if (currentReminder) {
              await localReminderService.snoozeReminderLocally(currentReminder.reminderId);
            }
            setShowReminderModal(false);
            setCurrentReminder(null);
          }}
          onClose={() => {
            console.log('❌ Medication modal closed');
            setShowReminderModal(false);
            setCurrentReminder(null);
          }}
        />
        
        <StatusBar style="dark" translucent={false} backgroundColor="#FFFFFF" />
      </NotificationContext.Provider>
    </SafeAreaProvider>
  );
}