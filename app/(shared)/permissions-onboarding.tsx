import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AppState,
  AppStateStatus,
  Platform,
  BackHandler,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { alarmService } from '../../shared/services/alarmService';
import { notificationService } from '../../shared/services/notificationService';
import { registerPushToken } from '../../shared/services/api/auth';
import { networkMonitor } from '../../shared/services/networkMonitor';
import { getPermissionStatus, requestNotificationPermission } from '../../shared/services/permissionService';
import { getThemeColors } from '../../config/theme';

type PermissionKey = 'notifications' | 'exactAlarms' | 'overlays' | 'batteryOptimizations';

const PERMISSIONS_ONBOARDING_COMPLETED = '@permissions_onboarding_completed';

export default function PermissionsOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState({
    notifications: false,
    exactAlarms: true,
    overlays: true,
    batteryOptimizations: true,
    allGranted: false,
  });
  const [isChecking, setIsChecking] = useState(true);
  const [requesting, setRequesting] = useState<PermissionKey | null>(null);
  const [userType, setUserType] = useState<'patient' | 'medecin' | 'tuteur' | null>(null);

  const theme = getThemeColors(userType);

  useEffect(() => {
    const loadUserType = async () => {
      const stored = await AsyncStorage.getItem('userData');
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        setUserType(parsed?.userType ?? null);
      } catch {
        setUserType(null);
      }
    };
    loadUserType();
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsChecking(true);
    const result = await getPermissionStatus();
    setStatus(result);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [refreshStatus]);

  const registerPushTokenIfPossible = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const online = await networkMonitor.isOnline();
      if (!online) return;

      const pushToken = await notificationService.initialize();
      if (pushToken) {
        await registerPushToken(token, pushToken);
      }
    } catch (error) {
      console.error('Error registering push token after permissions granted:', error);
    }
  }, []);

  const handleRequestNotifications = useCallback(async () => {
    setRequesting('notifications');
    const granted = await requestNotificationPermission();
    if (granted) {
      await registerPushTokenIfPossible();
    } else {
      Linking.openSettings().catch(() => {});
    }
    await refreshStatus();
    setRequesting(null);
  }, [refreshStatus, registerPushTokenIfPossible]);

  const handleOpenExactAlarmSettings = useCallback(async () => {
    setRequesting('exactAlarms');
    await alarmService.openExactAlarmSettings();
    await refreshStatus();
    setRequesting(null);
  }, [refreshStatus]);

  const handleOpenOverlaySettings = useCallback(async () => {
    setRequesting('overlays');
    await alarmService.openOverlaySettings();
    await refreshStatus();
    setRequesting(null);
  }, [refreshStatus]);

  const handleRequestBatteryOptimization = useCallback(async () => {
    setRequesting('batteryOptimizations');
    await alarmService.requestIgnoreBatteryOptimizations();
    await refreshStatus();
    setRequesting(null);
  }, [refreshStatus]);

  const handleContinue = useCallback(async () => {
    if (!status.allGranted) return;
    await AsyncStorage.setItem(PERMISSIONS_ONBOARDING_COMPLETED, 'true');

    const stored = await AsyncStorage.getItem('userData');
    let target = '/(patient)/dashboard';
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user?.userType === 'medecin' || user?.userType === 'tuteur') {
          target = '/(doctor)/dashboard';
        }
      } catch {
        target = '/(patient)/dashboard';
      }
    }

    router.replace(target as any);
  }, [router, status.allGranted]);

  const cards = useMemo(() => {
    const list: Array<{
      key: PermissionKey;
      icon: keyof typeof Ionicons.glyphMap;
      title: string;
      description: string;
      actionLabel: string;
      onPress: () => void;
      visible: boolean;
    }> = [
      {
        key: 'notifications',
        icon: 'notifications',
        title: t('permissions.notifications.title'),
        description: t('permissions.notifications.description'),
        actionLabel: t('permissions.actionEnable'),
        onPress: handleRequestNotifications,
        visible: true,
      },
      {
        key: 'exactAlarms',
        icon: 'alarm',
        title: t('permissions.exactAlarms.title'),
        description: t('permissions.exactAlarms.description'),
        actionLabel: t('permissions.actionOpenSettings'),
        onPress: handleOpenExactAlarmSettings,
        visible: Platform.OS === 'android',
      },
      {
        key: 'overlays',
        icon: 'albums',
        title: t('permissions.overlays.title'),
        description: t('permissions.overlays.description'),
        actionLabel: t('permissions.actionOpenSettings'),
        onPress: handleOpenOverlaySettings,
        visible: Platform.OS === 'android',
      },
      {
        key: 'batteryOptimizations',
        icon: 'battery-half',
        title: t('permissions.battery.title'),
        description: t('permissions.battery.description'),
        actionLabel: t('permissions.actionOpenSettings'),
        onPress: handleRequestBatteryOptimization,
        visible: Platform.OS === 'android',
      },
    ];

    return list.filter(item => item.visible);
  }, [
    handleOpenExactAlarmSettings,
    handleOpenOverlaySettings,
    handleRequestBatteryOptimization,
    handleRequestNotifications,
    t,
  ]);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('permissions.title')}</Text>
            <Text style={styles.subtitle}>{t('permissions.subtitle')}</Text>
          </View>

          <View style={styles.cardsContainer}>
            {cards.map(item => {
              const granted = status[item.key];
              const isBusy = requesting === item.key;
              return (
                <View key={item.key} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Ionicons name={item.icon} size={20} color={theme.primaryLight} />
                    </View>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {granted ? t('permissions.statusGranted') : t('permissions.statusRequired')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.primary },
                      granted ? styles.actionButtonDisabled : null,
                    ]}
                    onPress={item.onPress}
                    disabled={granted || isBusy}
                  >
                    <Text style={styles.actionButtonText}>
                      {granted ? t('permissions.statusGranted') : item.actionLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: theme.primaryDark },
                !status.allGranted ? styles.continueButtonDisabled : null,
              ]}
              onPress={handleContinue}
              disabled={!status.allGranted}
            >
              <Text style={styles.continueButtonText}>
                {isChecking ? t('permissions.checking') : t('permissions.continue')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.footerNote}>
              {status.allGranted ? t('permissions.allSet') : t('permissions.footerNote')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  actionButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#10B981',
  },
  actionButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
    gap: 12,
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#0EA5E9',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
