import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from 'react-i18next';

interface SyncBannerProps {
  hasUpdates: boolean;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onSyncPress: () => void;
  i18nLanguage: string;
}

export default function SyncBanner({
  hasUpdates,
  lastSyncTime,
  isSyncing,
  onSyncPress,
  i18nLanguage,
}: SyncBannerProps) {
  const { t } = useTranslation();

  if (hasUpdates) {
    return (
      <View style={styles.updateBanner}>
        <Ionicons name="alert-circle" size={20} color={COLORS.warning[0]} />
        <Text style={styles.updateBannerText}>
          {t('dashboard.patient.newUpdatesAvailable')}
        </Text>
        <TouchableOpacity 
          style={styles.updateBannerButton}
          onPress={onSyncPress}
          disabled={isSyncing}
        >
          <Text style={styles.updateBannerButtonText}>
            {isSyncing ? t('dashboard.patient.syncing') : t('dashboard.patient.sync')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (lastSyncTime) {
    return (
      <View style={styles.syncInfoBanner}>
        <Ionicons name="checkmark-circle" size={16} color={COLORS.success[0]} />
        <Text style={styles.syncInfoText}>
          {t('dashboard.patient.lastSync')}: {new Date(lastSyncTime).toLocaleString(
            i18nLanguage === 'ar' ? 'ar-TN' : i18nLanguage === 'fr' ? 'fr-FR' : 'en-US',
            {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Tunis',
              numberingSystem: 'latn'
            }
          )}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  updateBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  updateBannerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warning[0],
    fontWeight: '600',
    marginLeft: I18nManager.isRTL ? 0 : 8,
    marginRight: I18nManager.isRTL ? 8 : 0,
  },
  updateBannerButton: {
    backgroundColor: COLORS.warning[0],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateBannerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  syncInfoBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', // Reverse for RTL
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncInfoText: {
    fontSize: 12,
    color: COLORS.success[0],
    marginLeft: I18nManager.isRTL ? 0 : 6,
    marginRight: I18nManager.isRTL ? 6 : 0,
    textAlign: 'left', // Keep sync info LTR
    writingDirection: 'ltr', // Force LTR for dates/times in sync info
  },
});


