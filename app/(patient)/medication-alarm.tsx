import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  BackHandler,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMedicationAlarm } from '../../features/patient/hooks/useMedicationAlarm';
import { formatTime } from '../../shared/utils/formatting/timeFormatting';

// Patient theme colors
const PATIENT_COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  gradient: ['#10B981', '#34D399'],
  background: ['#1a1a2e', '#1B2E1F', '#1D3020'],
  cardBg: ['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.08)'],
  textSecondary: 'rgba(255, 255, 255, 0.8)',
};

export default function MedicationAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  
  const medicationName = params.medicationName || 'Médicament';
  const dosage = params.dosage || '';
  const instructions = params.instructions || '';
  const reminderId = params.reminderId || '';
  const audioPath = params.audioPath;

  const { currentTime, isProcessing, handleConfirm, handleSnooze } = useMedicationAlarm({
    reminderId,
    audioPath,
  });

  // Animated values for pulse rings
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Start pulse animations
  useEffect(() => {
    // Continuous pulse animation for ring 1
    const pulse1Anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous pulse animation for ring 2 (delayed)
    const pulse2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous pulse animation for ring 3 (more delayed)
    const pulse3Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(pulse3, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse3, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Icon breathing animation
    const iconBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow pulsing animation
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse1Anim.start();
    pulse2Anim.start();
    pulse3Anim.start();
    iconBreath.start();
    glowAnim.start();

    return () => {
      pulse1Anim.stop();
      pulse2Anim.stop();
      pulse3Anim.stop();
      iconBreath.stop();
      glowAnim.stop();
    };
  }, []);

  // Calculate animated styles for pulse rings
  const ring1Scale = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const ring1Opacity = pulse1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const ring2Scale = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const ring2Opacity = pulse2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.2, 0],
  });

  const ring3Scale = pulse3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const ring3Opacity = pulse3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.15, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient
        colors={PATIENT_COLORS.background}
        style={styles.gradient}
      >
        {/* Animated Pulse Rings Container */}
        <View style={styles.iconContainer}>
          {/* Outer pulse ring 3 */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRing3,
              {
                transform: [{ scale: ring3Scale }],
                opacity: ring3Opacity,
              },
            ]}
          />
          
          {/* Middle pulse ring 2 */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRing2,
              {
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          
          {/* Inner pulse ring 1 */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRing1,
              {
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          
          {/* Glow effect behind icon */}
          <Animated.View
            style={[
              styles.glowCircle,
              {
                opacity: glowOpacity,
              },
            ]}
          />
          
          {/* Main icon circle with gradient */}
          <Animated.View
            style={[
              styles.iconCircle,
              {
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <LinearGradient
              colors={PATIENT_COLORS.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="medical" size={64} color="white" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <View style={styles.timeIndicator}>
            <View style={styles.timeDot} />
            <Text style={styles.timeLabel}>Heure actuelle</Text>
          </View>
        </View>

        {/* Medication Card */}
        <View style={styles.medicationCard}>
          <LinearGradient
            colors={PATIENT_COLORS.cardBg}
            style={styles.medicationCardGradient}
          >
            <View style={styles.alarmLabelContainer}>
              <Ionicons name="notifications" size={20} color={PATIENT_COLORS.primary} />
              <Text style={styles.alarmLabel}>RAPPEL MÉDICAMENT</Text>
            </View>
            
            <View style={styles.medicationContent}>
              <Text style={styles.medicationName}>{medicationName}</Text>
              {dosage && (
                <View style={styles.dosageContainer}>
                  <Ionicons name="flask" size={18} color={PATIENT_COLORS.primaryLight} />
                  <Text style={styles.dosageText}>{dosage}</Text>
                </View>
              )}
              {instructions && (
                <View style={styles.instructionsContainer}>
                  <Ionicons name="information-circle" size={18} color={PATIENT_COLORS.textSecondary} />
                  <Text style={styles.instructionsText}>{instructions}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isProcessing}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[PATIENT_COLORS.primary, PATIENT_COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Ionicons name="checkmark-circle" size={28} color="white" />
              <Text style={styles.buttonText}>J'ai pris</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSnooze}
            disabled={isProcessing}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Ionicons name="time-outline" size={28} color="white" />
              <Text style={styles.buttonText}>Reporter 5 min</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Audio Indicator */}
        {audioPath && (
          <View style={styles.audioIndicator}>
            <LinearGradient
              colors={[`${PATIENT_COLORS.primary}40`, `${PATIENT_COLORS.primary}20`]}
              style={styles.audioGradient}
            >
              <Ionicons name="volume-high" size={20} color={PATIENT_COLORS.primary} />
              <Text style={styles.audioText}>Message du médecin en cours...</Text>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
  },
  pulseRing1: {
    borderColor: PATIENT_COLORS.primary,
    backgroundColor: `${PATIENT_COLORS.primary}20`,
  },
  pulseRing2: {
    borderColor: PATIENT_COLORS.primaryLight,
    backgroundColor: `${PATIENT_COLORS.primaryLight}15`,
  },
  pulseRing3: {
    borderColor: PATIENT_COLORS.primaryDark,
    backgroundColor: `${PATIENT_COLORS.primaryDark}10`,
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: PATIENT_COLORS.primary,
    shadowColor: PATIENT_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: PATIENT_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    zIndex: 10,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timeText: {
    fontSize: 52,
    fontWeight: '300',
    color: 'white',
    letterSpacing: 3,
    marginBottom: 8,
  },
  timeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PATIENT_COLORS.primary,
  },
  timeLabel: {
    fontSize: 12,
    color: PATIENT_COLORS.textSecondary,
    letterSpacing: 1,
  },
  medicationCard: {
    width: '100%',
    marginBottom: 40,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${PATIENT_COLORS.primary}40`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  medicationCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  alarmLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  alarmLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PATIENT_COLORS.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  medicationContent: {
    alignItems: 'center',
    width: '100%',
  },
  medicationName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: `${PATIENT_COLORS.primary}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  dosageText: {
    fontSize: 18,
    color: PATIENT_COLORS.primaryLight,
    fontWeight: '600',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  instructionsText: {
    fontSize: 15,
    color: PATIENT_COLORS.textSecondary,
    textAlign: 'center',
    flex: 1,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 24,
    gap: 16,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 10,
    minHeight: 64,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  audioIndicator: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${PATIENT_COLORS.primary}40`,
  },
  audioGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  audioText: {
    color: PATIENT_COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
