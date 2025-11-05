# Unavailability Request System - Implementation Guide

## ✅ System Overview

The unavailability request system allows nurses to submit time-off requests, which are reviewed by administrators and then **automatically enforced as hard constraints** during schedule generation.

---

## 🔄 Complete Workflow

### 1. **Nurse Submits Request**
   - Nurse logs into their dashboard
   - Clicks "Request Time Off" tab
   - Selects unavailable dates and shifts (DAY, EVENING, NIGHT)
   - Provides a reason (optional)
   - Sets "Valid Until" date
   - Submits request
   - **Status**: `pending`
   - **Notification**: Admin receives notification

### 2. **Admin Reviews Request**
   - Admin logs into dashboard
   - Goes to "Requests" tab (replaces old "View Schedule" tab)
   - Views all requests with filters: All, Pending, Approved, Rejected
   - Sees complete details:
     - Nurse name and ID
     - All unavailable dates with shifts
     - Reason provided
     - Submission date
     - Valid until date
     - Priority level

### 3. **Admin Takes Action**
   - **Option A - Approve**:
     - Clicks "Approve Request"
     - Request status changes to `approved`
     - Nurse receives approval notification
     - **Request becomes a hard constraint in scheduling**
   
   - **Option B - Reject**:
     - Clicks "Reject Request"
     - Provides rejection reason (optional)
     - Request status changes to `rejected`
     - Nurse receives rejection notification
     - Request is NOT enforced in scheduling

### 4. **Schedule Generation Enforces Constraints**
   - When admin generates a new schedule:
     1. Algorithm loads all `approved` requests for nurses in the ward
     2. For each date/shift combination, algorithm checks:
        - "Does this nurse have an approved unavailability request?"
        - If YES → Nurse is **excluded** from available candidates
        - If NO → Nurse can be considered for assignment
     3. Algorithm generates schedule avoiding all approved requests
     4. Any violation is flagged as **CRITICAL** in quality report

---

## 🔧 Technical Implementation

### Backend Components

#### 1. **UnavailabilityRequest Model** (`backend/models/UnavailabilityRequest.js`)
```javascript
{
  requestId: String,        // Auto-generated: REQ00001, REQ00002, etc.
  nurseId: ObjectId,        // Reference to Nurse
  nurseName: String,
  nurseCode: String,
  unavailableDates: [{
    date: Date,
    shifts: ['DAY', 'EVENING', 'NIGHT'],
    dateString: String      // YYYY-MM-DD for easy querying
  }],
  reason: String,
  status: 'pending' | 'approved' | 'rejected' | 'expired',
  validFrom: Date,
  validUntil: Date,
  priority: Number (1-5),
  adminResponse: {
    message: String,
    respondedBy: ObjectId,
    respondedAt: Date
  }
}
```

**Key Methods**:
- `isValidForDate(dateString, shiftType)` - Check if request blocks a specific date/shift
- `approve(adminId, message)` - Approve request
- `reject(adminId, message)` - Reject request
- `checkNurseAvailability(nurseId, dateString, shiftType)` - Static method to check if nurse is available

#### 2. **API Endpoints** (`backend/routes/unavailability.js`)
```
GET    /api/unavailability           - Get nurse's own requests
GET    /api/unavailability/all       - Get all requests (admin only)
GET    /api/unavailability/pending   - Get pending requests (admin only)
POST   /api/unavailability           - Submit new request
PATCH  /api/unavailability/:id/approve - Approve request (admin only)
PATCH  /api/unavailability/:id/reject  - Reject request (admin only)
DELETE /api/unavailability/:id       - Delete request
```

#### 3. **Schedule Generation Integration** (`backend/services/NurseSchedulingAlgorithm.js`)

**New Methods Added**:

```javascript
// Load approved requests during initialization
async loadUnavailabilityRequests() {
  // Fetches all approved requests for nurses in ward
  // Stores in this.unavailabilityRequests Map
}

// Check if nurse is blocked by request
isNurseUnavailableDueToRequest(nurse, dateStr, shift) {
  // Returns true if nurse has approved request for date/shift
  // Returns false otherwise
}

// Modified to exclude unavailable nurses
getAvailableNurses(dateStr, shift) {
  // FIRST: Filter out nurses with approved requests
  // THEN: Apply other availability rules
}

// Modified to detect violations
checkAvailabilityViolations(nurseSchedule, nurse) {
  // Checks for UNAVAILABILITY_REQUEST_VIOLATION (CRITICAL)
  // Also checks for general availability violations (HIGH)
}
```

**Constraint Enforcement Flow**:
```
1. initialize() 
   → loadUnavailabilityRequests()
   → Loads approved requests into memory

2. For each generation:
   createRandomIndividual()
   → getAvailableNurses(date, shift)
   → isNurseUnavailableDueToRequest() checks each nurse
   → Only returns nurses WITHOUT blocking requests

3. Evaluation:
   calculateFitness()
   → checkAvailabilityViolations()
   → Flags any violations as CRITICAL
   → Heavily penalizes fitness score
```

### Frontend Components

#### 1. **RequestManagement Component** (`frontend/src/components/RequestManagement.tsx`)

**Features**:
- **Stats Dashboard**: Shows Total, Pending, Approved, Rejected counts
- **Filter Tabs**: View All, Pending, Approved, or Rejected requests
- **Request Cards**: Each shows:
  - Nurse info (name, ID, request ID)
  - Status badge with color coding
  - Reason provided
  - All unavailable dates with shift badges (with icons: Sun/Sunset/Moon)
  - Valid until date
  - Submission date
  - Priority level
  - Admin response (if any)
- **Action Buttons** (for pending requests):
  - Approve Request (green)
  - Reject Request (red with optional reason)
- **Important Notice**: Alerts admin that approved requests are hard constraints

#### 2. **AdminDashboard Update** (`frontend/src/components/AdminDashboard.tsx`)

**Changes Made**:
- Replaced "View Schedule" tab with "Requests" tab
- Imports `RequestManagement` component
- Tab order: Overview → Nurses → Wards → **Requests** → Generate Schedule

#### 3. **NurseDashboard - Request Submission** (`src/components/NurseDashboard.tsx`)

**Features** (already implemented):
- Request Time Off tab
- Date picker for multiple dates
- Shift selector (DAY, EVENING, NIGHT)
- Reason text area
- Valid Until date picker
- Visual validation with red asterisks
- Clear success/error messages
- View submitted requests with status

---

## 🎯 How Constraints Work

### Hard Constraint Definition
A **hard constraint** means:
- ❌ **CANNOT BE VIOLATED** - Algorithm will never assign nurse to blocked shifts
- ✅ **STRICTLY ENFORCED** - Nurse is excluded from candidate pool
- 🚨 **CRITICAL ERROR** - Any violation is flagged as system error

### Why This Matters
1. **Legal Compliance**: Respects approved time-off requests
2. **Staff Satisfaction**: Nurses trust the system honors their requests
3. **Quality Assurance**: Schedule quality metrics include constraint violations
4. **Audit Trail**: All approvals/rejections are logged with timestamps

### Constraint Priority
```
Priority Order (Highest to Lowest):
1. Approved Unavailability Requests (CRITICAL - Hard Constraint)
2. Nurse Availability Preferences (HIGH - Soft Constraint)
3. Preferred/Available Shifts (MEDIUM - Optimization Goal)
4. Workload Distribution (LOW - Fairness Goal)
```

---

## 📊 Database Schema

### Collections Used
1. **unavailabilityrequests**
   - Stores all requests (pending, approved, rejected, expired)
   - Indexed on: nurseId, status, validUntil, dateString

2. **notifications**
   - Tracks all notifications sent about requests
   - Types: AVAILABILITY_REQUEST, AVAILABILITY_RESPONSE

3. **schedules**
   - Generated schedules with constraint violation reports
   - Quality metrics include unavailability violations

4. **nurses**
   - Basic nurse data including availability preferences

---

## 🧪 Testing the System

### Step-by-Step Test

1. **Submit Request as Nurse**:
   ```
   Login as nurse → Request Time Off tab
   Add date: 2025-11-15
   Select shifts: DAY, EVENING
   Reason: "Doctor's appointment"
   Valid Until: 2025-12-31
   Submit
   ```

2. **Approve Request as Admin**:
   ```
   Login as admin → Requests tab
   Find the pending request
   Click "Approve Request"
   Verify status changes to "Approved"
   ```

3. **Generate Schedule**:
   ```
   Admin Dashboard → Generate Schedule tab
   Select ward containing the nurse
   Set date range including 2025-11-15
   Click "Generate Schedule"
   ```

4. **Verify Constraint**:
   ```
   Check generated schedule
   Look for 2025-11-15
   Verify nurse is NOT assigned to DAY or EVENING shifts
   Nurse may still be assigned to NIGHT shift (not blocked)
   ```

5. **Check Quality Report**:
   ```
   View schedule quality metrics
   Constraint violations should be 0
   If violations exist, they're flagged as CRITICAL
   ```

---

## 🔍 Debugging

### Check If Requests Are Loading
```javascript
// In NurseSchedulingAlgorithm.js, check console output:
"Loaded X approved unavailability requests as hard constraints"
"Unavailability constraints loaded for Y nurses"
```

### Check If Constraints Are Being Enforced
```javascript
// Add logging in getAvailableNurses():
console.log(`Checking nurse ${nurse.name} for ${dateStr} ${shift}`);
console.log(`Is unavailable: ${this.isNurseUnavailableDueToRequest(nurse, dateStr, shift)}`);
```

### Common Issues

**Issue**: Nurse still assigned despite approved request
- **Check**: Is request status actually 'approved'?
- **Check**: Are dates formatted correctly (YYYY-MM-DD)?
- **Check**: Does validUntil date cover the schedule period?
- **Check**: Are shifts spelled correctly (DAY, EVENING, NIGHT)?

**Issue**: Requests not showing in admin dashboard
- **Check**: Is backend server running?
- **Check**: Does admin auth token have proper permissions?
- **Check**: Check browser console for API errors
- **Check**: MongoDB connection successful?

---

## 📝 Summary of Changes Made

### Files Created
1. ✅ `frontend/src/components/RequestManagement.tsx` - Admin request management UI
2. ✅ `UNAVAILABILITY_REQUEST_SYSTEM.md` - This documentation

### Files Modified
1. ✅ `backend/services/NurseSchedulingAlgorithm.js`
   - Added UnavailabilityRequest import
   - Added loadUnavailabilityRequests() method
   - Added isNurseUnavailableDueToRequest() method
   - Modified getAvailableNurses() to check requests first
   - Modified checkAvailabilityViolations() to detect request violations
   - Added comprehensive documentation comments

2. ✅ `backend/routes/unavailability.js`
   - Added GET /api/unavailability/all endpoint for admin

3. ✅ `frontend/src/components/AdminDashboard.tsx`
   - Imported RequestManagement component
   - Replaced "View Schedule" tab with "Requests" tab
   - Updated tab layout to 5 tabs

4. ✅ `backend/models/UnavailabilityRequest.js` (previously fixed)
   - Changed requestId from required:true to required:false
   - Enhanced pre-save middleware with isNew check

---

## 🚀 Next Steps (Optional Enhancements)

### 1. Email Notifications
- Send email when request is approved/rejected
- Reminder emails for expiring requests

### 2. Recurring Requests
- Allow nurses to set recurring unavailability (e.g., every Monday)
- Automatic renewal of periodic requests

### 3. Request Analytics
- Dashboard showing request patterns
- Most common unavailable days/shifts
- Request approval rates per nurse

### 4. Conflict Detection
- Warn admin if approving request creates staffing shortage
- Suggest alternative dates/shifts
- Show ward coverage impact before approval

### 5. Mobile App Integration
- Push notifications for request status
- Quick approve/reject from mobile
- Calendar view of all requests

---

## ✅ System Status

**Current Implementation**: ✅ COMPLETE and OPERATIONAL

- ✅ Nurses can submit requests with multiple dates/shifts
- ✅ Admins can view all requests with filtering
- ✅ Admins can approve/reject with messages
- ✅ Approved requests are loaded during schedule initialization
- ✅ Algorithm excludes unavailable nurses from assignment
- ✅ Violations are tracked and reported as CRITICAL
- ✅ Notifications sent to both nurses and admins
- ✅ Full audit trail with timestamps
- ✅ Backend server running with all changes

**Test the system now**:
1. Login as nurse, submit a request
2. Login as admin, approve it in Requests tab
3. Generate a schedule covering those dates
4. Verify the nurse is not assigned to blocked shifts

---

## 📞 Support

If you encounter any issues:
1. Check console logs in both frontend and backend
2. Verify MongoDB is running and connected
3. Check browser Network tab for API errors
4. Review this documentation for proper workflow
5. Check backend terminal output for error messages

The system is now fully operational and treating approved unavailability requests as hard constraints! 🎉
