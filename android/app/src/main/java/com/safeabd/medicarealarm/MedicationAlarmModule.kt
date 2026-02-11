package com.safeabd.medicarealarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.net.Uri
import android.provider.Settings
import android.os.PowerManager
import com.facebook.react.bridge.*
import org.json.JSONArray

class MedicationAlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "MedicationAlarmModule"
    }

    override fun getName(): String = "MedicationAlarmModule"

    @ReactMethod
    fun scheduleAlarm(
        reminderId: String, triggerTimeMs: Double, medicationName: String,
        dosage: String, instructions: String, patientId: String, audioPath: String?, promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            // Store audioPath in SharedPreferences for retrieval during snooze
            // This ensures audio is available even if intent extras are lost
            if (audioPath != null && audioPath.isNotEmpty()) {
                try {
                    val prefs = context.getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("audio_$reminderId", audioPath).apply()
                    Log.d(TAG, "✅ Stored audio path in SharedPreferences for reminder: $reminderId")
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Failed to store audio path in SharedPreferences: ${e.message}")
                }
            } else {
                Log.w(TAG, "⚠️ No audio path provided for reminder: $reminderId")
            }
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = AlarmReceiver.ACTION_ALARM
                putExtra(AlarmActivity.EXTRA_REMINDER_ID, reminderId)
                putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
                putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
                putExtra(AlarmActivity.EXTRA_INSTRUCTIONS, instructions)
                putExtra(AlarmActivity.EXTRA_PATIENT_ID, patientId)
                putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val triggerTime = triggerTimeMs.toLong()
            Log.d(TAG, "Scheduling alarm for $medicationName at ${java.util.Date(triggerTime)} (audioPath: ${audioPath ?: "null"})")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted")
                return
            }
            // Use AlarmClock on modern Android for reliability and full-screen behavior
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val showIntent = PendingIntent.getActivity(
                    context,
                    reminderId.hashCode(),
                    Intent(context, AlarmActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_NO_HISTORY
                        putExtra(AlarmActivity.EXTRA_REMINDER_ID, reminderId)
                        putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
                        putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
                        putExtra(AlarmActivity.EXTRA_INSTRUCTIONS, instructions)
                        putExtra(AlarmActivity.EXTRA_PATIENT_ID, patientId)
                        putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.setAlarmClock(
                    AlarmManager.AlarmClockInfo(triggerTime, showIntent),
                    pendingIntent
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
            Log.d(TAG, "✅ Alarm scheduled to fire automatically at ${java.util.Date(triggerTime)}")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun testAlarm(medicationName: String, dosage: String, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, AlarmActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
                putExtra(AlarmActivity.EXTRA_DOSAGE, dosage)
                putExtra(AlarmActivity.EXTRA_REMINDER_ID, "test_${System.currentTimeMillis()}")
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("TEST_ERROR", e.message) }
    }

    @ReactMethod
    fun cancelAlarm(reminderId: String, promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(reactApplicationContext, reminderId.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            alarmManager.cancel(pendingIntent)
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("CANCEL_ERROR", e.message) }
    }

    @ReactMethod fun stopAlarm(promise: Promise) { try { AlarmService.stopAlarm(reactApplicationContext); promise.resolve(true) } catch (e: Exception) { promise.reject("STOP_ERROR", e.message) } }
    @ReactMethod fun confirmMedication(promise: Promise) { try { AlarmService.stopAlarm(reactApplicationContext); promise.resolve(true) } catch (e: Exception) { promise.reject("CONFIRM_ERROR", e.message) } }
    @ReactMethod fun snoozeAlarm(promise: Promise) { try { AlarmService.stopAlarm(reactApplicationContext); promise.resolve(true) } catch (e: Exception) { promise.reject("SNOOZE_ERROR", e.message) } }
    @ReactMethod 
    fun isAlarmActive(promise: Promise) { 
        promise.resolve(false) 
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                promise.resolve(alarmManager.canScheduleExactAlarms())
            } else {
                promise.resolve(true) // Pre-Android 12, exact alarms are always allowed
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun openExactAlarmSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false) // Not needed on older Android versions
            }
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("OVERLAY_SETTINGS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_REQUEST_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getCurrentAlarmData(promise: Promise) {
        try {
            // Return null for now - can be enhanced to track active alarm state
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("GET_ALARM_DATA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getPendingConfirmations(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
            val confirmations = JSONArray(prefs.getString("pendingConfirmations", "[]"))
            val result = Arguments.createArray()
            for (i in 0 until confirmations.length()) {
                val item = confirmations.getJSONObject(i)
                val map = Arguments.createMap()
                map.putString("reminderId", item.getString("reminderId"))
                map.putDouble("timestamp", item.getLong("timestamp").toDouble())
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) { promise.reject("GET_ERROR", e.message) }
    }

    @ReactMethod
    fun clearPendingConfirmations(promise: Promise) {
        try {
            reactApplicationContext.getSharedPreferences("MedicationAlarmPrefs", Context.MODE_PRIVATE)
                .edit().putString("pendingConfirmations", "[]").apply()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("CLEAR_ERROR", e.message) }
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
