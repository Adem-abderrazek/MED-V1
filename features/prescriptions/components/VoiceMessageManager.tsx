import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { VoiceMessage } from '../../../shared/types';

interface VoiceMessageManagerProps {
  voiceMessages: VoiceMessage[];
  selectedVoiceMessageId: string | null;
  onVoiceMessageSelect: (voiceId: string | null) => void;
  onRecordNew: () => void;
  isUploading: boolean;
}

export default function VoiceMessageManager({
  voiceMessages,
  selectedVoiceMessageId,
  onVoiceMessageSelect,
  onRecordNew,
  isUploading,
}: VoiceMessageManagerProps) {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);

  const togglePlayVoice = async (voice: VoiceMessage) => {
    try {
      if (playingVoiceId === voice.id) {
        await currentSound?.pauseAsync();
        setPlayingVoiceId(null);
      } else {
        if (currentSound) {
          await currentSound.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: voice.fileUrl },
          { shouldPlay: true }
        );
        setCurrentSound(sound);
        setPlayingVoiceId(voice.id);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingVoiceId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing voice:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentSound]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="mic" size={20} color="#4facfe" />
        <Text style={styles.sectionTitle}>MESSAGE VOCAL (Optionnel)</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Choisissez un message vocal specifique pour ce medicament
      </Text>

      <View style={styles.voiceOptionsContainer}>
        <TouchableOpacity
          style={[
            styles.voiceOption,
            selectedVoiceMessageId === null && styles.voiceOptionSelected,
          ]}
          onPress={() => onVoiceMessageSelect(null)}
        >
          <View style={styles.voiceOptionContent}>
            <Ionicons
              name={selectedVoiceMessageId === null ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedVoiceMessageId === null ? '#4facfe' : 'rgba(255, 255, 255, 0.6)'}
            />
            <Text style={styles.voiceOptionText}>Aucun message vocal</Text>
          </View>
        </TouchableOpacity>

        {voiceMessages.map((voice) => (
          <View
            key={voice.id}
            style={[
              styles.voiceOption,
              selectedVoiceMessageId === voice.id && styles.voiceOptionSelected,
            ]}
          >
            <TouchableOpacity
              style={styles.voiceOptionSelector}
              onPress={() => onVoiceMessageSelect(voice.id)}
            >
              <Ionicons
                name={selectedVoiceMessageId === voice.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedVoiceMessageId === voice.id ? '#4facfe' : 'rgba(255, 255, 255, 0.6)'}
              />
              <Text style={styles.voiceOptionText}>{voice.title || voice.fileName}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voicePlayButton}
              onPress={() => togglePlayVoice(voice)}
            >
              <Ionicons
                name={playingVoiceId === voice.id ? 'pause-circle' : 'play-circle'}
                size={32}
                color="#4facfe"
              />
            </TouchableOpacity>
          </View>
        ))}

        {voiceMessages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun message vocal enregistre</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addNewVoiceButton}
          onPress={onRecordNew}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#4facfe" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#4facfe" />
              <Text style={styles.addNewVoiceText}>Enregistrer un nouveau message</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  voiceOptionsContainer: {
    gap: 12,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  voiceOptionSelected: {
    borderColor: '#4facfe',
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  voiceOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceOptionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceOptionText: {
    fontSize: 14,
    color: 'white',
  },
  voicePlayButton: {
    padding: 4,
  },
  addNewVoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    borderRadius: 12,
  },
  addNewVoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
  },
  emptyState: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyStateText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
