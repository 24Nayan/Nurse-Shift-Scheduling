import mongoose from 'mongoose';
import validator from 'validator';

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
  // Generate nurseId if not provided
  if (!this.nurseId || this.isNew) {
    const count = await mongoose.models.Nurse.countDocuments();
    this.nurseId = `N${String(count + 1001).padStart(4, '0')}`;
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

export default mongoose.model('Nurse', nurseSchema);