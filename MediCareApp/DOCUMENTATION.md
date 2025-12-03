# 📱 MediCare+ Application Documentation

## Complete Technical & Functional Report

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles](#3-user-roles)
4. [Authentication System](#4-authentication-system)
5. [Patient Features](#5-patient-features)
6. [Doctor/Tutor Features](#6-doctortutor-features)
7. [Native Alarm System](#7-native-alarm-system)
8. [Voice Message System](#8-voice-message-system)
9. [Offline Mode](#9-offline-mode)
10. [Technical Requirements](#10-technical-requirements)
11. [Security Features](#11-security-features)
12. [API Endpoints](#12-api-endpoints)

---

## 1. Overview

### 1.1 Application Description

**MediCare+** is a comprehensive medication management mobile application designed specifically for elderly patients and their caregivers. The application ensures medication adherence through intelligent reminders, voice messages from healthcare providers, and a full-screen alarm system similar to prayer reminder apps.

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| 🔔 **Smart Reminders** | Automated medication reminders with customizable schedules |
| 🎙️ **Voice Messages** | Doctors can record personalized voice instructions |
| 📱 **Full-Screen Alarms** | Native Android alarms that work over lock screen |
| 👥 **Multi-Role System** | Support for patients, doctors, and tutors/caregivers |
| 📊 **Adherence Tracking** | Real-time medication adherence statistics |
| 🔒 **Secure Authentication** | JWT-based authentication with SMS verification |
| 📴 **Offline Support** | Local reminder scheduling when offline |

### 1.3 Target Users

- **Elderly Patients**: Simple interface for medication tracking
- **Doctors**: Patient management and prescription creation
- **Tutors/Caregivers**: Monitor and assist patients with medications

---

## 2. System Architecture

### 2.1 Technology Stack

#### Frontend (Mobile App)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **UI Components**: Custom components with Linear Gradients
- **Navigation**: Expo Router
- **State Management**: React Hooks + AsyncStorage

#### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **SMS Service**: Twilio Integration

#### Native Modules (Android)
- **Language**: Kotlin
- **Components**: AlarmManager, BroadcastReceiver, Foreground Service
- **Audio**: MediaPlayer with USAGE_ALARM

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MediCare+ App                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Patient   │  │   Doctor    │  │    Tutor/Caregiver      │  │
│  │  Dashboard  │  │  Dashboard  │  │      Dashboard          │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                   React Native Core                        │  │
│  │  • Expo Router  • AsyncStorage  • Notifications           │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │              Native Alarm Module (Android)                 │  │
│  │  • AlarmManager  • BroadcastReceiver  • MediaPlayer       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS/REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Auth     │  │ Prescription│  │     Reminder            │  │
│  │   Service   │  │   Service   │  │     Generator           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │                PostgreSQL Database                         │  │
│  │  • Users  • Prescriptions  • Reminders  • VoiceMessages   │  │
│  └───────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles

### 3.1 Patient Role

**Description**: End users who need to take medications according to their prescriptions.

**Capabilities**:
- View daily medication schedule
- Receive medication reminders with voice messages
- Confirm medication intake
- View adherence history and statistics
- Update profile information

**Color Theme**: 🟢 Green (#10B981)

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT PATIENT DASHBOARD        │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/patient-       │
│           dashboard.png              │
│                                      │
└──────────────────────────────────────┘
```

### 3.2 Doctor Role

**Description**: Healthcare professionals who manage patients and create prescriptions.

**Capabilities**:
- Add and manage patients
- Create prescriptions with schedules
- Record voice messages for medications
- Monitor patient adherence rates
- View medication alerts for missed doses
- Access patient profiles and history

**Color Theme**: 🔵 Blue (#4facfe)

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT DOCTOR DASHBOARD         │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/doctor-        │
│           dashboard.png              │
│                                      │
└──────────────────────────────────────┘
```

### 3.3 Tutor/Caregiver Role

**Description**: Family members or caregivers who assist patients with medication management.

**Capabilities**:
- Same as Doctor role
- Monitor multiple patients
- Receive alerts for missed medications
- Add prescriptions for assigned patients
- Record voice reminders

**Color Theme**: 🔵 Blue (#4facfe)

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT TUTOR DASHBOARD          │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/tutor-         │
│           dashboard.png              │
│                                      │
└──────────────────────────────────────┘
```

---

## 4. Authentication System

### 4.1 Login Flow

The application supports authentication via email/password with optional SMS verification.

**Login Process**:
1. User enters email and password
2. Backend validates credentials
3. JWT token generated and returned
4. Token stored in AsyncStorage
5. User redirected to role-specific dashboard

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT LOGIN SCREEN             │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/login.png      │
│                                      │
└──────────────────────────────────────┘
```

### 4.2 Registration Flow

**Registration Process**:
1. User selects role (Patient/Doctor/Tutor)
2. Fills registration form with personal details
3. Phone number verification via SMS
4. Account created and verified
5. Automatic login after verification

**Required Fields**:
| Field | Validation |
|-------|------------|
| First Name | Required, min 2 characters |
| Last Name | Required, min 2 characters |
| Email | Valid email format |
| Phone Number | Valid format with country code |
| Password | Min 8 characters |
| Date of Birth | Required for patients |

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT REGISTRATION SCREEN      │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/register.png   │
│                                      │
└──────────────────────────────────────┘
```

### 4.3 Password Recovery

**Recovery Process**:
1. User enters email or phone number
2. Verification code sent via SMS/Email
3. User enters 6-digit code
4. Code verified by backend
5. User sets new password

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT FORGOT PASSWORD          │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/forgot-        │
│           password.png               │
│                                      │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT VERIFICATION CODE        │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/verify-        │
│           code.png                   │
│                                      │
└──────────────────────────────────────┘
```

---

## 5. Patient Features

### 5.1 Patient Dashboard

The patient dashboard provides a clear overview of daily medications and adherence statistics.

**Features**:
- **Date Selector**: Navigate between days to view medications
- **Statistics Cards**: Total medications, taken count, adherence rate
- **Medication List**: Cards showing each medication with status
- **Quick Actions**: Confirm medication taken with one tap
- **Offline Indicator**: Shows when operating in offline mode

**Medication Status Colors**:
| Status | Color | Description |
|--------|-------|-------------|
| Pending | 🔵 Blue | Medication scheduled for later |
| Taken | 🟢 Green | Medication confirmed as taken |
| Missed | 🔴 Red | Medication time passed without confirmation |
| Scheduled | ⚪ Gray | Future medication |

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT PATIENT DASHBOARD        │
│       WITH MEDICATIONS               │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/patient-       │
│           medications.png            │
│                                      │
└──────────────────────────────────────┘
```

### 5.2 Medication Confirmation

**Confirmation Rules**:
- Can only confirm within **15 minutes** before or after scheduled time
- Cannot confirm already taken medications
- Confirmation synced to server when online
- Queued for sync when offline

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT MEDICATION CONFIRM       │
│          MODAL SCREENSHOT HERE]      │
│                                      │
│     File: screenshots/confirm-       │
│           medication.png             │
│                                      │
└──────────────────────────────────────┘
```

### 5.3 Patient Profile

**Profile Features**:
- View personal information
- Edit profile details
- View adherence history
- Privacy policy and terms
- Logout functionality

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT PATIENT PROFILE          │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/patient-       │
│           profile.png                │
│                                      │
└──────────────────────────────────────┘
```

---

## 6. Doctor/Tutor Features

### 6.1 Doctor Dashboard

The doctor dashboard provides an overview of all patients and medication alerts.

**Dashboard Components**:
- **Statistics Cards**: Total patients, active alerts count
- **Patient List**: All assigned patients with adherence rates
- **Search Functionality**: Filter patients by name
- **Quick Actions**: View patient profile, add prescription

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT DOCTOR DASHBOARD         │
│       FULL VIEW SCREENSHOT HERE]     │
│                                      │
│     File: screenshots/doctor-        │
│           dashboard-full.png         │
│                                      │
└──────────────────────────────────────┘
```

### 6.2 Patient Management

#### Adding a New Patient

**Process**:
1. Click "+" button on dashboard
2. Fill patient details form
3. Patient receives SMS with login credentials
4. Patient can now log in to their account

**Required Information**:
- First Name, Last Name
- Phone Number (for SMS login)
- Email (optional)
- Date of Birth

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT ADD PATIENT              │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/add-           │
│           patient.png                │
│                                      │
└──────────────────────────────────────┘
```

#### Patient Profile View

**Information Displayed**:
- Patient personal details
- Active prescriptions list
- Voice messages for patient
- Adherence statistics
- Medication history

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT PATIENT PROFILE          │
│       (DOCTOR VIEW) SCREENSHOT]      │
│                                      │
│     File: screenshots/patient-       │
│           profile-doctor.png         │
│                                      │
└──────────────────────────────────────┘
```

### 6.3 Prescription Management

#### Creating a Prescription

**Prescription Form Fields**:
| Field | Description | Required |
|-------|-------------|----------|
| Medication Name | Search from database or enter custom | ✅ |
| Dosage | Amount and unit (e.g., "500mg") | ✅ |
| Instructions | Special instructions | ❌ |
| Schedule | Days and times for medication | ✅ |
| Voice Message | Recorded voice reminder | ❌ |
| Chronic/Temporary | Long-term or limited duration | ✅ |

**Schedule Configuration**:
- Select days of the week
- Add multiple times per day
- Set repeat frequency (weekly)

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT ADD PRESCRIPTION         │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/add-           │
│           prescription.png           │
│                                      │
└──────────────────────────────────────┘
```

### 6.4 Medication Alerts

**Alert Types**:
- **Missed Medication**: Patient didn't confirm within time window
- **No Response**: Multiple missed medications
- **Adherence Drop**: Significant decrease in adherence rate

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT MEDICATION ALERTS        │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/alerts.png     │
│                                      │
└──────────────────────────────────────┘
```

---

## 7. Native Alarm System

### 7.1 Overview

The native alarm system is a custom Android implementation that provides full-screen alarm functionality similar to Islamic prayer (Adhan) apps. This ensures that medication reminders are impossible to miss.

### 7.2 Key Components

#### AlarmReceiver (BroadcastReceiver)
- Receives alarm triggers from Android AlarmManager
- Wakes up device with FULL_WAKE_LOCK
- Starts foreground service and alarm activity

#### AlarmService (Foreground Service)
- Runs in foreground with notification
- Plays audio (voice message or default alarm)
- Handles vibration
- Required for Android 10+ background restrictions

#### AlarmActivity (Full-Screen Activity)
- Displays over lock screen
- Shows medication name and dosage
- Plays doctor's voice message
- Confirm and Snooze buttons

### 7.3 Alarm Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ALARM TRIGGER FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AlarmManager triggers at scheduled time                    │
│                    │                                            │
│                    ▼                                            │
│  2. AlarmReceiver receives broadcast                           │
│                    │                                            │
│                    ├──► Acquire WAKE_LOCK (turn on screen)     │
│                    │                                            │
│                    ▼                                            │
│  3. Start AlarmService (foreground)                            │
│                    │                                            │
│                    ├──► Create notification channel            │
│                    ├──► Start foreground with notification      │
│                    ├──► Play audio (voice message or default)   │
│                    │                                            │
│                    ▼                                            │
│  4. Launch AlarmActivity                                       │
│                    │                                            │
│                    ├──► Show over lock screen                   │
│                    ├──► Display medication info                 │
│                    ├──► Start vibration                         │
│                    │                                            │
│                    ▼                                            │
│  5. User Action                                                │
│                    │                                            │
│          ┌────────┴────────┐                                   │
│          │                 │                                    │
│          ▼                 ▼                                    │
│     [CONFIRM]          [SNOOZE]                                │
│          │                 │                                    │
│          ▼                 ▼                                    │
│   Stop alarm &       Reschedule for                            │
│   mark as taken      5 minutes later                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Alarm Activity UI

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT ALARM ACTIVITY           │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/alarm-         │
│           activity.png               │
│                                      │
└──────────────────────────────────────┘
```

**UI Elements**:
- Dark theme background (#1a1a2e)
- Large pill icon with green circle
- Current time display (large font)
- Medication card with name and dosage
- Snooze button (orange, 5 minutes)
- Confirm button (green, "J'AI PRIS")

### 7.5 Required Permissions

| Permission | Purpose |
|------------|---------|
| `SCHEDULE_EXACT_ALARM` | Schedule alarms at exact times |
| `USE_EXACT_ALARM` | Alternative for exact alarms |
| `RECEIVE_BOOT_COMPLETED` | Reschedule alarms after reboot |
| `VIBRATE` | Vibrate device during alarm |
| `WAKE_LOCK` | Keep device awake |
| `FOREGROUND_SERVICE` | Run service in foreground |
| `POST_NOTIFICATIONS` | Show notifications |
| `USE_FULL_SCREEN_INTENT` | Show over lock screen |

### 7.6 Conditions for Alarm to Work

1. **Battery Optimization**: App must be excluded from battery optimization
2. **Notification Permission**: Must be granted (Android 13+)
3. **Exact Alarm Permission**: Must be granted (Android 12+)
4. **Do Not Disturb**: Alarm uses USAGE_ALARM to bypass DND

---

## 8. Voice Message System

### 8.1 Overview

Doctors can record personalized voice messages that play when medication reminders trigger. This is especially helpful for elderly patients who may have difficulty reading.

### 8.2 Recording Voice Messages

**Process**:
1. Doctor opens prescription form or patient profile
2. Taps "Record Voice Message" button
3. Records message (max duration: 2 minutes)
4. Reviews and saves recording
5. Voice message uploaded to server
6. Can be attached to prescriptions

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT VOICE RECORDER           │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/voice-         │
│           recorder.png               │
│                                      │
└──────────────────────────────────────┘
```

### 8.3 Voice Message Playback

**Playback Scenarios**:
1. **During Alarm**: Automatically plays when alarm triggers
2. **Preview**: Doctor/tutor can preview before saving
3. **Patient Profile**: Listed voice messages can be played

### 8.4 Audio File Handling

- **Format**: M4A (AAC codec)
- **Storage**: Local file system + server backup
- **Caching**: Downloaded once, cached locally
- **Path Conversion**: Expo file:// URI converted to native path

---

## 9. Offline Mode

### 9.1 Overview

MediCare+ is designed to work even without internet connectivity, ensuring patients never miss their medications.

### 9.2 Offline Capabilities

| Feature | Offline Support |
|---------|----------------|
| View Medications | ✅ Cached locally |
| Receive Alarms | ✅ Native AlarmManager |
| Confirm Medication | ✅ Queued for sync |
| Voice Playback | ✅ Pre-downloaded audio |
| Add Prescription | ❌ Requires internet |
| Sync with Server | ❌ Requires internet |

### 9.3 Data Synchronization

**Sync Process**:
1. App checks network status on startup
2. If online, fetches latest reminders from server
3. Reminders stored in AsyncStorage
4. Native alarms scheduled using AlarmManager
5. Voice messages downloaded and cached
6. Pending confirmations synced to server

**Screenshot Placeholder**:
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT OFFLINE MODE             │
│       INDICATOR SCREENSHOT]          │
│                                      │
│     File: screenshots/offline-       │
│           mode.png                   │
│                                      │
└──────────────────────────────────────┘
```

---

## 10. Technical Requirements

### 10.1 Mobile App Requirements

#### Android
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Android Version | 8.0 (API 26) | 12.0+ (API 31+) |
| RAM | 2 GB | 4 GB+ |
| Storage | 100 MB | 200 MB+ |
| Permissions | See Section 7.5 | All granted |

#### iOS (Limited Support)
| Requirement | Minimum |
|-------------|---------|
| iOS Version | 13.0+ |
| Note | Native alarm not available, uses notifications |

### 10.2 Backend Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | v18 or higher |
| PostgreSQL | v14 or higher |
| Memory | 512 MB minimum |
| Storage | 10 GB for voice messages |

### 10.3 Network Requirements

| Type | Requirement |
|------|-------------|
| Initial Sync | Internet required |
| Daily Operation | Can work offline |
| Voice Download | 3G/4G or WiFi recommended |

---

## 11. Security Features

### 11.1 Authentication Security

- **JWT Tokens**: Secure token-based authentication
- **Token Expiry**: 24-hour expiration
- **Password Hashing**: bcrypt with salt rounds
- **SMS Verification**: Two-factor for sensitive operations

### 11.2 Data Protection

- **HTTPS**: All API communications encrypted
- **Local Storage**: Sensitive data in SecureStore
- **Database**: PostgreSQL with encrypted connections
- **Voice Messages**: Stored with unique identifiers

### 11.3 Privacy Features

- **Data Minimization**: Only essential data collected
- **Consent**: Explicit consent for data processing
- **Right to Delete**: Account deletion available
- **GDPR Compliant**: European privacy standards

---

## 12. API Endpoints

### 12.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/verify-code` | Verify SMS code |
| POST | `/api/auth/reset-password` | Set new password |

### 12.2 Patient Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patient/medications` | Get medications for date |
| POST | `/api/patient/confirm` | Confirm medication taken |
| GET | `/api/patient/adherence` | Get adherence statistics |
| GET | `/api/patient/profile` | Get patient profile |
| PUT | `/api/patient/profile` | Update patient profile |

### 12.3 Doctor/Tutor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/dashboard` | Get dashboard data |
| GET | `/api/doctor/patients` | Get all patients |
| POST | `/api/doctor/patients` | Add new patient |
| GET | `/api/doctor/patients/:id` | Get patient details |
| POST | `/api/doctor/prescriptions` | Create prescription |
| GET | `/api/tutor/dashboard` | Get tutor dashboard |
| GET | `/api/tutor/alerts` | Get medication alerts |

### 12.4 Voice Message Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/upload` | Upload audio file |
| POST | `/api/voice/create` | Create voice message |
| GET | `/api/voice/patient/:id` | Get patient's voice messages |
| DELETE | `/api/voice/:id` | Delete voice message |

---

## 13. Installation & Setup

### 13.1 Development Setup

```bash
# Clone repository
git clone https://github.com/Adem-abderrazek/MedicareApp.git

# Install dependencies
cd MedicareApp
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npx expo start

# Run on Android
npx expo run:android
```

### 13.2 Backend Setup

```bash
# Navigate to backend
cd med

# Install dependencies
npm install

# Configure database
# Edit .env with PostgreSQL connection string

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

### 13.3 Production Build

```bash
# Generate Android APK
eas build --platform android --profile production

# Generate iOS build
eas build --platform ios --profile production
```

---

## 14. Troubleshooting

### 14.1 Common Issues

| Issue | Solution |
|-------|----------|
| Alarms not triggering | Check battery optimization settings |
| No sound on alarm | Ensure Do Not Disturb allows alarms |
| Voice not playing | Check audio file download completed |
| Sync failing | Verify internet connection and server status |
| Login failing | Check email/password, try password reset |

### 14.2 Debug Mode

Enable debug logging by:
1. Open app settings
2. Enable "Developer Mode"
3. Check logs in Metro bundler

---

## 15. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial release |
| 1.1.0 | Dec 2024 | Added native alarm system |
| 1.2.0 | Dec 2024 | Voice message support |
| 1.3.0 | Dec 2024 | Offline mode + UI improvements |

---

## 16. Screenshots Gallery

### Landing Page
```
┌──────────────────────────────────────┐
│                                      │
│     [INSERT LANDING PAGE             │
│          SCREENSHOT HERE]            │
│                                      │
│     File: screenshots/landing.png    │
│                                      │
└──────────────────────────────────────┘
```

### Full Application Flow
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Landing │───►│  Login  │───►│Dashboard│───►│ Profile │
│  Page   │    │  Screen │    │  Screen │    │  Screen │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │
     ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│Register │───►│ Verify  │───►│Dashboard│
│ Screen  │    │  Code   │    │  Screen │
└─────────┘    └─────────┘    └─────────┘
```

---

## 17. Contact & Support

**Development Team**: MediCare+ Team

**Repository**: https://github.com/Adem-abderrazek/MedicareApp

**Backend Repository**: https://github.com/Adem-abderrazek/med

---

*Document Version: 1.0*
*Last Updated: December 2024*
*© 2024 MediCare+ - All Rights Reserved*


