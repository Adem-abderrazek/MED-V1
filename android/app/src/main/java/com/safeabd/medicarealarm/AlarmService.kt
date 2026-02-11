package com.safeabd.medicarealarm

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File

class AlarmService : Service() {

    companion object {
        private const val TAG = "AlarmService"
        private const val CHANNEL_ID = "medication_alarm_channel"
        private const val NOTIFICATION_ID = 1001
        private var mediaPlayer: MediaPlayer? = null

        fun stopAlarm(context: Context) {
            Log.d(TAG, "Stopping alarm")
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            context.stopService(Intent(context, AlarmService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "AlarmService started")

        val medicationName = intent?.getStringExtra(AlarmActivity.EXTRA_MEDICATION_NAME) ?: "Medication"
        val dosage = intent?.getStringExtra(AlarmActivity.EXTRA_DOSAGE) ?: ""
        val audioPath = intent?.getStringExtra(AlarmActivity.EXTRA_AUDIO_PATH)
        
        // Log audio path
        if (audioPath != null) {
            Log.d(TAG, "🎵 AlarmService received audio path: $audioPath")
        } else {
            Log.w(TAG, "⚠️ AlarmService received NULL audio path")
        }

        // Start as foreground service
        // Note: The notification's fullScreenIntent will automatically show AlarmActivity
        val notification = createNotification(medicationName, dosage, audioPath)
        startForeground(NOTIFICATION_ID, notification)

        // Play alarm sound
        playAlarmSound(audioPath)

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            val existing = manager.getNotificationChannel(CHANNEL_ID)

            if (existing != null && existing.importance < NotificationManager.IMPORTANCE_HIGH) {
                manager.deleteNotificationChannel(CHANNEL_ID)
            }

            val channel = NotificationChannel(
                CHANNEL_ID,
                "Medication Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Medication reminder alarms"
                setSound(null, null)
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }

            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(medicationName: String, dosage: String, audioPath: String?): Notification {
        val activityIntent = Intent(this, AlarmActivity::class.java).apply {
            // Use same flags as AlarmReceiver to ensure activity shows properly
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_HISTORY or
                    Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
            putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
            // Pass audio path if available
            if (audioPath != null) {
                putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("💊 Time for your medication!")
            .setContentText("$medicationName - $dosage")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pendingIntent, true) // ✅ Use fullScreenIntent to show activity automatically over lock screen
            .setContentIntent(pendingIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .build()
    }

    private fun playAlarmSound(audioPath: String?) {
        try {
            // Set volume to max and request audio focus
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // Request audio focus for alarm playback
            val audioFocusRequest = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val focusRequest = android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .build()
                audioManager.requestAudioFocus(focusRequest)
            } else {
                @Suppress("DEPRECATION")
                audioManager.requestAudioFocus(
                    null,
                    AudioManager.STREAM_ALARM,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                )
            }
            
            if (audioFocusRequest != AudioManager.AUDIOFOCUS_REQUEST_GRANTED && audioFocusRequest != AudioManager.AUDIOFOCUS_GAIN) {
                Log.w(TAG, "Audio focus not granted, but continuing anyway")
            }
            
            // Set volume to max
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)
            Log.d(TAG, "Volume set to max: $maxVolume")

            // Release any existing player
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED) // Ensure sound plays
                        .build()
                )

                // Try custom audio first, then default alarm
                val soundPlayed = if (!audioPath.isNullOrEmpty()) {
                    try {
                        val path = audioPath.removePrefix("file://")
                        val file = File(path)
                        Log.d(TAG, "Attempting to play custom audio from: $path")
                        Log.d(TAG, "File exists: ${file.exists()}, Size: ${file.length()} bytes")
                        if (file.exists() && file.length() > 0) {
                            setDataSource(path)
                            Log.d(TAG, "✅ Custom audio data source set")
                            true
                        } else {
                            Log.w(TAG, "Custom audio file not found or empty")
                            false
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Custom audio failed", e)
                        false
                    }
                } else {
                    Log.d(TAG, "No custom audio path provided")
                    false
                }

                if (!soundPlayed) {
                    Log.d(TAG, "Using default alarm sound")
                    val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    setDataSource(this@AlarmService, alarmUri)
                }

                isLooping = true
                prepare()
                start()
                Log.d(TAG, "✅ Alarm sound playing - isPlaying: ${isPlaying}, volume: ${audioManager.getStreamVolume(AudioManager.STREAM_ALARM)}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to play alarm sound", e)
            Log.e(TAG, "Error details: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
        }
        mediaPlayer = null
    }
}
