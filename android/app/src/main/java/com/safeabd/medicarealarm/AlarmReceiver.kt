package com.safeabd.medicarealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AlarmReceiver"
        const val ACTION_ALARM = "com.safeabd.medicarealarm.ACTION_ALARM"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "========================================")
        Log.d(TAG, "ALARM RECEIVED!")
        Log.d(TAG, "Action: ${intent.action}")
        Log.d(TAG, "========================================")

        if (intent.action != ACTION_ALARM) {
            Log.d(TAG, "Ignoring non-alarm action")
            return
        }

        // Wake up the device
        wakeUpDevice(context)

        val reminderId = intent.getStringExtra(AlarmActivity.EXTRA_REMINDER_ID) ?: ""
        val medicationName = intent.getStringExtra(AlarmActivity.EXTRA_MEDICATION_NAME) ?: "Medication"
        val dosage = intent.getStringExtra(AlarmActivity.EXTRA_DOSAGE) ?: ""
        val instructions = intent.getStringExtra(AlarmActivity.EXTRA_INSTRUCTIONS) ?: ""
        val patientId = intent.getStringExtra(AlarmActivity.EXTRA_PATIENT_ID) ?: ""
        
        // Get original reminder ID if this is a snooze alarm
        val originalReminderId = intent.getStringExtra(AlarmActivity.EXTRA_ORIGINAL_REMINDER_ID)
        
        // Get audio path from intent, or retrieve from SharedPreferences as fallback
        var audioPath = intent.getStringExtra(AlarmActivity.EXTRA_AUDIO_PATH)
        
        // Log audio path for debugging
        if (audioPath != null) {
            Log.d(TAG, "🎵 AlarmReceiver received audio path: $audioPath")
        } else {
            Log.w(TAG, "⚠️ AlarmReceiver received NULL audio path")
            // Try to retrieve from SharedPreferences as fallback
            try {
                val prefs = context.getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
                val storedAudioPath = prefs.getString("audio_$reminderId", null)
                if (storedAudioPath != null) {
                    audioPath = storedAudioPath
                    Log.d(TAG, "🎵 Retrieved audio path from SharedPreferences: $audioPath")
                }
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Could not retrieve audio path from SharedPreferences: ${e.message}")
            }
        }

        Log.d(TAG, "Medication: $medicationName, Dosage: $dosage")

        // Start the foreground service for audio
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra(AlarmActivity.EXTRA_REMINDER_ID, reminderId)
            putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
            putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
            putExtra(AlarmActivity.EXTRA_INSTRUCTIONS, instructions)
            putExtra(AlarmActivity.EXTRA_PATIENT_ID, patientId)
            putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath) // ✅ Ensure audio path is passed
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d(TAG, "AlarmService started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start AlarmService", e)
        }
        
        // Start the alarm activity with flags to show over lock screen
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            // Critical flags to show over lock screen and wake device
            // Added FLAG_ACTIVITY_BROUGHT_TO_FRONT and FLAG_ACTIVITY_REORDER_TO_FRONT to ensure it shows
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_HISTORY or
                    Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            putExtra(AlarmActivity.EXTRA_REMINDER_ID, reminderId)
            if (originalReminderId != null) {
                putExtra(AlarmActivity.EXTRA_ORIGINAL_REMINDER_ID, originalReminderId)
            }
            putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
            putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
            putExtra(AlarmActivity.EXTRA_INSTRUCTIONS, instructions)
            putExtra(AlarmActivity.EXTRA_PATIENT_ID, patientId)
            putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath) // ✅ Pass audio path (may have been retrieved from prefs)
        }

        try {
            // Start activity - this should work even when locked due to manifest settings
            // The flags above ensure it's brought to front immediately
            context.startActivity(activityIntent)
            Log.d(TAG, "✅ AlarmActivity started with flags - should appear over lock screen immediately")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start AlarmActivity", e)
            Log.e(TAG, "Error details: ${e.message}", e)
        }
    }

    private fun wakeUpDevice(context: Context) {
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            // Use PARTIAL_WAKE_LOCK for better compatibility, but ensure screen turns on
            val wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                "MedicareAlarm:WakeLock"
            )
            wakeLock.acquire(10 * 60 * 1000L) // 10 minutes - will be released when activity starts
            Log.d(TAG, "✅ Device woken up with wake lock")
            
            // Also try to wake screen explicitly
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                // Screen wake is handled by AlarmActivity's setTurnScreenOn()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to acquire wake lock", e)
        }
    }
}