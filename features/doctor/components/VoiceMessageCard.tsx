import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime } from '../../../shared/utils/formatting/timeFormatting';
import { VoiceMessage } from '../hooks/usePatientProfile';

interface VoiceMessageCardProps {
  message: VoiceMessage;
  isPlaying: boolean;
  onPlay: (messageId: string, fileUrl: string) => void;
  onDelete: (messageId: string) => void;
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
    cardBg: string[];
  };
}

export default function VoiceMessageCard({
  message,
  isPlaying,
  onPlay,
  onDelete,
  colors,
}: VoiceMessageCardProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.voiceMessageCard}>
      <LinearGradient
        colors={colors.cardBg}
        style={styles.voiceMessageGradient}
      >
        <View style={styles.voiceMessageHeader}>
          <View style={[styles.voiceMessageIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="musical-notes" size={24} color={colors.primary} />
          </View>
          <View style={styles.voiceMessageInfo}>
            {message.title && (
              <Text style={[styles.voiceMessageTitle, { color: colors.text }]}>
                {message.title}
              </Text>
            )}
            <Text style={[styles.voiceMessageDate, { color: colors.textSecondary }]}>
              {formatDateTime(message.createdAt)}
            </Text>
            <Text style={[styles.voiceMessageDuration, { color: colors.textSecondary }]}>
              Durée: {message.durationSeconds ? formatDuration(message.durationSeconds) : '0:00'}
            </Text>
          </View>
        </View>

        <View style={styles.voiceMessageActions}>
          <TouchableOpacity
            style={styles.voiceActionButton}
            onPress={() => onPlay(message.id, message.fileUrl)}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={40}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voiceActionButton, styles.deleteVoiceButton]}
            onPress={() => onDelete(message.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  voiceMessageCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  voiceMessageGradient: {
    padding: 16,
  },
  voiceMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceMessageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceMessageInfo: {
    flex: 1,
  },
  voiceMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  voiceMessageDate: {
    fontSize: 13,
    marginBottom: 4,
  },
  voiceMessageDuration: {
    fontSize: 12,
  },
  voiceMessageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  voiceActionButton: {
    padding: 8,
  },
  deleteVoiceButton: {
    padding: 8,
  },
});

