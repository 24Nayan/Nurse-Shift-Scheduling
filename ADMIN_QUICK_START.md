# Quick Start Guide - Admin Request Management

## 🎯 How to Access and Use the Request System

### Step 1: Login as Admin
```
Navigate to: http://localhost:3000
Login with admin credentials
```

### Step 2: Go to Requests Tab
```
Admin Dashboard → Click "Requests" tab (4th tab from left)
```

### Step 3: View and Filter Requests
```
You'll see 4 stat cards:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total: X    │ Pending: Y  │ Approved: Z │ Rejected: W │
└─────────────┴─────────────┴─────────────┴─────────────┘

Filter tabs below:
[ All (X) ] [ Pending (Y) ] [ Approved (Z) ] [ Rejected (W) ]
```

### Step 4: Review Request Details
Each request card shows:
```
┌─────────────────────────────────────────────────────────┐
│  👤 Nurse Name (ID: N0001)  Request: REQ00001  [Pending]│
├─────────────────────────────────────────────────────────┤
│  Reason: Doctor's appointment                            │
│                                                           │
│  Unavailable Dates & Shifts:                            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 📅 Nov 15, 2025  │  │ 📅 Nov 16, 2025  │            │
│  │ ☀️ DAY  🌅 EVENING│  │ 🌙 NIGHT         │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                           │
│  Valid Until: Dec 31, 2025                               │
│  Submitted: Nov 2, 2025                                  │
│  Priority: Level 1                                       │
│                                                           │
│  [✓ Approve Request] [✗ Reject Request]                 │
└─────────────────────────────────────────────────────────┘
```

### Step 5: Take Action

**To Approve**:
1. Click "✓ Approve Request" button (green)
2. Confirmation message appears
3. Status changes to "Approved"
4. Nurse receives notification
5. **Request becomes a constraint in scheduling**

**To Reject**:
1. Click "✗ Reject Request" button (red)
2. Popup asks for rejection reason (optional)
3. Enter reason and confirm
4. Status changes to "Rejected"
5. Nurse receives notification with reason

### Step 6: Generate Schedule with Constraints

```
1. Go to "Generate Schedule" tab
2. Select ward
3. Set date range (include dates with approved requests)
4. Click "Generate Schedule"
5. Algorithm will automatically:
   - Load all approved requests
   - Exclude nurses from their requested dates/shifts
   - Generate schedule respecting constraints
   - Report any violations (should be 0)
```

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Administrator Dashboard                      [Logout]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [ Overview ] [ Nurses ] [ Wards ] [★ Requests ] [ Generate ]│
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  ⚠️ Important: Approved requests are automatically treated   │
│  as hard constraints in schedule generation.                 │
│                                                               │
│  ┌─────────┬─────────┬─────────┬─────────┐                 │
│  │ Total   │ Pending │ Approved│ Rejected│                  │
│  │   12    │    5    │    6    │    1    │                  │
│  └─────────┴─────────┴─────────┴─────────┘                 │
│                                                               │
│  [ All (12) ] [ Pending (5) ] [ Approved (6) ] [ Rejected (1) ]
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 👤 Sarah Johnson (N0012)  REQ00005  [🟡 Pending]    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Reason: Family emergency                             │   │
│  │                                                       │   │
│  │ Unavailable Dates:                                   │   │
│  │ 📅 Nov 20, 2025 - ☀️ DAY 🌅 EVENING 🌙 NIGHT       │   │
│  │ 📅 Nov 21, 2025 - ☀️ DAY 🌅 EVENING                 │   │
│  │                                                       │   │
│  │ Valid Until: Dec 15, 2025 • Priority: Level 3       │   │
│  │                                                       │   │
│  │ [✓ Approve Request]  [✗ Reject Request]             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 👤 Michael Chen (N0034)  REQ00006  [🟢 Approved]    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Reason: Vacation                                     │   │
│  │                                                       │   │
│  │ Unavailable Dates:                                   │   │
│  │ 📅 Nov 25-30, 2025 - All shifts                     │   │
│  │                                                       │   │
│  │ Admin Response:                                       │   │
│  │ "Approved. Enjoy your vacation!"                     │   │
│  │                                                       │   │
│  │ ✅ Already enforced in scheduling                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Actions

| Action | Location | Result |
|--------|----------|--------|
| View all requests | Requests tab → "All" filter | See complete request history |
| Review pending | Requests tab → "Pending" filter | Focus on requests needing action |
| Approve request | Request card → Approve button | Request becomes constraint |
| Reject request | Request card → Reject button | Request ignored in scheduling |
| Refresh list | Top right → Refresh button | Reload latest requests |
| Generate schedule | Generate Schedule tab | Creates schedule respecting approved requests |

---

## 🎓 Understanding the Flow

```
NURSE SIDE:                    ADMIN SIDE:                    SYSTEM:
                                                              
Submit Request                                                
    │                                                         
    ├──────────────────────► View in Requests Tab            
    │                              │                          
    │                              │                          
    │                        Review Details                   
    │                              │                          
    │                              │                          
    │                         Approve/Reject                  
    │                              │                          
    │                              │                          
    │◄─────────────────────────────┤                          
Receive Notification               │                          
    │                              │                          
    │                              │                          
    │                              ├──────────────────────► Load as Constraint
    │                              │                              │
    │                              │                              │
    │                         Generate Schedule ────────────► Enforce Constraint
    │                              │                              │
    │                              │                              │
    │                              │◄─────────────────────────────┤
    │                         View Schedule                  No violations
    │                         (Nurse not assigned             (Nurse excluded
    │                          to requested dates)             from those shifts)
```

---

## 🔑 Key Takeaways

1. **Requests Tab** replaces the old "View Schedule" tab
2. **Approved requests** = Hard constraints (cannot be violated)
3. **Rejected requests** = Ignored by scheduling algorithm
4. **Pending requests** = Not yet enforced (need admin action)
5. **System automatically** loads and enforces approved requests
6. **No manual configuration** needed - just approve/reject and generate schedule

---

## 🎯 Success Indicators

✅ You're using it correctly if:
- Approved requests show in the schedule as gaps (nurse not assigned)
- Schedule quality report shows 0 unavailability violations
- Nurses receive notifications after approval/rejection
- Request status updates immediately after admin action
- Schedule generation respects all approved requests

❌ Something's wrong if:
- Nurse assigned to shift they requested off (after approval)
- Requests not visible in admin dashboard
- Actions (approve/reject) not updating status
- Schedule generation fails or produces violations
- Notifications not being sent

---

**Ready to use? Log in as admin and go to the Requests tab!** 🚀
