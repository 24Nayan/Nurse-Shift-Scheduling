import mongoose from 'mongoose';

// Ward Schema definition
const wardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ward name is required'],
    trim: true,
    maxlength: [100, 'Ward name cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Ward department is required'],
    trim: true,
    maxlength: [200, 'Ward department cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Ward description cannot exceed 500 characters']
  },
  // Capacity - number of patient beds
  capacity: {
    type: Number,
    required: [true, 'Ward capacity is required'],
    min: [1, 'Ward capacity must be at least 1'],
    max: [500, 'Ward capacity cannot exceed 500']
  },
  // Daily staff - breakdown by type
  dailyStaff: {
    nurses: {
      type: Number,
      required: [true, 'Daily nurses requirement is required'],
      min: [0, 'Daily nurses cannot be negative'],
      max: [100, 'Daily nurses cannot exceed 100']
    },
    doctors: {
      type: Number,
      required: [true, 'Daily doctors requirement is required'],
      min: [0, 'Daily doctors cannot be negative'],
      max: [50, 'Daily doctors cannot exceed 50']
    },
    support: {
      type: Number,
      required: [true, 'Daily support staff requirement is required'],
      min: [0, 'Daily support staff cannot be negative'],
      max: [50, 'Daily support staff cannot exceed 50']
    }
  },
  // Required qualifications for nurses working in this ward
  qualifications: [{
    type: String,
    enum: ['RN', 'BSN', 'MSN', 'ACLS', 'BLS', 'CCRN', 'CEN', 'PALS', 'NREMT', 'CNS', 'NP'],
    required: true
  }],
  // Patient types handled in this ward
  patientTypes: [{
    type: String,
    enum: ['trauma', 'emergency', 'critical', 'general', 'pediatric', 'geriatric', 'surgical', 'cardiac', 'orthopedic', 'neurology', 'oncology'],
    required: true
  }],
  // Shift requirements breakdown
  shiftRequirements: {
    day: {
      nurses: {
        type: Number,
        required: [true, 'Day shift nurses requirement is required'],
        min: [0, 'Day shift nurses cannot be negative'],
        max: [50, 'Day shift nurses cannot exceed 50']
      },
      doctors: {
        type: Number,
        required: [true, 'Day shift doctors requirement is required'],
        min: [0, 'Day shift doctors cannot be negative'],
        max: [20, 'Day shift doctors cannot exceed 20']
      },
      support: {
        type: Number,
        required: [true, 'Day shift support staff requirement is required'],
        min: [0, 'Day shift support staff cannot be negative'],
        max: [30, 'Day shift support staff cannot exceed 30']
      }
    },
    evening: {
      nurses: {
        type: Number,
        required: [true, 'Evening shift nurses requirement is required'],
        min: [0, 'Evening shift nurses cannot be negative'],
        max: [50, 'Evening shift nurses cannot exceed 50']
      },
      doctors: {
        type: Number,
        required: [true, 'Evening shift doctors requirement is required'],
        min: [0, 'Evening shift doctors cannot be negative'],
        max: [20, 'Evening shift doctors cannot exceed 20']
      },
      support: {
        type: Number,
        required: [true, 'Evening shift support staff requirement is required'],
        min: [0, 'Evening shift support staff cannot be negative'],
        max: [30, 'Evening shift support staff cannot exceed 30']
      }
    },
    night: {
      nurses: {
        type: Number,
        required: [true, 'Night shift nurses requirement is required'],
        min: [0, 'Night shift nurses cannot be negative'],
        max: [50, 'Night shift nurses cannot exceed 50']
      },
      doctors: {
        type: Number,
        required: [true, 'Night shift doctors requirement is required'],
        min: [0, 'Night shift doctors cannot be negative'],
        max: [20, 'Night shift doctors cannot exceed 20']
      },
      support: {
        type: Number,
        required: [true, 'Night shift support staff requirement is required'],
        min: [0, 'Night shift support staff cannot be negative'],
        max: [30, 'Night shift support staff cannot exceed 30']
      }
    }
  },
  // Current occupancy - how many patients are currently in the ward
  currentOccupancy: {
    type: Number,
    default: 0,
    min: [0, 'Current occupancy cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.capacity;
      },
      message: 'Current occupancy cannot exceed capacity'
    }
  },
  // Physical location of the ward
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  // Special equipment available in the ward
  specialEquipment: [{
    type: String,
    trim: true
  }],
  // Additional notes about the ward
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Minimum hierarchy level required to work in this ward
  minHierarchyLevel: {
    type: Number,
    required: [true, 'Minimum hierarchy level is required'],
    min: [1, 'Minimum hierarchy level must be at least 1'],
    max: [3, 'Minimum hierarchy level cannot exceed 3'],
    default: 1
  },
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'wards'
});

// Compound index to enforce uniqueness only for active wards
wardSchema.index({ name: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { isActive: true } 
});

// Indexes for better query performance
wardSchema.index({ isActive: 1 });
wardSchema.index({ patientTypes: 1 });
wardSchema.index({ qualifications: 1 });
wardSchema.index({ createdAt: -1 });

// Middleware to update 'updatedAt' before saving
wardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save hook to check for duplicate names among active wards only
wardSchema.pre('save', async function(next) {
  // Only check for duplicates if:
  // 1. This is a new ward OR the name is being modified
  // 2. The ward is active (isActive: true)
  if ((!this.isModified('name') && !this.isNew) || !this.isActive) {
    return next();
  }
  
  try {
    // Check if another active ward exists with this name
    const existingWard = await this.constructor.findOne({
      name: { $regex: new RegExp(`^${this.name}$`, 'i') }, // Case-insensitive match
      isActive: true,
      _id: { $ne: this._id } // Exclude current document if updating
    });
    
    if (existingWard) {
      const error = new Error('Ward name already exists');
      error.name = 'ValidationError';
      error.code = 11000; // MongoDB duplicate key error code
      return next(error);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware to calculate dailyStaff based on shift requirements
wardSchema.pre('save', function(next) {
  if (this.shiftRequirements) {
    const dayTotal = (this.shiftRequirements.day?.nurses || 0) + (this.shiftRequirements.day?.chargeNurse || 0);
    const nightTotal = (this.shiftRequirements.night?.nurses || 0) + (this.shiftRequirements.night?.chargeNurse || 0);
    const eveningTotal = (this.shiftRequirements.evening?.nurses || 0) + (this.shiftRequirements.evening?.chargeNurse || 0);
    
    this.dailyStaff = dayTotal + nightTotal + eveningTotal;
  }
  next();
});

// Virtual properties
wardSchema.virtual('totalDailyRequirement').get(function() {
  return this.dailyStaff;
});

wardSchema.virtual('totalShifts').get(function() {
  return 3; // day, night, evening
});

// Instance methods
wardSchema.methods.getTotalStaffForShift = function(shiftType) {
  if (!this.shiftRequirements || !this.shiftRequirements[shiftType]) {
    return 0;
  }
  const shift = this.shiftRequirements[shiftType];
  return (shift.nurses || 0) + (shift.chargeNurse || 0);
};

wardSchema.methods.hasRequiredQualification = function(qualification) {
  return this.qualifications.includes(qualification);
};

wardSchema.methods.handlesPatientType = function(patientType) {
  return this.patientTypes.includes(patientType);
};

wardSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    name: this.name,
    department: this.department,
    description: this.description,
    capacity: this.capacity,
    currentOccupancy: this.currentOccupancy,
    location: this.location,
    dailyStaff: this.dailyStaff,
    qualifications: this.qualifications,
    patientTypes: this.patientTypes,
    shiftRequirements: this.shiftRequirements,
    specialEquipment: this.specialEquipment,
    notes: this.notes,
    minHierarchyLevel: this.minHierarchyLevel,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static methods
wardSchema.statics.findByPatientType = function(patientType) {
  return this.find({ 
    patientTypes: { $in: [patientType] }, 
    isActive: true 
  });
};

wardSchema.statics.findByQualification = function(qualification) {
  return this.find({ 
    qualifications: { $in: [qualification] }, 
    isActive: true 
  });
};

wardSchema.statics.findByCapacityRange = function(minCapacity, maxCapacity) {
  return this.find({ 
    capacity: { $gte: minCapacity, $lte: maxCapacity }, 
    isActive: true 
  });
};

wardSchema.statics.getActiveWards = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

wardSchema.statics.getTotalCapacity = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, totalCapacity: { $sum: '$capacity' } } }
  ]);
};

wardSchema.statics.getTotalDailyStaffNeed = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, totalDailyStaff: { $sum: '$dailyStaff' } } }
  ]);
};

// Model validation
wardSchema.path('qualifications').validate(function(qualifications) {
  return qualifications && qualifications.length > 0;
}, 'At least one qualification must be specified');

wardSchema.path('patientTypes').validate(function(patientTypes) {
  return patientTypes && patientTypes.length > 0;
}, 'At least one patient type must be specified');

// Custom validation for shift requirements is handled at the field level

// Export the model
const Ward = mongoose.model('Ward', wardSchema);
export default Ward;