# Medication Alarm System - Complete Workflow Documentation

## Overview

This document explains the complete workflow of the medication alarm system, from prescription creation to synchronization with the backend. It focuses on how the alarm system works and the role of each component.

---

## Table of Contents

1. [What is `medication-alarm.tsx`?](#what-is-medication-alarmtsx)
2. [Complete Workflow](#complete-workflow)
3. [Alarm System Architecture](#alarm-system-architecture)
4. [Key Components](#key-components)
5. [Alarm Triggering Flow](#alarm-triggering-flow)
6. [User Actions (Confirm/Snooze)](#user-actions-confirmsnooze)
7. [Synchronization](#synchronization)

---

## What is `medication-alarm.tsx`?

**`medication-alarm.tsx`** is a **React Native screen component** that displays the full-screen alarm interface when a medication reminder is triggered. It serves as the **user-facing UI** for the alarm system.

### Purpose:
- Displays medication information (name, dosage, instructions)
- Shows current time
- Provides two action buttons:
  - **"J'ai pris" (I took it)** - Confirms medication was taken
  - **"Reporter 5 min" (Snooze 5 min)** - Schedules alarm to repeat in 5 minutes
- Plays voice message from doctor (if available)
- Prevents dismissal via back button (critical for medication compliance)

### When is it shown?
- When a scheduled medication alarm fires
- Triggered by either:
  - **Android Native Alarm** → Opens `AlarmActivity.kt` → Navigates to React Native screen
  - **Notifee Full-Screen Notification** → Directly navigates to this screen
  - **Expo Notifications** (fallback) → Navigates to this screen

### Key Features:
- **Full-screen overlay** - Cannot be easily dismissed
- **Gradient styling** - Modern, attention-grabbing design
- **Audio playback** - Plays doctor's voice message if attached
- **Vibration** - Continuous vibration pattern
- **Time display** - Shows current time

---

## Complete Workflow

### Step 1: Prescription Creation

**Location:** `app/(doctor)/dashboard.tsx` or `app/(shared)/add-patient.tsx`

**Process:**
1. Doctor/Tutor creates a prescription via `AddPrescriptionModal`
2. Prescription data includes:
   - Medication name, dosage, instructions
   - Schedule (times, days, frequency)
   - Voice message (optional)
   - Duration (chronic or temporary with end date)
3. API call: `POST /tutor/patients/{patientId}/prescriptions`
4. Backend creates prescription and generates reminder records

**Code Flow:**
```typescript
// In AddPrescriptionModal.tsx
const handleSavePrescription = async (prescriptionData) => {
  const result = await createPrescription(token, patientId, prescriptionData);
  // Backend creates prescription and reminders
}
```

---

### Step 2: Reminder Sync (Patient App)

**Location:** `shared/services/localReminderService.ts`

**Process:**
1. Patient app calls `downloadAndScheduleReminders(token)`
2. Fetches upcoming reminders from backend: `GET /patient/reminders/upcoming`
3. For each reminder:
   - Downloads voice message audio file (if available)
   - Stores locally in `FileSystem.documentDirectory/voice-messages/`
   - Schedules the alarm locally

**Code Flow:**
```typescript
// In localReminderService.ts
export async function downloadAndScheduleReminders(token: string) {
  // 1. Fetch reminders from backend
  const response = await apiService.getUpcomingReminders(token);
  const reminders = response.data as LocalReminder[];

  // 2. Download voice messages
  for (const reminder of reminders) {
    if (reminder.voiceUrl) {
      await downloadVoiceMessage(reminder); // Downloads to local storage
    }
  }

  // 3. Schedule each reminder
  for (const reminder of reminders) {
    await scheduleReminder(reminder);
  }
}
```

---

### Step 3: Alarm Scheduling

**Location:** `shared/services/localReminderService.ts` → `scheduleReminder()`

**Two Paths:**

#### Path A: Android Native Alarm (Primary)
- Uses `alarmService.scheduleAlarm()` (calls native Android module)
- Schedules via Android `AlarmManager` with `setExactAndAllowWhileIdle()`
- Works even when app is killed/device is sleeping
- Full-screen alarm guaranteed

**Code Flow:**
```typescript
// In localReminderService.ts
if (useNativeAlarms) { // Android only
  const audioPath = await getVoiceMessagePath(reminder.prescriptionId);
  
  await alarmService.scheduleAlarm({
    alarmId: reminder.reminderId,
    triggerTime: scheduledDate,
    medicationName: reminder.medicationName,
    dosage: reminder.dosage,
    instructions: reminder.instructions,
    reminderId: reminder.reminderId,
    patientId: reminder.patientId,
    audioPath: audioPath, // Local file path
  });
}
```

#### Path B: Expo Notifications (Fallback)
- Used if native alarms unavailable (iOS, or Android without module)
- Uses `expo-notifications` to schedule notification
- Less reliable for critical alarms

---

### Step 4: Native Android Alarm Module

**Location:** `android/app/src/main/java/com/safeabd/medicarealarm/MedicationAlarmModule.kt`

**Process:**
1. Receives alarm scheduling request from JavaScript
2. Creates `PendingIntent` with `AlarmReceiver` as target
3. Schedules via `AlarmManager.setExactAndAllowWhileIdle()`
4. Stores alarm data in `SharedPreferences` for later retrieval

**Key Code:**
```kotlin
// In MedicationAlarmModule.kt
fun scheduleAlarm(
    alarmId: String,
    triggerTimeMs: Long,
    medicationName: String,
    dosage: String,
    instructions: String,
    patientId: String,
    audioPath: String?
) {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
        action = AlarmReceiver.ACTION_ALARM
        putExtra(AlarmActivity.EXTRA_REMINDER_ID, alarmId)
        putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
        // ... other extras
        putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath)
    }
    
    val pendingIntent = PendingIntent.getBroadcast(
        context,
        alarmId.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    
    alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerTimeMs,
        pendingIntent
    )
}
```

---

### Step 5: Alarm Triggering

**Location:** `android/app/src/main/java/com/safeabd/medicarealarm/AlarmReceiver.kt`

**When alarm time arrives:**
1. Android system fires `PendingIntent`
2. `AlarmReceiver.onReceive()` is called
3. Receiver:
   - Wakes up device (`PowerManager` wake lock)
   - Starts `AlarmService` (foreground service for audio playback)
   - Starts `AlarmActivity` (native Android full-screen UI)
   - Passes all medication data via Intent extras

**Code Flow:**
```kotlin
// In AlarmReceiver.kt
override fun onReceive(context: Context, intent: Intent) {
    // 1. Wake device
    wakeUpDevice(context)
    
    // 2. Start foreground service for audio
    val serviceIntent = Intent(context, AlarmService::class.java)
    context.startForegroundService(serviceIntent)
    
    // 3. Start full-screen activity
    val activityIntent = Intent(context, AlarmActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP
        // Pass all data
        putExtra(AlarmActivity.EXTRA_MEDICATION_NAME, medicationName)
        putExtra(AlarmActivity.EXTRA_AUDIO_PATH, audioPath)
    }
    context.startActivity(activityIntent)
}
```

---

### Step 6: Native Alarm UI (Android)

**Location:** `android/app/src/main/java/com/safeabd/medicarealarm/AlarmActivity.kt`

**Process:**
1. `AlarmActivity` displays native Android UI (XML layout)
2. Shows medication info, time, and action buttons
3. Plays audio via `AlarmService` (foreground service)
4. User can:
   - **Confirm** → Saves confirmation, opens React Native app
   - **Snooze** → Schedules new alarm for 5 minutes later

**Key Features:**
- Shows over lock screen (via `setShowWhenLocked(true)`)
- Turns screen on automatically
- Cannot be dismissed with back button
- Gradient-styled buttons with meaningful text

---

### Step 7: Navigation to React Native Screen

**Location:** `AlarmActivity.kt` → `app/(patient)/medication-alarm.tsx`

**Process:**
1. When user clicks "Confirm" in native UI:
   - Saves confirmation to `SharedPreferences`
   - Opens `MainActivity` (React Native app)
   - Passes `reminderId` and `action: "confirm_medication"` via Intent
2. React Native app receives Intent in `_layout.tsx`
3. Navigates to `medication-alarm.tsx` screen
4. Screen displays same UI but in React Native (for consistency)

**Alternative Path:**
- If app is already running, `AlarmReceiver` can directly navigate to React Native screen
- Uses `router.push()` with medication data as params

---

### Step 8: User Actions

#### A. Confirm Medication

**Location:** `features/patient/hooks/useMedicationAlarm.ts`

**Process:**
1. User clicks "J'ai pris" button
2. `handleConfirm()` is called:
   - Stops vibration and audio
   - Cancels notification/alarm
   - Saves confirmation locally
   - Attempts to sync with backend
   - If offline, queues for later sync
   - Navigates to dashboard

**Code Flow:**
```typescript
// In useMedicationAlarm.ts
const handleConfirm = async () => {
  Vibration.cancel();
  if (sound) await sound.stopAsync();
  
  // Cancel alarm/notification
  await localReminderService.confirmReminderLocally(reminderId);
  
  // Sync with backend
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    await apiService.confirmMedicationTaken(token, [reminderId]);
  } else {
    // Queue for offline sync
    await addToOfflineQueue('confirm', reminderId);
  }
  
  router.replace('/(patient)/dashboard');
}
```

#### B. Snooze Alarm

**Location:** `features/patient/hooks/useMedicationAlarm.ts` → `localReminderService.snoozeReminderLocally()`

**Process:**
1. User clicks "Reporter 5 min" button
2. `handleSnooze()` is called:
   - Stops current alarm
   - Calculates new time: `Date.now() + 5 * 60 * 1000`
   - Schedules new alarm with same medication data
   - Uses unique alarm ID: `${reminderId}_snooze_${timestamp}`
   - Preserves original `reminderId` for confirmation

**Code Flow:**
```typescript
// In localReminderService.ts
export async function snoozeReminderLocally(reminderId: string) {
  // Cancel current alarm
  await alarmService.cancelAlarm(reminderId);
  
  // Schedule for 5 minutes later
  const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
  const snoozeAlarmId = `${reminderId}_snooze_${Date.now()}`;
  
  await alarmService.scheduleAlarm({
    alarmId: snoozeAlarmId,
    triggerTime: snoozeTime,
    medicationName: stored.medicationName,
    dosage: stored.dosage,
    reminderId: reminderId, // Original ID for confirmation
    // ... other data
  });
}
```

**Native Android Snooze:**
- In `AlarmActivity.kt`, `scheduleSnoozeAlarm()`:
  - Creates new `PendingIntent` with snooze alarm ID
  - Schedules via `AlarmManager` for 5 minutes later
  - Preserves audio path from original alarm
  - Uses `EXTRA_ORIGINAL_REMINDER_ID` to track original reminder

---

### Step 9: Synchronization

**Location:** `shared/services/offlineQueueService.ts` + `app/_layout.tsx`

**Process:**
1. **Online Sync:**
   - When user confirms medication, immediately calls:
     - `POST /patient/reminders/confirm` with `[reminderId]`
   - Backend updates adherence records

2. **Offline Queue:**
   - If offline, actions are queued in `AsyncStorage`
   - Queue structure:
     ```typescript
     {
       type: 'confirm' | 'snooze',
       reminderId: string,
       timestamp: string
     }
     ```

3. **Background Sync:**
   - When app comes to foreground or network available:
     - Checks for pending confirmations
     - Syncs with backend
     - Clears queue after successful sync

**Code Flow:**
```typescript
// In _layout.tsx
useEffect(() => {
  const syncPendingActions = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;
    
    const pending = await getOfflineQueue();
    for (const action of pending) {
      if (action.type === 'confirm') {
        await apiService.confirmMedicationTaken(token, [action.reminderId]);
      }
    }
    
    await clearOfflineQueue();
  };
  
  // Sync when app comes to foreground
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      syncPendingActions();
    }
  });
}, []);
```

---

## Alarm System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESCRIPTION CREATION                     │
│  (Doctor/Tutor creates prescription via AddPrescriptionModal)│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                               │
│  - Stores prescription                                       │
│  - Generates reminder records                               │
│  - Returns upcoming reminders                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PATIENT APP - REMINDER SYNC                     │
│  localReminderService.downloadAndScheduleReminders()        │
│  - Downloads voice messages                                 │
│  - Schedules alarms locally                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│  ANDROID NATIVE  │         │  EXPO NOTIF      │
│  ALARM (Primary) │         │  (Fallback)      │
└────────┬─────────┘         └────────┬─────────┘
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│              ALARM TRIGGERING (At Scheduled Time)          │
│  AlarmReceiver → AlarmService → AlarmActivity               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│  NATIVE ANDROID  │         │  REACT NATIVE    │
│  AlarmActivity   │         │  medication-     │
│  (Full-screen)   │         │  alarm.tsx       │
└────────┬─────────┘         └────────┬─────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTIONS                             │
│  - Confirm: Syncs with backend                              │
│  - Snooze: Reschedules for 5 minutes                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. **localReminderService.ts**
- Manages local reminder storage
- Downloads voice messages
- Schedules alarms (native or notifications)
- Handles confirm/snooze actions

### 2. **alarmService.ts**
- JavaScript bridge to native Android alarm module
- Provides methods: `scheduleAlarm()`, `cancelAlarm()`, `snoozeAlarm()`

### 3. **MedicationAlarmModule.kt** (Android)
- Native module that interfaces with Android `AlarmManager`
- Schedules exact alarms with `setExactAndAllowWhileIdle()`

### 4. **AlarmReceiver.kt** (Android)
- Broadcast receiver that fires when alarm time arrives
- Wakes device, starts service and activity

### 5. **AlarmService.kt** (Android)
- Foreground service for audio playback
- Ensures audio continues even if activity is closed

### 6. **AlarmActivity.kt** (Android)
- Native Android full-screen alarm UI
- Shows medication info and action buttons

### 7. **medication-alarm.tsx** (React Native)
- React Native version of alarm screen
- Used when app is already running
- Provides consistent UI experience

### 8. **useMedicationAlarm.ts** (Hook)
- React hook for alarm screen logic
- Handles confirm/snooze actions
- Manages audio playback and vibration

---

## Alarm Triggering Flow

### Detailed Sequence:

1. **Scheduled Time Arrives**
   - Android `AlarmManager` fires `PendingIntent`
   - System calls `AlarmReceiver.onReceive()`

2. **Device Wake-Up**
   - `AlarmReceiver` acquires `WakeLock`
   - Ensures device stays awake

3. **Service Start**
   - Starts `AlarmService` (foreground service)
   - Service loads and plays audio file (if available)

4. **Activity Launch**
   - Starts `AlarmActivity` with special flags:
     - `FLAG_ACTIVITY_NEW_TASK`
     - `FLAG_ACTIVITY_CLEAR_TOP`
     - `setShowWhenLocked(true)` (shows over lock screen)
     - `setTurnScreenOn(true)` (wakes screen)

5. **UI Display**
   - Native Android UI shows medication info
   - Audio plays in background
   - User sees action buttons

6. **User Interaction**
   - User clicks "Confirm" or "Snooze"
   - Action is processed
   - App navigates to React Native screen (if needed)

---

## User Actions (Confirm/Snooze)

### Confirm Flow:

```
User clicks "J'ai pris"
    ↓
handleConfirm() called
    ↓
Stop vibration & audio
    ↓
Cancel alarm/notification
    ↓
Save confirmation locally
    ↓
Try to sync with backend
    ├─ Success → Clear local confirmation
    └─ Failure → Queue for offline sync
    ↓
Navigate to dashboard
```

### Snooze Flow:

```
User clicks "Reporter 5 min"
    ↓
handleSnooze() called
    ↓
Stop current alarm
    ↓
Calculate new time (now + 5 minutes)
    ↓
Schedule new alarm with:
    - New alarm ID: ${reminderId}_snooze_${timestamp}
    - Original reminderId preserved
    - Same medication data
    - Same audio path
    ↓
Alarm will fire again in 5 minutes
```

---

## Synchronization

### Online Sync:
- Immediate API call when user confirms
- `POST /patient/reminders/confirm` with `[reminderId]`
- Backend updates adherence records

### Offline Queue:
- Actions stored in `AsyncStorage` if offline
- Queue structure: `{ type, reminderId, timestamp }`
- Synced when network available

### Background Sync:
- Triggered when:
  - App comes to foreground
  - Network becomes available
  - Periodic background task (if configured)

### Native Confirmations:
- Android native UI can save confirmations to `SharedPreferences`
- React Native app retrieves on startup
- Synced with backend and cleared

---

## Important Notes

1. **Native Alarms vs Notifications:**
   - Native alarms (Android) are more reliable for critical reminders
   - Work even when app is killed
   - Full-screen guaranteed
   - Notifications are fallback for iOS or when native module unavailable

2. **Audio Playback:**
   - Voice messages downloaded during sync
   - Stored locally: `FileSystem.documentDirectory/voice-messages/`
   - Played via foreground service to ensure reliability

3. **Snooze Limitation:**
   - Previously limited to once per day (removed in latest version)
   - Now allows unlimited snoozes
   - Each snooze creates new alarm with unique ID

4. **Offline Support:**
   - All actions work offline
   - Queued for sync when online
   - No data loss

5. **Lock Screen:**
   - Alarm shows over lock screen
   - Cannot be dismissed easily
   - Critical for medication compliance

---

## File Locations Reference

- **React Native Alarm Screen:** `app/(patient)/medication-alarm.tsx`
- **Alarm Hook:** `features/patient/hooks/useMedicationAlarm.ts`
- **Local Reminder Service:** `shared/services/localReminderService.ts`
- **Alarm Service Bridge:** `shared/services/alarmService.ts`
- **Android Alarm Module:** `android/app/src/main/java/com/safeabd/medicarealarm/MedicationAlarmModule.kt`
- **Android Alarm Receiver:** `android/app/src/main/java/com/safeabd/medicarealarm/AlarmReceiver.kt`
- **Android Alarm Activity:** `android/app/src/main/java/com/safeabd/medicarealarm/AlarmActivity.kt`
- **Android Alarm Service:** `android/app/src/main/java/com/safeabd/medicarealarm/AlarmService.kt`
- **Android Layout:** `android/app/src/main/res/layout/activity_alarm.xml`

---

## Conclusion

The medication alarm system is a multi-layered architecture that ensures reliable medication reminders even when the app is closed or the device is locked. It combines native Android capabilities with React Native for a seamless user experience, with robust offline support and synchronization mechanisms.


