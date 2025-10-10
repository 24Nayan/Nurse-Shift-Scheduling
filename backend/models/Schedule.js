import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Schedule name is required'],
    trim: true,
    maxlength: [100, 'Schedule name cannot exceed 100 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  ward: {
    type: String,
    required: [true, 'Ward is required'],
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'active', 'completed', 'archived'],
      message: 'Status must be draft, published, active, completed, or archived'
    },
    default: 'draft'
  },
  assignments: [{
    date: {
      type: Date,
      required: true
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    nurse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'charge_nurse', 'staff_nurse'],
      required: true
    },
    isConfirmed: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    }
  }],
  metadata: {
    totalShifts: {
      type: Number,
      default: 0
    },
    totalHours: {
      type: Number,
      default: 0
    },
    algorithmsUsed: [{
      name: String,
      version: String,
      parameters: mongoose.Schema.Types.Mixed
    }],
    constraints: {
      maxConsecutiveDays: {
        type: Number,
        default: 5
      },
      minRestHours: {
        type: Number,
        default: 12
      },
      maxWeeklyHours: {
        type: Number,
        default: 40
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for schedule duration in days
scheduleSchema.virtual('durationDays').get(function() {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

// Virtual for completion percentage
scheduleSchema.virtual('completionPercentage').get(function() {
  if (this.assignments.length === 0) return 0;
  const confirmedAssignments = this.assignments.filter(a => a.isConfirmed).length;
  return Math.round((confirmedAssignments / this.assignments.length) * 100);
});

// Pre-save middleware to update metadata
scheduleSchema.pre('save', function(next) {
  if (this.isModified('assignments')) {
    this.metadata.totalShifts = this.assignments.length;
    // Note: totalHours would need shift duration data to calculate accurately
  }
  next();
});

// Indexes for better performance
scheduleSchema.index({ ward: 1, status: 1 });
scheduleSchema.index({ startDate: 1, endDate: 1 });
scheduleSchema.index({ 'assignments.date': 1, 'assignments.nurse': 1 });

// Instance methods
scheduleSchema.methods.publish = function() {
  this.status = 'published';
  return this.save();
};

scheduleSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

scheduleSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

scheduleSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

scheduleSchema.methods.getAssignmentsForNurse = function(nurseId) {
  return this.assignments.filter(assignment => 
    assignment.nurse.toString() === nurseId.toString()
  );
};

scheduleSchema.methods.getAssignmentsForDate = function(date) {
  const targetDate = new Date(date);
  return this.assignments.filter(assignment => {
    const assignmentDate = new Date(assignment.date);
    return assignmentDate.toDateString() === targetDate.toDateString();
  });
};

// Static methods
scheduleSchema.statics.findByWard = function(wardName) {
  return this.find({ ward: wardName });
};

scheduleSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

scheduleSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  });
};

export default mongoose.model('Schedule', scheduleSchema);