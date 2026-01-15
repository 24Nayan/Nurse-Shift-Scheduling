import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import nurseRoutes from './routes/nurses.js';
import shiftRoutes from './routes/shifts.js';
import scheduleRoutes from './routes/schedules.js';
import wardRoutes from './routes/wards.js';
import debugRoutes from './routes/debug.js';
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import unavailabilityRoutes from './routes/unavailability.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://nurse-shift-scheduling.vercel.app/' // Replace with your actual Vercel URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shift-scheduling');
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Set up database event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Seed a default admin if missing
import Nurse from './models/Nurse.js';
const seedDefaultAdmin = async () => {
  try {
    const existing = await Nurse.findOne({ email: 'admin@hospital.com' });
    if (!existing) {
      const admin = new Nurse({
        nurseId: 'N9999',
        name: 'System Admin',
        email: 'admin@hospital.com',
        role: 'admin',
        qualifications: ['Admin'],
        wardAccess: ['all'],
        yearsOfExperience: 10,
        password: process.env.ADMIN_PASSWORD || 'admin123',
        isEmailVerified: true
      });
      await admin.save();
      console.log('👤 Default admin created: admin@hospital.com / admin123');
    } else {
      // Ensure admin role and active
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        existing.hierarchyLevel = 3;
      }
      if (!existing.password) {
        existing.password = process.env.ADMIN_PASSWORD || 'admin123';
      }
      if (!existing.wardAccess || existing.wardAccess.length === 0) {
        existing.wardAccess = ['all'];
      }
      await existing.save();
    }
  } catch (e) {
    console.error('Failed to ensure default admin:', e.message);
  }
};

// Kick off seeding after a short delay to ensure DB is connected
setTimeout(seedDefaultAdmin, 500);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/unavailability', unavailabilityRoutes);
app.use('/api/debug', debugRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Shift Scheduling API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Debug endpoint to check wards directly
app.get('/api/debug-wards', async (req, res) => {
  try {
    const Ward = (await import('./models/Ward.js')).default;
    const rawWards = await Ward.find({}).lean();
    const wardsWithMethods = await Ward.find({});
    
    res.json({
      success: true,
      rawCount: rawWards.length,
      rawWards: rawWards,
      wardsWithMethodsCount: wardsWithMethods.length,
      safeWards: wardsWithMethods.map(w => w.toSafeObject())
    });
  } catch (error) {
    console.error('Debug wards error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Welcome message for root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Shift Scheduling API',
    version: '1.0.0',
    endpoints: {
      nurses: '/api/nurses',
      shifts: '/api/shifts', 
      schedules: '/api/schedules',
      health: '/api/health'
    }
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  
  // Handle MongoDB errors
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

export default app;
