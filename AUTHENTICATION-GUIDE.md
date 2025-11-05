# 🚀 Quick Start Guide - Nurse Authentication System

## ✅ Prerequisites Checklist

Before starting the application, ensure:

1. **Node.js** is installed (v14 or higher)
2. **MongoDB** is installed
3. **npm** packages are installed in both `backend` and `frontend` folders

## 📋 Step-by-Step Startup Instructions

### Step 1: Start MongoDB

**Option A: Run as Administrator (Easiest)**
1. Right-click `START-MONGODB.bat`
2. Select "Run as administrator"
3. Wait for "MongoDB started successfully!" message

**Option B: Manual Command (As Administrator)**
```bash
net start MongoDB
```

### Step 2: Verify MongoDB is Running

Open Command Prompt and run:
```bash
sc query MongoDB
```

Look for: `STATE : 4 RUNNING`

### Step 3: Start Backend Server

**Option A: Use the batch file**
```bash
cd backend
node server.js
```

**Option B: Using npm**
```bash
cd backend
npm start
```

**Expected Output:**
```
🚀 Server running on port 5000
✅ MongoDB Connected: ...
📱 Frontend URL: http://localhost:3000
```

### Step 4: Start Frontend (In a new terminal)

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

### Step 5: Access the Application

Open your browser and go to: **http://localhost:5173**

---

## 🔐 Authentication System Features

### For Nurses:

1. **First Time Setup (Signup)**
   - Click "Activate Account" tab
   - Enter your Nurse ID (e.g., N0001)
   - Create a password (min 6 characters)
   - Confirm password
   - Click "Activate Account"

2. **Returning Users (Login)**
   - Enter your Nurse ID
   - Enter your password
   - Click "Login"

3. **Dashboard Features**
   - View upcoming shifts
   - Check notifications
   - See shift distribution
   - Update profile
   - Request time off

### For Administrators:

Admins can:
- Generate schedules (automatically sends notifications to nurses)
- Manage nurse records
- Review availability requests
- View all notifications
- Manage wards

---

## 🔧 Troubleshooting

### Problem: "MongoDB connection failed"

**Solution:**
1. Ensure MongoDB service is running
2. Run: `sc query MongoDB`
3. If stopped, run `START-MONGODB.bat` as admin

### Problem: "CORS errors" or "NetworkError"

**Solution:**
1. Ensure backend is running on port 5000
2. Check backend terminal for errors
3. Restart backend server if needed

### Problem: "Port already in use"

**Backend (5000):**
```bash
# Find process using port 5000
netstat -ano | findstr :5000
# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

**Frontend (5173):**
```bash
# Find process using port 5173
netstat -ano | findstr :5173
# Kill the process
taskkill /PID <PID> /F
```

### Problem: "Cannot find module 'bcryptjs'"

**Solution:**
```bash
cd backend
npm install bcryptjs jsonwebtoken
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Activate nurse account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get profile
- `PATCH /api/auth/profile` - Update profile
- `PATCH /api/auth/change-password` - Change password

### Nurse Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/schedule` - Get full schedule

### Notifications
- `GET /api/notifications/my` - Get my notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/availability-request` - Submit request

### Admin Routes (Requires Authentication)
- `POST /api/schedules/generate` - Generate schedule
- `GET /api/notifications/availability-requests` - View requests
- `PATCH /api/notifications/:id/availability-response` - Respond to request

---

## 🎯 Testing the System

### Test Nurse Login

Create a test nurse first (run in backend folder):
```javascript
// In backend folder, create test-create-nurse.js
const mongoose = require('mongoose');
const Nurse = require('./models/Nurse');

async function createTestNurse() {
  await mongoose.connect('mongodb://localhost:27017/nurse-scheduling');
  
  const nurse = new Nurse({
    nurseId: 'N9999',
    name: 'Test Nurse',
    email: 'test@nurse.com',
    role: 'staff_nurse',
    qualifications: ['General'],
    wardAccess: ['ICU'],
    yearsOfExperience: 2
  });
  
  await nurse.save();
  console.log('Test nurse created! Use N9999 to signup');
  process.exit(0);
}

createTestNurse();
```

Then:
1. Run: `node test-create-nurse.js`
2. Go to frontend
3. Click "Activate Account"
4. Enter: N9999
5. Set password and login!

---

## 📝 Environment Variables

Backend `.env` file should contain:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nurse-scheduling
JWT_SECRET=nurse-scheduling-super-secret-key-2024-production-ready
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## 🆘 Need Help?

1. Check MongoDB is running: `sc query MongoDB`
2. Check backend logs in terminal
3. Check browser console (F12) for frontend errors
4. Verify ports 5000 and 5173 are free

---

## ✨ Features Implemented

✅ Nurse authentication (signup/login)
✅ Password hashing with bcrypt
✅ JWT token-based auth
✅ Refresh tokens
✅ Protected routes
✅ Nurse dashboard with real data
✅ Notification system
✅ Schedule viewing
✅ Availability requests
✅ Admin schedule generation with notifications
✅ Role-based access control

---

## 🚀 Next Steps

1. Run `START-MONGODB.bat` as admin
2. Start backend: `cd backend && node server.js`
3. Start frontend: `cd frontend && npm run dev`
4. Open http://localhost:5173
5. Login or activate your account!

**Enjoy your new nurse scheduling system! 🎉**
