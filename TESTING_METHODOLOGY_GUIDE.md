# Testing Methodology Guide for MediCare App

## Overview
This guide provides a systematic approach to test all features of the MediCare application frontend-to-backend with the new backend implementation.

## Prerequisites

### Before Starting Tests
1. **Backend Server**: Ensure MedBack server is running on `http://192.168.137.36:5000` (or configured port)
   - Check: `http://localhost:5000` should return API status
   - Verify database connection is active
   
2. **Frontend App**: Ensure MedicareApp is configured and running
   - Verify API URL in `MedicareApp/config/api.ts` matches backend URL
   - Check app.json has correct `EXPO_PUBLIC_API_URL`
   
3. **Test Accounts**: Prepare test accounts for each user type:
   - Patient account (email/phone + password)
   - Doctor account (email/phone + password)
   - Tutor account (email/phone + password)

4. **Tools Needed**:
   - Postman/Insomnia for API testing (optional)
   - Browser DevTools or React Native Debugger
   - Network monitor enabled

## Testing Structure

### Phase 1: Authentication & User Management
### Phase 2: Patient Features
### Phase 3: Doctor/Tutor Features
### Phase 4: Common Features
### Phase 5: Edge Cases & Error Handling

---

## Phase 1: Authentication & User Management

### 1.1 Registration

**Test Cases:**

#### TC-1.1.1: Patient Registration
1. Navigate to Register screen
2. Select "Patient" role
3. Fill in:
   - Email: `testpatient@example.com`
   - Password: `Test123!@#`
   - First Name: `Test`
   - Last Name: `Patient`
   - Phone Number: `+1234567890`
4. Submit registration
5. **Expected**: Success message, redirected to appropriate screen or verification

**Check:**
- [ ] Registration completes successfully
- [ ] User token is stored in AsyncStorage
- [ ] User data is stored correctly
- [ ] API call: `POST /api/auth/register` returns success
- [ ] Response contains user object with correct userType

#### TC-1.1.2: Doctor Registration
- Repeat TC-1.1.1 with role "Doctor"
- Verify userType is "medecin"

#### TC-1.1.3: Tutor Registration
- Repeat TC-1.1.1 with role "Tutor"
- Verify userType is "tuteur"

#### TC-1.1.4: Registration Validation
- Test empty fields
- Test invalid email format
- Test weak password
- Test duplicate email/phone
- **Expected**: Appropriate error messages

#### TC-1.1.5: International Phone Numbers
- Test registration with French number: `+33612345678`
- Test registration with Tunisian number: `+216612345678`
- Test registration with US number: `+11234567890`
- Test registration with different formats of same number
- **Expected**: All international numbers accepted and normalized correctly

### 1.2 Login

**Test Cases:**

#### TC-1.2.1: Login with Email
1. Navigate to Login screen
2. Enter registered email and password
3. Submit
4. **Expected**: 
   - Success
   - Token stored
   - Redirect to appropriate dashboard (patient → patient-dashboard, doctor/tutor → doctor-dashboard)

**Check:**
- [ ] API call: `POST /api/auth/login` returns token
- [ ] Token is valid JWT
- [ ] User data includes correct userType
- [ ] Push token is registered (if device)
- [ ] Redirect navigation works correctly

#### TC-1.2.2: Login with Phone Number
- Repeat TC-1.2.1 using phone number instead of email
- Verify both email and phone login work
- Test login with different phone formats (with/without +, with/without country code)
- **Expected**: Login works with any valid format of the registered phone number

#### TC-1.2.3: Login Validation
- Test wrong password
- Test non-existent user
- Test empty fields
- **Expected**: Clear error messages

#### TC-1.2.4: Auto-login (Token Persistence)
1. Close app completely
2. Reopen app
3. **Expected**: Automatically logged in if valid token exists
4. Check landing page redirects if authenticated

### 1.3 Password Reset Flow

**Test Cases:**

#### TC-1.3.1: Request Password Reset
1. Navigate to Forgot Password screen
2. Enter registered phone number
3. Submit
4. **Expected**: Verification code sent message

**Check:**
- [ ] API call: `POST /api/auth/send-verification-code` succeeds
- [ ] Code received (check logs/backend)
- [ ] User redirected to verify-code screen

#### TC-1.3.2: Verify Reset Code
1. Enter verification code received
2. Submit
3. **Expected**: Code verified, proceed to reset password

**Check:**
- [ ] API call: `POST /api/auth/verify-code` succeeds
- [ ] Navigate to reset-password screen

#### TC-1.3.3: Reset Password
1. Enter new password
2. Confirm new password
3. Submit
4. **Expected**: Password reset successfully

**Check:**
- [ ] API call: `POST /api/auth/reset-password-with-code` succeeds
- [ ] Can login with new password
- [ ] Cannot login with old password

### 1.4 Logout

**Test Cases:**

#### TC-1.4.1: Logout Functionality
1. While logged in, find logout button/menu
2. Click logout
3. **Expected**: 
   - Token cleared from storage
   - Session invalidated on backend
   - Redirected to landing/login screen

**Check:**
- [ ] API call: `POST /api/auth/logout` succeeds (if implemented)
- [ ] AsyncStorage cleared
- [ ] Cannot access protected routes after logout

---

## Phase 2: Patient Features

### 2.1 Patient Dashboard

**Test Cases:**

#### TC-2.1.1: Load Dashboard Data
1. Login as patient
2. Navigate to patient-dashboard
3. **Expected**: Dashboard loads with medication data

**Check:**
- [ ] API call: `GET /api/patient/dashboard` (or equivalent)
- [ ] Shows today's medications
- [ ] Shows medication count statistics
- [ ] Date picker shows correct date range (7 past, today, 6 future)
- [ ] Loading states work correctly
- [ ] Error handling if API fails

#### TC-2.1.2: View Medications by Date
1. On patient dashboard
2. Select different dates using date picker
3. **Expected**: Medications update for selected date

**Check:**
- [ ] API call: `GET /api/patient/medications/by-date?date=YYYY-MM-DD`
- [ ] Medications displayed correctly
- [ ] Empty state shown when no medications
- [ ] Medication details (name, dosage, time) correct

#### TC-2.1.3: Medication Statistics
- Verify adherence rate calculation
- Verify "taken today" count
- Verify total medications today count
- **Expected**: Statistics match actual medication data

### 2.2 Medication Reminders & Actions

**Test Cases:**

#### TC-2.2.1: Confirm Medication Taken
1. On patient dashboard, find a medication reminder
2. Click "Taken" or confirm button
3. **Expected**: Medication marked as taken

**Check:**
- [ ] API call: `POST /api/patient/reminders/confirm` with reminderIds array
- [ ] Medication status updates in UI
- [ ] Statistics update (taken count increases)
- [ ] Works for multiple medications at once

#### TC-2.2.2: Snooze Medication
1. On patient dashboard, find a medication reminder
2. Click "Snooze" button
3. **Expected**: Medication snoozed (if implemented)

**Check:**
- [ ] API call: `POST /api/patient/reminders/snooze` with reminderIds array
- [ ] Reminder reappears after snooze period
- [ ] UI updates correctly

#### TC-2.2.3: Medication Alarm Screen
1. Trigger medication reminder (or navigate manually)
2. Open medication-alarm screen
3. **Expected**: Shows medication details and actions

**Check:**
- [ ] Medication name displayed
- [ ] Dosage information shown
- [ ] Instructions displayed
- [ ] Confirm and snooze buttons work
- [ ] Navigation works correctly

### 2.3 Patient Profile

**Test Cases:**

#### TC-2.3.1: View Patient Profile
1. Navigate to patient-profile screen
2. **Expected**: Profile information displayed

**Check:**
- [ ] API call: `GET /api/patient/profile`
- [ ] Shows name, email, phone
- [ ] Shows medication list
- [ ] Shows statistics

#### TC-2.3.2: Edit Patient Profile
1. Navigate to patient-edit-profile or patient-profile-settings
2. Modify profile fields (name, phone, etc.)
3. Save changes
4. **Expected**: Profile updated successfully

**Check:**
- [ ] API call: `PUT /api/user/profile` or `PUT /api/patient/profile`
- [ ] Changes saved correctly
- [ ] UI reflects changes immediately
- [ ] Validation works (required fields, formats)

#### TC-2.3.3: Patient Adherence History
1. Navigate to patient-adherence-history screen
2. **Expected**: Adherence data displayed

**Check:**
- [ ] API call: `GET /api/tutor/patients/:patientId/adherence-history?days=30` (as caregiver) OR appropriate patient endpoint
- [ ] Shows historical adherence data
- [ ] Date range selection works
- [ ] Charts/graphs render correctly (if implemented)

### 2.4 Offline Functionality & Sync

**Test Cases:**

#### TC-2.4.1: Check for Updates
1. While online, trigger sync/update check
2. **Expected**: Updates fetched if available

**Check:**
- [ ] API call: `GET /api/patient/check-updates?lastSync=timestamp`
- [ ] Returns updates flag
- [ ] Handles no updates case

#### TC-2.4.2: Sync Offline Actions
1. Perform actions while offline (confirm medication)
2. Go online
3. Trigger sync
4. **Expected**: Offline actions synced to backend

**Check:**
- [ ] API call: `POST /api/patient/reminders/sync-offline`
- [ ] Actions array sent correctly
- [ ] Backend processes all actions
- [ ] UI updates reflect synced data

#### TC-2.4.3: Get Upcoming Reminders (Offline Sync)
1. While online, fetch upcoming reminders
2. **Expected**: Reminders cached for offline use

**Check:**
- [ ] API call: `GET /api/patient/reminders/upcoming?days=30`
- [ ] Returns array of upcoming reminders
- [ ] Data stored locally
- [ ] Used when offline

---

## Phase 3: Doctor/Tutor Features

### 3.1 Doctor/Tutor Dashboard

**Test Cases:**

#### TC-3.1.1: Load Doctor Dashboard
1. Login as doctor
2. Navigate to doctor-dashboard
3. **Expected**: Dashboard with patient list and statistics

**Check:**
- [ ] API call: `GET /api/medecin/dashboard` or `GET /api/tutor/dashboard`
- [ ] Shows patient list
- [ ] Shows statistics (total patients, alerts, etc.)
- [ ] Loading states work
- [ ] Refresh functionality works

#### TC-3.1.2: Dashboard Statistics
- Verify patient count
- Verify medication alerts
- Verify nearest medication times
- **Expected**: Statistics are accurate

### 3.2 Patient Management

**Test Cases:**

#### TC-3.2.1: Get All Patients
1. On doctor dashboard
2. View patient list
3. **Expected**: All linked patients displayed

**Check:**
- [ ] API call: `GET /api/medecin/patients` or `GET /api/tutor/patients`
- [ ] Patient list loads correctly
- [ ] Patient information (name, status) displayed
- [ ] Empty state if no patients

#### TC-3.2.2: Search Patients
1. Use search functionality
2. Enter search query
3. **Expected**: Filtered results

**Check:**
- [ ] API call: `GET /api/medecin/patients/search?q=query` or `GET /api/tutor/patients/search?q=query`
- [ ] Search results accurate
- [ ] Handles no results

#### TC-3.2.3: View Patient Profile
1. Click on a patient from list
2. Navigate to patient profile
3. **Expected**: Patient details displayed

**Check:**
- [ ] API call: `GET /api/medecin/patients/:patientId/profile` or `GET /api/tutor/patients/:patientId/profile`
- [ ] Shows patient info
- [ ] Shows patient medications
- [ ] Shows adherence data

#### TC-3.2.4: Send Patient Invitation
1. Navigate to add-patient screen
2. Fill in patient details (name, phone)
3. Send invitation
4. **Expected**: Invitation sent successfully

**Check:**
- [ ] API call: `POST /api/tutor/patients/invite`
- [ ] SMS/code sent (verify backend logs)
- [ ] Success message shown
- [ ] Patient can accept invitation

#### TC-3.2.5: Delete Patient Relationship
1. On patient profile, find delete/remove option
2. Confirm deletion
3. **Expected**: Relationship deactivated

**Check:**
- [ ] API call: `DELETE /api/medecin/patients/:patientId` or `DELETE /api/tutor/patients/:patientId`
- [ ] Relationship deactivated (not deleted)
- [ ] Patient removed from list
- [ ] Cannot access patient after deletion

### 3.3 Prescription Management

**Test Cases:**

#### TC-3.3.1: Create Prescription
1. Navigate to patient profile
2. Click "Add Prescription" or similar
3. Fill in:
   - Medication name
   - Dosage
   - Instructions
   - Schedule (times and days)
   - Optional: Voice message
4. Submit
5. **Expected**: Prescription created successfully

**Check:**
- [ ] API call: `POST /api/tutor/patients/:patientId/prescriptions` or `POST /api/medecin/patients/:patientId/prescriptions`
- [ ] All fields saved correctly
- [ ] Schedule created with reminders
- [ ] Patient sees new medication
- [ ] Validation works (required fields)

#### TC-3.3.2: Update Prescription
1. Find existing prescription
2. Click edit
3. Modify fields
4. Save
5. **Expected**: Prescription updated

**Check:**
- [ ] API call: `PUT /api/tutor/prescriptions/:prescriptionId` (verify endpoint exists)
- [ ] Changes saved
- [ ] Patient sees updated medication

#### TC-3.3.3: Delete Prescription
1. Find existing prescription
2. Click delete
3. Confirm
4. **Expected**: Prescription deleted

**Check:**
- [ ] API call: `DELETE /api/tutor/prescriptions/:prescriptionId` (verify endpoint exists)
- [ ] Prescription removed
- [ ] Patient no longer sees medication
- [ ] Reminders cancelled

#### TC-3.3.4: View Patient Medications
1. On patient profile
2. View medications list
3. **Expected**: All prescriptions displayed

**Check:**
- [ ] API call: `GET /api/medecin/patients/:patientId/medications` or equivalent
- [ ] Medications list correct
- [ ] Details shown correctly

### 3.4 Voice Messages

**Test Cases:**

#### TC-3.4.1: Upload Voice Message
1. Navigate to voice message feature
2. Record or select audio file
3. Upload
4. **Expected**: Voice message uploaded

**Check:**
- [ ] API call: `POST /api/tutor/voice-messages/upload`
- [ ] File uploaded successfully
- [ ] Returns fileUrl/path
- [ ] Can attach to prescription

#### TC-3.4.2: Create Voice Message
1. After upload, create voice message record
2. Link to patient
3. **Expected**: Voice message created

**Check:**
- [ ] API call: `POST /api/tutor/voice-messages`
- [ ] Message linked to patient
- [ ] Patient can access message

#### TC-3.4.3: View Patient Voice Messages
1. On patient profile
2. View voice messages
3. **Expected**: Messages displayed

**Check:**
- [ ] API call: `GET /api/tutor/patients/:patientId/voice-messages` or `GET /api/tutor/voice-messages?patientId=:id`
- [ ] Messages list correct
- [ ] Can play audio

#### TC-3.4.4: Delete Voice Message
1. Find voice message
2. Delete
3. **Expected**: Message deleted

**Check:**
- [ ] API call: `DELETE /api/tutor/voice-messages/:messageId`
- [ ] Message removed
- [ ] File deleted from server

### 3.5 Adherence Monitoring

**Test Cases:**

#### TC-3.5.1: View Patient Adherence History
1. On patient profile
2. Navigate to adherence history
3. **Expected**: Adherence data displayed

**Check:**
- [ ] API call: `GET /api/tutor/patients/:patientId/adherence-history?days=30`
- [ ] Historical data shown
- [ ] Charts/graphs render
- [ ] Date range works

#### TC-3.5.2: Medication Alerts
1. On dashboard
2. View alerts section
3. **Expected**: Alerts shown (missed medications, etc.)

**Check:**
- [ ] API call: `GET /api/tutor/alerts/medications`
- [ ] Alerts accurate
- [ ] Links to relevant patients

#### TC-3.5.3: Nearest Medications
1. On dashboard
2. View nearest medications widget
3. **Expected**: Patients with upcoming medications shown

**Check:**
- [ ] API call: `GET /api/tutor/patients/nearest-medications`
- [ ] Shows 3 patients (or configured number)
- [ ] Medication times correct

---

## Phase 4: Common Features

### 4.1 User Profile Management

**Test Cases:**

#### TC-4.1.1: Get User Profile (Universal)
1. While logged in (any role)
2. Navigate to profile screen
3. **Expected**: Profile information displayed

**Check:**
- [ ] API call: `GET /api/user/profile` or `GET /api/auth/profile`
- [ ] Profile data correct
- [ ] Works for all user types

#### TC-4.1.2: Update User Profile
1. Navigate to edit profile
2. Update fields
3. Save
4. **Expected**: Profile updated

**Check:**
- [ ] API call: `PUT /api/user/profile`
- [ ] Changes saved
- [ ] All user types can update

### 4.2 Notifications

**Test Cases:**

#### TC-4.2.1: Register Push Token
1. On login or app start
2. **Expected**: Push token registered automatically

**Check:**
- [ ] API call: `POST /api/notifications/register-token` (verify endpoint exists in new backend)
- [ ] Token stored on backend
- [ ] Works on real device

#### TC-4.2.2: Receive Medication Reminders
1. Wait for scheduled medication time
2. **Expected**: Push notification received

**Check:**
- [ ] Notification received
- [ ] Tapping notification opens app
- [ ] Navigates to medication-alarm screen
- [ ] Notification data correct

#### TC-4.2.3: Notification History
1. Navigate to notification history (if implemented)
2. **Expected**: Past notifications listed

**Check:**
- [ ] API call: `GET /api/notifications/history?limit=50`
- [ ] History loads correctly

---

## Phase 5: Edge Cases & Error Handling

### 5.1 Network Errors

**Test Cases:**

#### TC-5.1.1: Offline Handling
1. Disable network
2. Try to perform actions
3. **Expected**: Offline mode activated, actions queued

**Check:**
- [ ] Offline indicator shown
- [ ] Actions stored locally
- [ ] Sync works when back online

#### TC-5.1.2: API Timeout
1. Simulate slow network
2. Make API calls
3. **Expected**: Timeout handled gracefully

**Check:**
- [ ] Timeout errors caught
- [ ] User-friendly error messages
- [ ] Retry mechanism works

#### TC-5.1.3: Server Errors (500, 503)
1. Simulate server errors (or when they occur)
2. **Expected**: Errors handled gracefully

**Check:**
- [ ] Error messages shown
- [ ] App doesn't crash
- [ ] Can retry operations

### 5.2 Authentication Errors

**Test Cases:**

#### TC-5.2.1: Expired Token
1. Wait for token expiration (or manipulate token)
2. Make API call
3. **Expected**: Redirected to login

**Check:**
- [ ] 401 error handled
- [ ] Token cleared
- [ ] Redirected to login

#### TC-5.2.2: Invalid Token
1. Use invalid/malformed token
2. Make API call
3. **Expected**: Authentication error

**Check:**
- [ ] Error handled
- [ ] Clear error message

### 5.3 Data Validation

**Test Cases:**

#### TC-5.3.1: Invalid Input Data
1. Submit forms with invalid data
2. **Expected**: Validation errors shown

**Check:**
- [ ] Frontend validation works
- [ ] Backend validation works
- [ ] Error messages clear

#### TC-5.3.2: Missing Required Fields
1. Submit forms with missing fields
2. **Expected**: Validation errors

**Check:**
- [ ] All required fields validated
- [ ] Cannot submit invalid forms

### 5.4 Permission Errors

**Test Cases:**

#### TC-5.4.1: Unauthorized Access
1. As patient, try to access doctor endpoints
2. **Expected**: Access denied

**Check:**
- [ ] 403 errors handled
- [ ] Cannot access unauthorized features

---

## Issue Reporting Template

When reporting issues found during testing, use this format:

### Issue Report

**Feature**: [e.g., Patient Dashboard, Medication Confirmation]
**Test Case**: [e.g., TC-2.2.1]
**Severity**: [Critical / High / Medium / Low]
**User Role**: [Patient / Doctor / Tutor]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**API Calls Made**:
- Endpoint: `POST /api/patient/reminders/confirm`
- Request Body: `{ "reminderIds": ["123"] }`
- Response Status: `500`
- Response Body: `{ "success": false, "message": "..." }`

**Frontend Error**:
```
[Any console errors or error messages]
```

**Backend Logs**:
```
[Any relevant backend error logs]
```

**Screenshots/Videos**:
[If applicable]

**Additional Notes**:
[Any other relevant information]

---

## Testing Checklist Summary

Use this checklist to track overall progress:

### Authentication
- [ ] Registration (Patient, Doctor, Tutor)
- [ ] Registration with International Phone Numbers
- [ ] Login (Email, Phone)
- [ ] Password Reset Flow
- [ ] Logout
- [ ] Token Persistence

### Patient Features
- [ ] Dashboard Load
- [ ] View Medications by Date
- [ ] Confirm Medication
- [ ] Snooze Medication
- [ ] Medication Alarm Screen
- [ ] Profile View/Edit
- [ ] Adherence History
- [ ] Offline Sync

### Doctor/Tutor Features
- [ ] Dashboard Load
- [ ] Patient List
- [ ] Search Patients
- [ ] Patient Profile
- [ ] Send Invitation
- [ ] Create Prescription
- [ ] Update Prescription
- [ ] Delete Prescription
- [ ] Voice Messages (Upload, Create, View, Delete)
- [ ] Adherence History
- [ ] Medication Alerts

### Common Features
- [ ] User Profile (Get/Update)
- [ ] Push Notifications
- [ ] Notification History

### Error Handling
- [ ] Network Errors
- [ ] Authentication Errors
- [ ] Validation Errors
- [ ] Permission Errors

---

## Testing Tips

1. **Start Fresh**: Clear app data/cache between major test phases
2. **Test Data**: Use consistent test data (same patient names, medications)
3. **Network Tools**: Use network throttling to test offline scenarios
4. **Console Logs**: Enable console logging to see API calls and responses
5. **Backend Logs**: Monitor backend logs for errors
6. **Database State**: Verify database state matches UI state
7. **Cross-User Testing**: Test relationships (doctor → patient interactions)
8. **Real Device**: Test push notifications on real device
9. **Multiple Roles**: Test same features with different user types
10. **International Numbers**: Test with phone numbers from different countries (France, Tunisia, US, etc.)

---

## Next Steps After Testing

1. **Document All Issues**: Use the issue reporting template
2. **Prioritize Issues**: Categorize by severity
3. **Fix Issues**: Address critical and high-priority issues first
4. **Re-test**: After fixes, re-run affected test cases
5. **Regression Testing**: Ensure fixes don't break other features

