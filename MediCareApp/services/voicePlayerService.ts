import { Audio } from 'expo-av';
// TODO: Migrate to expo-audio when expo-av is removed in SDK 54
// import { AudioPlayer, useAudioPlayer } from 'expo-audio';

/**
 * Voice Player Service
 * Handles automatic playback of local voice files for medication reminders
 */
class VoicePlayerService {
  private currentSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isRepeating: boolean = false;

  /**
   * Play a local voice file on repeat/loop
   * @param localFilePath - Local file path to the voice recording
   */
  async playLocalVoiceFileOnRepeat(localFilePath: string): Promise<boolean> {
    try {
      console.log('🔁 Playing local voice file on REPEAT:', localFilePath);

      // Stop any currently playing sound
      await this.stopCurrentSound();

      // Configure audio mode for iOS playback with high priority
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true, // Play even when silent switch is on
          staysActiveInBackground: true,
          shouldDuckAndroid: false, // Don't duck - take full audio focus
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // DoNotMix mode
          interruptionModeAndroid: 1, // DoNotMix mode
        });
      } catch (audioModeError) {
        console.warn('⚠️ Failed to set audio mode, continuing anyway:', audioModeError);
      }

      // Small delay to ensure audio mode is set before playing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify file exists before attempting to play
      const fileUri = localFilePath.startsWith('file://') ? localFilePath : `file://${localFilePath}`;
      console.log('📂 Loading audio from URI (REPEAT MODE):', fileUri);

      // Check if file exists using FileSystem
      try {
        const FileSystem = require('expo-file-system/legacy');
        const fileInfo = await FileSystem.getInfoAsync(localFilePath);
        console.log('📁 File info:', JSON.stringify(fileInfo, null, 2));
        
        if (!fileInfo.exists) {
          throw new Error(`File does not exist: ${localFilePath}`);
        }
      } catch (fsError) {
        console.warn('⚠️ Could not verify file existence:', fsError);
      }

      // Create and load the sound with LOOPING enabled
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { 
          shouldPlay: true, 
          volume: 1.0,
          isLooping: true // ✅ ENABLE LOOPING
        },
        this.onPlaybackStatusUpdate
      );

      this.currentSound = sound;
      this.isPlaying = true;
      this.isRepeating = true;

      console.log('✅ Voice file playback started successfully (REPEAT MODE)');
      return true;
    } catch (error) {
      console.error('❌ Error playing voice file on repeat:', error);
      console.error('   File path:', localFilePath);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      this.isRepeating = false;
      return false;
    }
  }

  /**
   * Stop repeating voice playback
   */
  async stopRepeatingVoice(): Promise<void> {
    console.log('🛑 Stopping repeating voice playback');
    this.isRepeating = false;

    // Force immediate stop with multiple attempts
    try {
      await this.stopCurrentSound();
    } catch (error) {
      console.error('❌ Error in stopRepeatingVoice:', error);
    }

    // Additional cleanup - force reset all audio
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log('🔇 Audio mode reset to default');
    } catch (audioModeError) {
      console.warn('⚠️ Failed to reset audio mode:', audioModeError);
    }
  }

  /**
   * Check if voice is currently repeating
   */
  isCurrentlyRepeating(): boolean {
    return this.isRepeating;
  }

  /**
   * Play a local voice file (single play, no repeat)
   * @param localFilePath - Local file path to the voice recording
   */
  async playLocalVoiceFile(localFilePath: string): Promise<boolean> {
    try {
      console.log('🎵 Playing local voice file:', localFilePath);

      // Stop any currently playing sound
      await this.stopCurrentSound();

      // Configure audio mode for iOS playback with high priority
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true, // Play even when silent switch is on
          staysActiveInBackground: true,
          shouldDuckAndroid: false, // Don't duck - take full audio focus
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1, // DoNotMix mode
          interruptionModeAndroid: 1, // DoNotMix mode
        });
      } catch (audioModeError) {
        console.warn('⚠️ Failed to set audio mode, continuing anyway:', audioModeError);
      }

      // Small delay to ensure audio mode is set before playing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify file exists before attempting to play
      const fileUri = localFilePath.startsWith('file://') ? localFilePath : `file://${localFilePath}`;
      console.log('📂 Loading audio from URI:', fileUri);

      // Create and load the sound with retry logic
      let sound: Audio.Sound | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !sound) {
        try {
          const result = await Audio.Sound.createAsync(
            { uri: fileUri },
            { shouldPlay: true, volume: 1.0 },
            this.onPlaybackStatusUpdate
          );
          sound = result.sound;
        } catch (loadError) {
          attempts++;
          console.warn(`⚠️ Attempt ${attempts}/${maxAttempts} failed:`, loadError);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200 * attempts));
          } else {
            throw loadError;
          }
        }
      }

      if (!sound) {
        throw new Error('Failed to create sound after retries');
      }

      this.currentSound = sound;
      this.isPlaying = true;

      console.log('✅ Voice file playback started successfully');
      return true;
    } catch (error) {
      console.error('❌ Error playing voice file:', error);
      console.error('   File path:', localFilePath);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  /**
   * Play a remote voice file (with URL)
   * @param voiceUrl - Remote URL to the voice recording
   */
  async playRemoteVoiceFile(voiceUrl: string): Promise<boolean> {
    try {
      console.log('🎵 Playing remote voice file:', voiceUrl.substring(0, 50) + '...');

      // Stop any currently playing sound
      await this.stopCurrentSound();

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Create and load the sound from URL
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true, volume: 1.0 },
        this.onPlaybackStatusUpdate
      );

      this.currentSound = sound;
      this.isPlaying = true;

      console.log('✅ Voice file playback started from URL');
      return true;
    } catch (error) {
      console.error('❌ Error playing remote voice file:', error);
      return false;
    }
  }

  /**
   * Stop the currently playing sound
   */
  async stopCurrentSound(): Promise<void> {
    try {
      if (!this.currentSound) {
        console.log('⏹️ No sound to stop');
        return;
      }

      console.log('⏹️ Stopping current sound (isPlaying:', this.isPlaying, ', isRepeating:', this.isRepeating, ')');
      
      const soundToStop = this.currentSound;
      
      // Reset state IMMEDIATELY to prevent re-entry
      this.currentSound = null;
      this.isPlaying = false;
      this.isRepeating = false;
      
      try {
        // Try to stop gracefully
        await soundToStop.stopAsync();
        console.log('   ✅ Sound stopped');
      } catch (stopError: any) {
        // Ignore "Seeking interrupted" - it means stop succeeded
        if (!stopError?.message?.includes('Seeking interrupted')) {
          console.warn('   ⚠️ Stop error (non-fatal):', stopError?.message);
        }
      }
      
      try {
        // Try to unload
        await soundToStop.unloadAsync();
        console.log('   ✅ Sound unloaded');
      } catch (unloadError: any) {
        // Sound might already be unloaded - that's fine
        console.warn('   ⚠️ Unload error (non-fatal):', unloadError?.message);
      }
      
      console.log('   ✅ Sound fully stopped and unloaded');
    } catch (error) {
      console.error('❌ Error stopping sound:', error);
      // Force reset state even if stop failed
      this.currentSound = null;
      this.isPlaying = false;
      this.isRepeating = false;
    }
  }

  /**
   * Pause the currently playing sound
   */
  async pauseCurrentSound(): Promise<void> {
    try {
      if (this.currentSound && this.isPlaying) {
        console.log('⏸️ Pausing current sound');
        await this.currentSound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('❌ Error pausing sound:', error);
    }
  }

  /**
   * Resume the currently paused sound
   */
  async resumeCurrentSound(): Promise<void> {
    try {
      if (this.currentSound && !this.isPlaying) {
        console.log('▶️ Resuming sound');
        await this.currentSound.playAsync();
        this.isPlaying = true;
      }
    } catch (error) {
      console.error('❌ Error resuming sound:', error);
    }
  }

  /**
   * Check if a sound is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Playback status update callback
   */
  private onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish && !this.isRepeating) {
        // Only stop if not in repeat mode
        console.log('✅ Voice playback finished');
        this.isPlaying = false;
        // Automatically unload the sound when finished
        this.stopCurrentSound();
      }
      if (status.isPlaying) {
        // console.log('🎵 Playing... Position:', status.positionMillis, 'Duration:', status.durationMillis);
      }
    } else if (status.error) {
      console.error('❌ Playback error:', status.error);
      this.isPlaying = false;
      this.isRepeating = false;
    }
  };

  /**
   * Cleanup - stop and unload all sounds
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up voice player');
    await this.stopCurrentSound();
  }
}

export const voicePlayerService = new VoicePlayerService();
export default voicePlayerService;

