import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const nurseSchema = new mongoose.Schema({
  nurseId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^N\d{4}$/, 'Nurse ID must be in format N0000']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address']
  },
  role: {
    type: String,
    required: true,
    enum: {
      values: ['admin', 'charge_nurse', 'staff_nurse'],
      message: 'Role must be admin, charge_nurse, or staff_nurse'
    },
    default: 'staff_nurse'
  },
  qualifications: [{
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Qualification cannot be empty'
    }
  }],
  wardAccess: [{
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Ward access cannot be empty'
    }
  }],
  hierarchyLevel: {
    type: Number,
    required: true,
    min: [1, 'Hierarchy level must be at least 1'],
    max: [3, 'Hierarchy level cannot exceed 3'],
    default: function() {
      switch(this.role) {
        case 'admin': return 3;
        case 'charge_nurse': return 2;
        case 'staff_nurse': return 1;
        default: return 1;
      }
    }
  },
  yearsOfExperience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Years of experience cannot be negative'],
    max: [50, 'Years of experience cannot exceed 50'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // AUTHENTICATION FIELDS
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  passwordChangedAt: {
    type: Date
    // No default - only set when password is actually changed
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date
  }],
  // ENHANCED SCHEDULING CONSTRAINTS AND PREFERENCES
  workingConstraints: {
    // Maximum consecutive night shifts (GROUND RULE)
    maxConsecutiveNights: {
      type: Number,
      default: 2,
      min: [1, 'Must allow at least 1 consecutive night'],
      max: [4, 'Cannot exceed 4 consecutive nights for safety']
    },
    
    // Maximum weekly working hours (GROUND RULE)
    maxWeeklyHours: {
      type: Number,
      default: 40,
      min: [20, 'Minimum 20 hours per week'],
      max: [60, 'Maximum 60 hours per week for safety']
    },
    
    // Maximum overtime hours per week
    maxOvertimeHours: {
      type: Number,
      default: 8,
      min: [0, 'Overtime cannot be negative'],
      max: [20, 'Maximum 20 overtime hours per week']
    },
    
    // Minimum rest hours between shifts (GROUND RULE)
    minRestHours: {
      type: Number,
      default: 11,
      min: [8, 'Minimum 8 hours rest required'],
      max: [24, 'Maximum 24 hours rest']
    },
    
    // Maximum consecutive working days
    maxConsecutiveDays: {
      type: Number,
      default: 5,
      min: [3, 'Minimum 3 consecutive days'],
      max: [7, 'Maximum 7 consecutive days']
    },
    
    // Minimum days off per week
    minDaysOffPerWeek: {
      type: Number,
      default: 2,
      min: [1, 'Minimum 1 day off per week'],
      max: [4, 'Maximum 4 days off per week']
    }
  },
  
  // Detailed weekly availability - What shifts and days nurse is available
  availability: {
    monday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    tuesday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    wednesday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    thursday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    friday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    saturday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    },
    sunday: {
      available: { type: Boolean, default: true },
      preferredShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      unavailableShifts: [{
        type: String,
        enum: ['day', 'evening', 'night']
      }],
      notes: { type: String, maxlength: 200 }
    }
  },
  
  // Specific unavailable dates with reasons
  unavailableDates: [{
    date: { type: Date, required: true },
    shifts: [{
      type: String,
      enum: ['day', 'evening', 'night', 'all'],
      default: 'all'
    }],
    reason: { type: String, maxlength: 200 },
    approved: { type: Boolean, default: false },
    requestedAt: { type: Date, default: Date.now }
  }],
  
  // General shift preferences
  shiftPreferences: {
    preferredShiftTypes: [{
      type: String,
      enum: ['day', 'evening', 'night']
    }],
    avoidShiftTypes: [{
      type: String,
      enum: ['day', 'evening', 'night']
    }],
    weekendPreference: {
      type: String,
      enum: ['prefer', 'neutral', 'avoid'],
      default: 'neutral'
    },
    nightShiftPreference: {
      type: String,
      enum: ['prefer', 'neutral', 'avoid'],
      default: 'neutral'
    }
  },

  preferences: {
    preferredShifts: [{
      type: String,
      enum: ['day', 'evening', 'night']
    }],
    maxConsecutiveDays: {
      type: Number,
      default: 5,
      min: [1, 'Maximum consecutive days must be at least 1'],
      max: [14, 'Maximum consecutive days cannot exceed 14']
    },
    weeklyHourLimit: {
      type: Number,
      default: 40,
      min: [20, 'Weekly hour limit must be at least 20'],
      max: [60, 'Weekly hour limit cannot exceed 60']
    },
    unavailableDates: [{
      type: Date
    }]
  },
  contactInfo: {
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || validator.isMobilePhone(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive data
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for full display name
nurseSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.nurseId})`;
});

// Virtual for role display
nurseSchema.virtual('roleDisplay').get(function() {
  return this.role.replace('_', ' ').toUpperCase();
});

// Pre-save middleware to auto-generate nurseId
nurseSchema.pre('save', async function(next) {
  // Generate nurseId ONLY if not provided (respect manually set IDs)
  if (!this.nurseId || this.nurseId.trim() === '') {
    // Generate unique ID based on timestamp to avoid collisions
    const timestamp = Date.now();
    const uniqueNum = (timestamp + Math.floor(Math.random() * 1000)) % 10000;
    this.nurseId = `N${String(uniqueNum).padStart(4, '0')}`;
    console.log('Pre-save middleware generated nurse ID:', this.nurseId);
  } else {
    console.log('Pre-save middleware keeping provided nurse ID:', this.nurseId);
  }
  
  // Auto-set hierarchy level based on role
  if (this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.hierarchyLevel = 3;
        break;
      case 'charge_nurse':
        this.hierarchyLevel = 2;
        break;
      case 'staff_nurse':
        this.hierarchyLevel = 1;
        break;
    }
  }
  
  next();
});

// Pre-update middleware
nurseSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Auto-set hierarchy level if role is being updated
  if (update.role) {
    switch (update.role) {
      case 'admin':
        update.hierarchyLevel = 3;
        break;
      case 'charge_nurse':
        update.hierarchyLevel = 2;
        break;
      case 'staff_nurse':
        update.hierarchyLevel = 1;
        break;
    }
  }
  
  next();
});

// Indexes for better performance (nurseId and email already have unique indexes)
nurseSchema.index({ role: 1, isActive: 1 });
nurseSchema.index({ 'wardAccess': 1 });

// Instance methods
nurseSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

nurseSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

nurseSchema.methods.canAccessWard = function(wardName) {
  return this.wardAccess.includes('all') || this.wardAccess.includes(wardName);
};

// SCHEDULING-SPECIFIC METHODS
nurseSchema.methods.isAvailableOnDay = function(dayOfWeek, shiftType) {
  const dayAvailability = this.availability[dayOfWeek.toLowerCase()];
  if (!dayAvailability || !dayAvailability.available) {
    return false;
  }
  
  // Check if shift type is explicitly unavailable
  if (dayAvailability.unavailableShifts && dayAvailability.unavailableShifts.includes(shiftType)) {
    return false;
  }
  
  return true;
};

nurseSchema.methods.getPreferenceScore = function(dayOfWeek, shiftType) {
  const dayAvailability = this.availability[dayOfWeek.toLowerCase()];
  let score = 0;
  
  // Base availability score
  if (dayAvailability?.available) {
    score += 1;
  }
  
  // Preferred shift bonus
  if (dayAvailability?.preferredShifts?.includes(shiftType)) {
    score += 2;
  }
  
  // General shift preference
  if (this.shiftPreferences?.preferredShiftTypes?.includes(shiftType)) {
    score += 1;
  }
  
  // Avoid shift penalty
  if (this.shiftPreferences?.avoidShiftTypes?.includes(shiftType)) {
    score -= 2;
  }
  
  // Weekend preference
  const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek.toLowerCase());
  if (isWeekend) {
    if (this.shiftPreferences?.weekendPreference === 'prefer') {
      score += 1;
    } else if (this.shiftPreferences?.weekendPreference === 'avoid') {
      score -= 1;
    }
  }
  
  // Night shift preference
  if (shiftType === 'night') {
    if (this.shiftPreferences?.nightShiftPreference === 'prefer') {
      score += 1;
    } else if (this.shiftPreferences?.nightShiftPreference === 'avoid') {
      score -= 1;
    }
  }
  
  return score;
};

nurseSchema.methods.canWorkConsecutiveNights = function(currentConsecutiveNights) {
  return currentConsecutiveNights < this.workingConstraints.maxConsecutiveNights;
};

nurseSchema.methods.canWorkMoreHours = function(currentWeeklyHours, additionalHours) {
  return (currentWeeklyHours + additionalHours) <= this.workingConstraints.maxWeeklyHours;
};

nurseSchema.methods.hasRestTimeBetweenShifts = function(lastShiftEnd, nextShiftStart) {
  if (!lastShiftEnd) return true;
  
  const hoursBetween = (nextShiftStart - lastShiftEnd) / (1000 * 60 * 60);
  return hoursBetween >= this.workingConstraints.minRestHours;
};

nurseSchema.methods.isUnavailableOnDate = function(date, shiftType = 'all') {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return this.unavailableDates.some(unavailable => {
    const unavailableDate = new Date(unavailable.date);
    unavailableDate.setHours(0, 0, 0, 0);
    
    if (unavailableDate.getTime() !== targetDate.getTime()) {
      return false;
    }
    
    // If checking for specific shift type
    if (shiftType !== 'all') {
      return unavailable.shifts.includes(shiftType) || unavailable.shifts.includes('all');
    }
    
    return true;
  });
};

// Static methods
nurseSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

nurseSchema.statics.findByWard = function(wardName) {
  return this.find({ 
    wardAccess: { $in: [wardName, 'all'] }, 
    isActive: true 
  });
};

nurseSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        avgHierarchyLevel: { $avg: '$hierarchyLevel' }
      }
    }
  ]);
  
  const total = await this.countDocuments({ isActive: true });
  
  return {
    total,
    byRole: stats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        avgHierarchyLevel: Math.round(stat.avgHierarchyLevel * 10) / 10
      };
      return acc;
    }, {})
  };
};

// AUTHENTICATION METHODS

// Hash password before saving
nurseSchema.pre('save', async function(next) {
  // Only run if password was actually modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Update passwordChangedAt
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to account for timing
  }
  
  next();
});

// Clean up expired refresh tokens before saving
nurseSchema.pre('save', function(next) {
  if (this.refreshTokens && this.refreshTokens.length > 0) {
    this.refreshTokens = this.refreshTokens.filter(tokenObj => 
      tokenObj.expiresAt > new Date()
    );
  }
  next();
});

// Instance method to check password
nurseSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after JWT was issued
nurseSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  return false; // False means password not changed
};

// Instance method to generate JWT token
nurseSchema.methods.generateJWTToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      nurseId: this.nurseId,
      role: this.role,
      hierarchyLevel: this.hierarchyLevel 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Instance method to generate refresh token
nurseSchema.methods.generateRefreshToken = function() {
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  
  this.refreshTokens.push({
    token: refreshToken,
    expiresAt
  });
  
  return refreshToken;
};

// Instance method to validate refresh token
nurseSchema.methods.validateRefreshToken = function(token) {
  return this.refreshTokens.some(tokenObj => 
    tokenObj.token === token && tokenObj.expiresAt > new Date()
  );
};

// Instance method to revoke refresh token
nurseSchema.methods.revokeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(tokenObj => tokenObj.token !== token);
};

// Instance method to create password reset token
nurseSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Static method to find by credentials
nurseSchema.statics.findByCredentials = async function(nurseId, password) {
  const nurse = await this.findOne({ 
    nurseId,
    isActive: true 
  }).select('+password');
  
  if (!nurse) {
    throw new Error('Invalid login credentials');
  }
  
  // Check if account is locked
  if (nurse.lockUntil && nurse.lockUntil > Date.now()) {
    throw new Error('Account is temporarily locked. Please try again later.');
  }
  
  const isMatch = await nurse.correctPassword(password, nurse.password);
  
  if (!isMatch) {
    // Increment login attempts
    nurse.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (nurse.loginAttempts >= 5) {
      nurse.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    }
    
    await nurse.save();
    throw new Error('Invalid login credentials');
  }
  
  // Reset login attempts on successful login
  if (nurse.loginAttempts > 0) {
    nurse.loginAttempts = 0;
    nurse.lockUntil = undefined;
  }
  
  nurse.lastLogin = new Date();
  await nurse.save();
  
  return nurse;
};

export default mongoose.model('Nurse', nurseSchema);