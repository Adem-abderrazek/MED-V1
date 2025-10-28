import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MedicationNotificationData } from '../services/notificationService';
import voicePlayerService from '../services/voicePlayerService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  success: ['#10B981', '#059669'],
  info: ['#3B82F6', '#2563EB'],
  background: '#1a1a2e',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
};

interface MedicationReminderModalProps {
  visible: boolean;
  data: MedicationNotificationData | null;
  onConfirm: (reminderIds: string[]) => Promise<void>;
  onSnooze: (reminderIds: string[]) => Promise<void>;
  onClose: () => void;
  localVoicePath?: string | null;
}

export default function MedicationReminderModal({
  visible,
  data,
  onConfirm,
  onSnooze,
  onClose,
  localVoicePath,
}: MedicationReminderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'confirm' | 'snooze' | null>(null);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  
  // Pulsing animation for voice indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start repeating voice when modal opens
  useEffect(() => {
    if (visible && localVoicePath) {
      console.log('🎵 Modal opened, starting repeating voice:', localVoicePath);
      setHasVoice(true);
      playVoiceOnRepeat();
    } else if (!visible) {
      // Modal is closing - stop voice immediately
      console.log('🛑 Modal closing, stopping voice');
      voicePlayerService.stopRepeatingVoice();
      setIsVoicePlaying(false);
    }
    
    // Cleanup when component unmounts
    return () => {
      console.log('🧹 Component unmounting, stopping voice');
      voicePlayerService.stopRepeatingVoice();
    };
  }, [visible, localVoicePath]);

  // Pulsing animation effect
  useEffect(() => {
    if (isVoicePlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isVoicePlaying]);

  const playVoiceOnRepeat = async () => {
    if (!localVoicePath) return;
    
    try {
      const success = await voicePlayerService.playLocalVoiceFileOnRepeat(localVoicePath);
      setIsVoicePlaying(success);
      if (success) {
        console.log('✅ Repeating voice started successfully');
      }
    } catch (error) {
      console.error('❌ Error starting repeating voice:', error);
      setIsVoicePlaying(false);
    }
  };

  const stopVoice = async () => {
    try {
      await voicePlayerService.stopRepeatingVoice();
      setIsVoicePlaying(false);
      console.log('✅ Voice stopped');
    } catch (error) {
      console.error('❌ Error stopping voice:', error);
    }
  };

  const toggleVoice = async () => {
    if (isVoicePlaying) {
      await stopVoice();
    } else {
      await playVoiceOnRepeat();
    }
  };

  if (!data) return null;

  const isSingleMedication = !data.medications || data.medications.length === 0;
  const reminderIds = isSingleMedication
    ? [data.reminderId]
    : data.reminderId.split(',');

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setActionType('confirm');
      
      console.log('✅ Confirming medication(s):', reminderIds);
      
      await onConfirm(reminderIds);
      onClose(); // Closing will trigger cleanup to stop voice
    } catch (error) {
      console.error('Error confirming medication:', error);
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const handleSnooze = async () => {
    try {
      setIsLoading(true);
      setActionType('snooze');
      
      console.log('⏰ Snoozing medication(s):', reminderIds);
      
      await onSnooze(reminderIds);
      onClose(); // Closing will trigger cleanup to stop voice
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const formatTime = (isoString: string) => {
    // Backend stores time in UTC, we need to display local time correctly
    const date = new Date(isoString);
    
    // Use toLocaleTimeString to get proper local time formatting
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="medical" size={32} color="white" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>💊 Rappel de Médicament</Text>
                <Text style={styles.headerTime}>
                  {formatTime(data.reminderTime)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Voice Controls - PROMINENT ALARM-LIKE UI */}
          {hasVoice && (
            <View style={styles.voiceControlSection}>
              <Animated.View
                style={[
                  styles.voiceIndicator,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: isVoicePlaying ? 1 : 0.5,
                  },
                ]}
              >
                <Ionicons
                  name={isVoicePlaying ? 'volume-high' : 'volume-mute'}
                  size={32}
                  color={isVoicePlaying ? COLORS.primary : COLORS.textTertiary}
                />
              </Animated.View>
              
              <View style={styles.voiceInfo}>
                <Text style={styles.voiceLabel}>
                  {isVoicePlaying ? '🔊 Message vocal en cours...' : '🔇 Message vocal en pause'}
                </Text>
                <Text style={styles.voiceSubtext}>
                  {isVoicePlaying ? 'Lecture en boucle' : 'Appuyez pour écouter'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.voiceToggleButton}
                onPress={toggleVoice}
              >
                <LinearGradient
                  colors={isVoicePlaying ? ['#EF4444', '#DC2626'] : [COLORS.primary, COLORS.primaryLight]}
                  style={styles.voiceToggleGradient}
                >
                  <Ionicons
                    name={isVoicePlaying ? 'stop' : 'play'}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.voiceToggleText}>
                    {isVoicePlaying ? 'Arrêter' : 'Écouter'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isSingleMedication ? (
              // Single Medication
              <View style={styles.medicationCard}>
                {data.imageUrl && (
                  <Image
                    source={{ uri: data.imageUrl }}
                    style={styles.medicationImage}
                    resizeMode="contain"
                  />
                )}
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{data.medicationName}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="flask" size={16} color={COLORS.primary} />
                    <Text style={styles.dosage}>{data.dosage}</Text>
                  </View>
                  {data.instructions && (
                    <View style={styles.instructionsContainer}>
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color={COLORS.info[0]}
                      />
                      <Text style={styles.instructions}>{data.instructions}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // Multiple Medications
              <>
                <Text style={styles.multipleHeader}>
                  Vous avez {data.medications!.length} médicaments à prendre :
                </Text>
                {data.medications!.map((med, index) => (
                  <View key={med.id} style={styles.medicationCard}>
                    <View style={styles.medicationNumber}>
                      <Text style={styles.medicationNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                      <View style={styles.infoRow}>
                        <Ionicons name="flask" size={16} color={COLORS.primary} />
                        <Text style={styles.dosage}>{med.dosage}</Text>
                      </View>
                      {med.instructions && (
                        <View style={styles.instructionsContainer}>
                          <Ionicons
                            name="information-circle"
                            size={16}
                            color={COLORS.info[0]}
                          />
                          <Text style={styles.instructions}>{med.instructions}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Important Notice */}
            <View style={styles.noticeContainer}>
              <Ionicons name="alert-circle" size={20} color={COLORS.info[0]} />
              <Text style={styles.noticeText}>
                Prenez vos médicaments selon les instructions de votre médecin
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              <LinearGradient
                colors={COLORS.success}
                style={styles.buttonGradient}
              >
                {isLoading && actionType === 'confirm' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.buttonText}>J'ai pris</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={handleSnooze}
              disabled={isLoading}
            >
              <LinearGradient
                colors={COLORS.info}
                style={styles.buttonGradient}
              >
                {isLoading && actionType === 'snooze' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="time" size={24} color="white" />
                    <Text style={styles.buttonText}>Rappel dans 10 min</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: COLORS.background,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  
  // Header Styles
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Content Styles
  content: {
    padding: 20,
    maxHeight: 400,
  },
  multipleHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  medicationCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  medicationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  medicationImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dosage: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  instructions: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  noticeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },

  // Action Buttons
  actions: {
    padding: 20,
    gap: 12,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  snoozeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.info[0],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },

  // Voice Control Styles
  voiceControlSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(16, 185, 129, 0.3)',
    padding: 16,
    gap: 12,
  },
  voiceIndicator: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  voiceSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  voiceToggleButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  voiceToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

