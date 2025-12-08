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
  onSave: (audioUri: string, duration: number, title?: string) => Promise<void>;
}

export default function VoiceRecorderModal({
  visible,
  onClose,
  onSave,
}: VoiceRecorderModalProps) {
  const [recordingDuration, setRecordingDuration] = useState(0);
  const actualDurationRef = useRef(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio recorder and player
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : null);

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount (recorder and player are auto-cleaned by hooks)
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Stop timer when recording stops
  useEffect(() => {
    if (!recorder.isRecording && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recorder.isRecording]);

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

      // Clear any existing timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Start recording
      await recorder.prepareToRecordAsync();
      recorder.record();

      // Start timer only if recording actually started
      // Use a small delay to ensure recorder.isRecording is updated
      setTimeout(() => {
        if (recorder.isRecording && !timerRef.current) {
          timerRef.current = setInterval(() => {
            // Double-check recording is still active
            if (recorder.isRecording) {
              setRecordingDuration((prev) => {
                const newDuration = prev + 1;
                actualDurationRef.current = newDuration;
                return newDuration;
              });
            } else {
              // Stop timer if recording stopped unexpectedly
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
            }
          }, 1000);
        }
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) {
      // Ensure timer is stopped even if recording already stopped
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    try {
      // Clear timer FIRST before stopping recording
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording
      await recorder.stop();
      
      // Ensure timer is stopped after stopping recording (double-check)
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
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
    if (!recordingUri) {
      console.log('⚠️ No recording URI to play');
      return;
    }

    try {
      // If currently playing, pause it
      if (player.playing) {
        console.log('⏸️ Pausing current playback');
        player.pause();
        // Icon will update via player.playing state
        return;
      }

      console.log('▶️ Starting playback of recording:', recordingUri);
      
      // CRITICAL: Set audio mode for playback (not recording)
      // This ensures audio plays through speakers/headphones
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      
      console.log('✅ Audio mode set for playback');

      // Replace source if needed and play
      // Note: player.playing will update automatically, causing icon to change
      player.replace({ uri: recordingUri });
      await player.play();
      console.log('✅ Playback started');
    } catch (err) {
      console.error('❌ Failed to play recording:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      });
    }
  };

  const deleteRecording = () => {
    // Stop playback if playing
    if (player.playing) {
      player.pause();
    }
    setRecordingUri(null);
    // Reset duration after delete
    setRecordingDuration(0);
  };

  const handleSave = async () => {
    if (!recordingUri) return;

    // Use the ref value to ensure we have the most accurate duration
    const finalDuration = actualDurationRef.current || recordingDuration;
    const finalTitle = title.trim() || undefined;
    console.log('📝 Saving voice message with duration:', finalDuration, 'seconds (ref:', actualDurationRef.current, 'state:', recordingDuration, ')');
    console.log('📝 Title value:', title);
    console.log('📝 Final title (trimmed):', finalTitle);
    
    setIsSaving(true);
    try {
      await onSave(recordingUri, finalDuration, finalTitle);
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
    if (player.playing) {
      player.pause();
    }
    
    setRecordingUri(null);
    setRecordingDuration(0);
    actualDurationRef.current = 0;
    setTitle('');
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
            colors={['#1a1a2e', '#16213e', '#0f3460']}
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
                  <Ionicons name="musical-notes" size={64} color="#4facfe" />
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
                    colors={recorder.isRecording ? ['#EF4444', '#DC2626'] : ['#4facfe', '#00f2fe']}
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
                      name={player.playing ? 'pause-circle' : 'play-circle'}
                      size={32}
                      color="#4facfe"
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
                <Text style={styles.titleLabel}>Titre du message (optionnel)</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Ex: Rappel du matin, Prendre avec de l'eau..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                />
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
    backgroundColor: '#4facfe',
    borderRadius: 2,
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

