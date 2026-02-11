import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ALARM_CONSTANTS } from '../../shared/constants/alarm';
import { useMedicationAlarm } from '../../features/patient/hooks/useMedicationAlarm';

export default function MedicationAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const reminderId = typeof params.reminderId === 'string' ? params.reminderId : '';
  const audioParam = typeof params.audioPath === 'string' ? params.audioPath : '';
  const nameParam = typeof params.medicationName === 'string' ? params.medicationName : '';
  const dosageParam = typeof params.dosage === 'string' ? params.dosage : '';

  const audioPath = audioParam ? decodeURIComponent(audioParam) : undefined;
  const medicationName = nameParam ? decodeURIComponent(nameParam) : 'Medication';
  const dosage = dosageParam ? decodeURIComponent(dosageParam) : '';
  const hasVoiceMessage = Boolean(audioPath);

  const { currentTime, isProcessing, handleConfirm, handleSnooze } = useMedicationAlarm({
    reminderId,
    audioPath,
  });

  const timeLabel = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!reminderId) {
    return (
      <LinearGradient colors={ALARM_CONSTANTS.GRADIENT_COLORS} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={styles.title}>Medication reminder</Text>
            <Text style={styles.subtitle}>Missing reminder details.</Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: ALARM_CONSTANTS.PRIMARY_COLOR }]}
              onPress={() => router.replace('/(patient)/dashboard' as any)}
            >
              <Text style={styles.primaryButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={ALARM_CONSTANTS.GRADIENT_COLORS} style={styles.container}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="alarm" size={16} color="#FFFFFF" />
            <Text style={styles.badgeText}>Alarm</Text>
          </View>
          <Text style={styles.title}>Medication reminder</Text>
          <Text style={styles.time}>{timeLabel}</Text>
          <Text style={styles.subtitle}>Tap an action to stop the alert.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="medical" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.medicationName}>{medicationName}</Text>
            {dosage ? <Text style={styles.dosage}>{dosage}</Text> : null}
            <View style={styles.metaRow}>
              <Ionicons
                name={hasVoiceMessage ? 'volume-high' : 'volume-mute'}
                size={16}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.metaText}>
                {hasVoiceMessage ? 'Voice message playing' : 'No voice message'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Taken</Text>
              <Text style={styles.actionSubtitle}>Stop alarm and confirm</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={handleSnooze}
            disabled={isProcessing}
          >
            <Ionicons name="moon" size={20} color="#1f2937" />
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitleDark}>Snooze</Text>
              <Text style={styles.actionSubtitleDark}>Remind me in 5 minutes</Text>
            </View>
          </TouchableOpacity>
        </View>
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
    padding: 24,
  },
  orbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(79, 172, 254, 0.22)',
    top: -80,
    left: -40,
  },
  orbBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 200, 83, 0.16)',
    bottom: -120,
    right: -60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  time: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    marginTop: 32,
    padding: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dosage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  metaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  actions: {
    marginTop: 40,
    gap: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryAction: {
    backgroundColor: ALARM_CONSTANTS.CONFIRM_COLOR,
  },
  secondaryAction: {
    backgroundColor: '#F9EFD7',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  actionTitleDark: {
    color: '#1f2937',
    fontSize: 17,
    fontWeight: '700',
  },
  actionSubtitleDark: {
    color: '#4b5563',
    fontSize: 12,
    marginTop: 2,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
