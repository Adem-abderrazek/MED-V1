package com.safeabd.medicarealarm

import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.*
import java.util.Timer
import java.util.TimerTask

class AlarmActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "AlarmActivity"
        private const val SNOOZE_DURATION_MINUTES = 5
        const val EXTRA_REMINDER_ID = "reminder_id"
        const val EXTRA_ORIGINAL_REMINDER_ID = "original_reminder_id" // For snooze - keep original ID
        const val EXTRA_MEDICATION_NAME = "medication_name"
        const val EXTRA_DOSAGE = "dosage"
        const val EXTRA_INSTRUCTIONS = "instructions"
        const val EXTRA_PATIENT_ID = "patient_id"
        const val EXTRA_AUDIO_PATH = "audio_path"
    }

    private var reminderId: String = ""
    private var originalReminderId: String = "" // Original reminder ID (for snooze confirmations)
    private var medicationName: String = ""
    private var dosage: String = ""
    private var instructions: String = ""
    private var patientId: String = ""
    private var audioPath: String? = null
    private var timeUpdateTimer: Timer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "AlarmActivity created")

        // CRITICAL: Show over lock screen BEFORE setting content view
        // This must be called early to ensure it works when device is locked
        showOverLockScreen()

        setContentView(R.layout.activity_alarm)
        
        // Ensure window flags are set again after content view (for older Android versions)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        // Extract all intent extras
        medicationName = intent.getStringExtra(EXTRA_MEDICATION_NAME) ?: "Medication"
        dosage = intent.getStringExtra(EXTRA_DOSAGE) ?: ""
        reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: ""
        // For snooze alarms, use original reminder ID for confirmation
        originalReminderId = intent.getStringExtra(EXTRA_ORIGINAL_REMINDER_ID) ?: reminderId
        instructions = intent.getStringExtra(EXTRA_INSTRUCTIONS) ?: ""
        patientId = intent.getStringExtra(EXTRA_PATIENT_ID) ?: ""
        audioPath = intent.getStringExtra(EXTRA_AUDIO_PATH)
        
        // Log audio path for debugging
        if (audioPath != null) {
            Log.d(TAG, "🎵 AlarmActivity received audio path: $audioPath")
        } else {
            Log.w(TAG, "⚠️ AlarmActivity received NULL audio path - will use default alarm sound")
        }

        // Set up UI
        findViewById<TextView>(R.id.medicationName)?.text = medicationName
        
        // Set up dosage - show/hide container based on whether dosage exists
        val dosageContainer = findViewById<LinearLayout>(R.id.dosageContainer)
        val dosageText = findViewById<TextView>(R.id.dosageText)
        if (dosage.isNotEmpty()) {
            dosageText?.text = dosage
            dosageContainer?.visibility = View.VISIBLE
        } else {
            dosageContainer?.visibility = View.GONE
        }
        
        // Set up instructions - show/hide container based on whether instructions exist
        val instructionsContainer = findViewById<LinearLayout>(R.id.instructionsContainer)
        val instructionsText = findViewById<TextView>(R.id.instructionsText)
        if (instructions.isNotEmpty()) {
            instructionsText?.text = instructions
            instructionsContainer?.visibility = View.VISIBLE
        } else {
            instructionsContainer?.visibility = View.GONE
        }
        
        // Update time display with seconds
        val timeTextView = findViewById<TextView>(R.id.timeText)
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        timeTextView?.text = timeFormat.format(Date())
        
        // Update time every second for live clock
        timeUpdateTimer = Timer()
        timeUpdateTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                runOnUiThread {
                    timeTextView?.text = timeFormat.format(Date())
                }
            }
        }, 0, 1000)

        findViewById<Button>(R.id.confirmButton)?.setOnClickListener {
            Log.d(TAG, "Confirm clicked - confirming reminder: $originalReminderId")
            // Use original reminder ID for confirmation (important for snooze)
            savePendingConfirmation(originalReminderId)
            AlarmService.stopAlarm(this)
            
            // Open the main app activity to confirm medication
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("reminderId", originalReminderId)
                putExtra("action", "confirm_medication")
            }
            startActivity(mainIntent)
            finish()
        }

        findViewById<Button>(R.id.snoozeButton)?.setOnClickListener {
            Log.d(TAG, "Snooze clicked - scheduling alarm for $SNOOZE_DURATION_MINUTES minutes")
            AlarmService.stopAlarm(this)
            scheduleSnoozeAlarm()
            finish()
        }
    }

    /**
     * Schedule a new alarm for 5 minutes from now with the same medication details
     */
    private fun scheduleSnoozeAlarm() {
        try {
            val prefs = getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val snoozeTime = System.currentTimeMillis() + (SNOOZE_DURATION_MINUTES * 60 * 1000L)

            // Create unique snooze alarm ID
            val snoozeAlarmId = "${reminderId}_snooze_${System.currentTimeMillis()}"
            
            Log.d(TAG, "⏰ Scheduling snooze alarm for ${Date(snoozeTime)} (5 minutes from now)")

            // Get audio path - try multiple sources
            var snoozeAudioPath = audioPath // First try from current intent
            
            // If null, try to retrieve from SharedPreferences (stored when alarm was scheduled)
            if (snoozeAudioPath == null || snoozeAudioPath.isEmpty()) {
                try {
                    snoozeAudioPath = prefs.getString("audio_$reminderId", null)
                    if (snoozeAudioPath != null) {
                        Log.d(TAG, "🎵 Retrieved audio path from SharedPreferences for snooze: $snoozeAudioPath")
                    } else {
                        Log.w(TAG, "⚠️ No audio path found in SharedPreferences for reminder: $reminderId")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Could not retrieve audio path from SharedPreferences: ${e.message}")
                }
            }
            
            // Log audio path for debugging
            if (snoozeAudioPath != null && snoozeAudioPath.isNotEmpty()) {
                Log.d(TAG, "🎵 Snooze alarm audio path: $snoozeAudioPath")
                // Verify file exists
                try {
                    val path = snoozeAudioPath.removePrefix("file://")
                    val file = java.io.File(path)
                    if (file.exists()) {
                        Log.d(TAG, "🎵 Audio file exists: ${file.exists()}, Size: ${file.length()} bytes")
                    } else {
                        Log.w(TAG, "⚠️ Audio file does not exist at path: $path")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Could not verify audio file: ${e.message}")
                }
            } else {
                Log.w(TAG, "⚠️ Snooze alarm audio path is NULL/empty - will use default alarm sound")
            }

            val intent = Intent(this, AlarmReceiver::class.java).apply {
                action = AlarmReceiver.ACTION_ALARM // ✅ CRITICAL: Must set action for receiver to work
                putExtra(EXTRA_REMINDER_ID, snoozeAlarmId) // New alarm ID for scheduling
                putExtra(EXTRA_ORIGINAL_REMINDER_ID, reminderId) // Keep original for confirmation
                putExtra(EXTRA_MEDICATION_NAME, medicationName)
                putExtra(EXTRA_DOSAGE, dosage)
                putExtra(EXTRA_INSTRUCTIONS, instructions.ifEmpty { "Rappel (Snooze)" })
                putExtra(EXTRA_PATIENT_ID, patientId)
                putExtra(EXTRA_AUDIO_PATH, snoozeAudioPath) // ✅ Pass audio path (may be null, but we tried to retrieve it)
            }
            
            Log.d(TAG, "📋 Snooze alarm intent created with audioPath: ${intent.getStringExtra(EXTRA_AUDIO_PATH) ?: "null"}")
            
            // Also store audio path in SharedPreferences for the snooze alarm ID
            if (snoozeAudioPath != null && snoozeAudioPath.isNotEmpty()) {
                try {
                    prefs.edit().putString("audio_$snoozeAlarmId", snoozeAudioPath).apply()
                    Log.d(TAG, "✅ Stored audio path for snooze alarm: $snoozeAlarmId")
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Failed to store audio path for snooze: ${e.message}")
                }
            }

            val pendingIntent = PendingIntent.getBroadcast(
                this,
                snoozeAlarmId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Schedule the alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        snoozeTime,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Snooze alarm scheduled for ${Date(snoozeTime)}")
                } else {
                    Log.w(TAG, "Cannot schedule exact alarms - permission not granted")
                    // Fall back to inexact alarm
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        snoozeTime,
                        pendingIntent
                    )
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    snoozeTime,
                    pendingIntent
                )
                Log.d(TAG, "✅ Snooze alarm scheduled for ${Date(snoozeTime)}")
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    snoozeTime,
                    pendingIntent
                )
                Log.d(TAG, "✅ Snooze alarm scheduled for ${Date(snoozeTime)}")
            }
            
            Log.d(TAG, "✅ Snooze alarm successfully scheduled - will fire in 5 minutes")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule snooze alarm", e)
        }
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Modern API (Android 8.1+)
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            try {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    keyguardManager.requestDismissKeyguard(this, null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to dismiss keyguard", e)
            }
        } else {
            // Legacy API (Android 8.0 and below)
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                        WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
        }
        
        // Additional window flags for all versions
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
    }

    private fun savePendingConfirmation(reminderId: String) {
        try {
            val prefs = getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
            val existing = prefs.getString("pendingConfirmations", "[]")
            val confirmations = org.json.JSONArray(existing)
            
            // Check if this reminderId is already in the list to avoid duplicates
            var alreadyExists = false
            for (i in 0 until confirmations.length()) {
                val existingConfirmation = confirmations.getJSONObject(i)
                if (existingConfirmation.getString("reminderId") == reminderId) {
                    alreadyExists = true
                    Log.d(TAG, "⚠️ Confirmation for $reminderId already exists, updating timestamp")
                    // Update timestamp instead of adding duplicate
                    existingConfirmation.put("timestamp", System.currentTimeMillis())
                    break
                }
            }
            
            if (!alreadyExists) {
                val newConfirmation = org.json.JSONObject().apply {
                    put("reminderId", reminderId)
                    put("timestamp", System.currentTimeMillis())
                }
                confirmations.put(newConfirmation)
            }
            
            prefs.edit().putString("pendingConfirmations", confirmations.toString()).apply()
            Log.d(TAG, "✅ Saved pending confirmation for reminderId: $reminderId (total: ${confirmations.length()})")
            
            // Log the full confirmation list for debugging
            Log.d(TAG, "📋 Current pending confirmations: ${confirmations.toString()}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save confirmation for $reminderId", e)
        }
    }

    override fun onBackPressed() {
        // Prevent back button from dismissing alarm
    }

    override fun onDestroy() {
        super.onDestroy()
        timeUpdateTimer?.cancel()
        timeUpdateTimer = null
    }
}