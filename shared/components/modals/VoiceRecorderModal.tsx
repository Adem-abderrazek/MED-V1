import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { 
  useAudioRecorder, 
  useAudioPlayer, 
  RecordingPresets, 
  setAudioModeAsync, 
  requestRecordingPermissionsAsync 
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

interface VoiceRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (audioUri: string, duration: number, title: string) => Promise<void>;
  colors?: {
    primary: string;
    primaryLight: string;
    gradient: string[];
    background: string[];
    text: string;
    textSecondary: string;
  };
}

export default function VoiceRecorderModal({
  visible,
  onClose,
  onSave,
  colors,
}: VoiceRecorderModalProps) {
  // Default colors (doctor theme) if not provided
  const themeColors = colors || {
    primary: '#4facfe',
    primaryLight: '#00f2fe',
    gradient: ['#4facfe', '#00f2fe'],
    background: ['#1a1a2e', '#16213e', '#0f3460'],
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
  };
  const [recordingDuration, setRecordingDuration] = useState(0);
  const actualDurationRef = useRef(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio recorder and player
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);

  // Listen to player status changes - only update when audio finishes naturally
  useEffect(() => {
    if (!player || !recordingUri || !isPlaying) {
      return;
    }

    // Check if audio has finished playing naturally
    const checkStatus = () => {
      try {
        const status = player.getStatus();
        // Only update if audio finished naturally (not paused manually)
        if (!status.isPlaying && !status.isPaused) {
          setIsPlaying(false);
        }
      } catch (err) {
        // Ignore errors
      }
    };

    // Check less frequently, only to catch when audio finishes naturally
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, [player, recordingUri, isPlaying]);

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount (recorder and player are auto-cleaned by hooks)
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Reset state
      setRecordingDuration(0);
      setRecordingUri(null);

      // Start recording
      await recorder.prepareToRecordAsync();
      recorder.record();

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          actualDurationRef.current = newDuration;
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording
      await recorder.stop();
      
      // Get the URI from the recorder
      const uri = recorder.uri;
      console.log('📊 Recording URI:', uri);
      
      // Get the current status to capture actual recording duration
      const status = recorder.getStatus();
      console.log('📊 Recording status:', status);
      
      // Update duration from actual recording if available
      if (status.durationMillis) {
        const actualDuration = Math.floor(status.durationMillis / 1000);
        console.log('⏱️ Actual recording duration:', actualDuration, 'seconds');
        setRecordingDuration(actualDuration);
        actualDurationRef.current = actualDuration;
      } else {
        // Use the timer duration if status doesn't have it
        console.log('⏱️ Using timer duration:', actualDurationRef.current, 'seconds');
      }
      
      if (uri) {
        // Save to persistent location
        const dir = `${FileSystem.documentDirectory}voice-messages`;
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        const savedPath = `${dir}/recording_${Date.now()}.m4a`;
        await FileSystem.copyAsync({ from: uri, to: savedPath });
        
        console.log('✅ Recording saved to:', savedPath, 'Duration:', recordingDuration, 'seconds');
        setRecordingUri(savedPath);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      // If currently playing, pause it
      if (isPlaying) {
        await player.pause();
        setIsPlaying(false);
        return;
      }

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      // Replace source if needed and play
      player.replace({ uri: recordingUri });
      await player.play();
      
      // Set playing state immediately - don't wait for status check
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to play recording:', err);
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    // Stop playback if playing
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    setRecordingUri(null);
    // Reset duration after delete
    setRecordingDuration(0);
  };

  const handleSave = async () => {
    if (!recordingUri) return;

    // Validate title (required field)
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError('Le titre est requis');
      return;
    }

    setTitleError('');

    // Use the ref value to ensure we have the most accurate duration
    const finalDuration = actualDurationRef.current || recordingDuration;
    console.log('📝 Saving voice message with duration:', finalDuration, 'seconds (ref:', actualDurationRef.current, 'state:', recordingDuration, ')');
    console.log('📝 Title value:', trimmedTitle);
    
    setIsSaving(true);
    try {
      await onSave(recordingUri, finalDuration, trimmedTitle);
      handleClose();
    } catch (error) {
      console.error('Error saving voice message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    // Stop recording if active
    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch (err) {
        console.log('Recording cleanup error:', err);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Stop playback if active
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    
    setRecordingUri(null);
    setRecordingDuration(0);
    actualDurationRef.current = 0;
    setTitle('');
    setIsPlaying(false);
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={themeColors.background}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Message Vocal</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Recording Status */}
            <View style={styles.recordingContainer}>
              <View style={styles.waveformContainer}>
                {recorder.isRecording && (
                  <View style={styles.waveform}>
                    {[...Array(20)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            height: Math.random() * 40 + 10,
                            opacity: 0.3 + Math.random() * 0.7,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
                {!recorder.isRecording && !recordingUri && (
                  <Ionicons name="mic-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                )}
                {recordingUri && !recorder.isRecording && (
                  <Ionicons name="musical-notes" size={64} color={themeColors.primary} />
                )}
              </View>

              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
              
              {recorder.isRecording && (
                <Text style={styles.recordingText}>Enregistrement en cours...</Text>
              )}
              {recordingUri && (
                <Text style={styles.recordingText}>Enregistrement terminé</Text>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {!recordingUri && (
                <TouchableOpacity
                  style={[styles.recordButton, recorder.isRecording && styles.recordingButton]}
                  onPress={recorder.isRecording ? stopRecording : startRecording}
                >
                  <LinearGradient
                    colors={recorder.isRecording ? ['#EF4444', '#DC2626'] : themeColors.gradient}
                    style={styles.recordButtonGradient}
                  >
                    <Ionicons
                      name={recorder.isRecording ? 'stop' : 'mic'}
                      size={32}
                      color="white"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {recordingUri && (
                <View style={styles.playbackControls}>
                  <TouchableOpacity style={styles.controlButton} onPress={playRecording}>
                    <Ionicons
                      name={isPlaying ? 'pause-circle' : 'play-circle'}
                      size={40}
                      color={themeColors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.controlButton} onPress={deleteRecording}>
                    <Ionicons name="trash-outline" size={32} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Title Input */}
            {recordingUri && (
              <View style={styles.titleInputContainer}>
                <Text style={styles.titleLabel}>
                  Titre du message <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.titleInput,
                    titleError && { borderColor: '#EF4444' },
                  ]}
                  placeholder="Ex: Rappel du matin, Prendre avec de l'eau..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    if (titleError) setTitleError('');
                  }}
                  maxLength={100}
                />
                {titleError && (
                  <Text style={styles.errorText}>{titleError}</Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            {recordingUri && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.saveButtonGradient}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSaving ? 'Envoi...' : 'Envoyer'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  waveformContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 80,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#4facfe', // Will be overridden by inline style if needed
    borderRadius: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  duration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  recordingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  recordingButton: {
    transform: [{ scale: 1.1 }],
  },
  recordButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackControls: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  titleInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

