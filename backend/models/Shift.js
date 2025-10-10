import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    trim: true,
    maxlength: [50, 'Shift name cannot exceed 50 characters']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  duration: {
    type: Number,
    required: true,
    min: [1, 'Shift duration must be at least 1 hour'],
    max: [24, 'Shift duration cannot exceed 24 hours']
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ['day', 'evening', 'night', 'split'],
      message: 'Shift type must be day, evening, night, or split'
    }
  },
  ward: {
    type: String,
    required: [true, 'Ward is required'],
    trim: true
  },
  requiredStaffing: {
    admin: {
      type: Number,
      default: 0,
      min: [0, 'Required admin staff cannot be negative']
    },
    charge_nurse: {
      type: Number,
      default: 1,
      min: [0, 'Required charge nurses cannot be negative']
    },
    staff_nurse: {
      type: Number,
      default: 2,
      min: [1, 'At least 1 staff nurse is required']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total required staff
shiftSchema.virtual('totalRequiredStaff').get(function() {
  return this.requiredStaffing.admin + 
         this.requiredStaffing.charge_nurse + 
         this.requiredStaffing.staff_nurse;
});

// Virtual for shift display
shiftSchema.virtual('timeDisplay').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Pre-save middleware to calculate duration
shiftSchema.pre('save', function(next) {
  if (this.isModified('startTime') || this.isModified('endTime')) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    let end = new Date(`2000-01-01T${this.endTime}:00`);
    
    // Handle overnight shifts
    if (end <= start) {
      end = new Date(`2000-01-02T${this.endTime}:00`);
    }
    
    this.duration = (end - start) / (1000 * 60 * 60); // Convert to hours
  }
  next();
});

// Indexes
shiftSchema.index({ ward: 1, type: 1, isActive: 1 });
shiftSchema.index({ startTime: 1, endTime: 1 });

// Instance methods
shiftSchema.methods.getTotalStaffNeeded = function() {
  return this.requiredStaffing.admin + 
         this.requiredStaffing.charge_nurse + 
         this.requiredStaffing.staff_nurse;
};

// Static methods
shiftSchema.statics.findByWard = function(wardName) {
  return this.find({ ward: wardName, isActive: true });
};

shiftSchema.statics.findByType = function(shiftType) {
  return this.find({ type: shiftType, isActive: true });
};

export default mongoose.model('Shift', shiftSchema);