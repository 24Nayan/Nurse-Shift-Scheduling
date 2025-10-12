import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  // Basic Schedule Information
  ward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward',
    required: true,
    index: true
  },
  wardName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true,
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Main Schedule Data - Complex nested structure
  scheduleData: {
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward'
    },
    
    // Daily schedule broken down by date
    dates: {
      type: Map,
      of: {
        // Three shifts per day: DAY, EVENING, NIGHT
        DAY: {
          required: { type: Number, default: 0 },
          assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }],
          assignments: [{
            nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
            nurseName: String,
            nurseEmployeeId: String,
            startTime: String,
            endTime: String,
            hours: { type: Number, default: 8 },
            isOvertime: { type: Boolean, default: false },
            qualifications: [String],
            role: String
          }]
        },
        EVENING: {
          required: { type: Number, default: 0 },
          assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }],
          assignments: [{
            nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
            nurseName: String,
            nurseEmployeeId: String,
            startTime: String,
            endTime: String,
            hours: { type: Number, default: 8 },
            isOvertime: { type: Boolean, default: false },
            qualifications: [String],
            role: String
          }]
        },
        NIGHT: {
          required: { type: Number, default: 0 },
          assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' }],
          assignments: [{
            nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
            nurseName: String,
            nurseEmployeeId: String,
            startTime: String,
            endTime: String,
            hours: { type: Number, default: 8 },
            isOvertime: { type: Boolean, default: false },
            qualifications: [String],
            role: String
          }]
        }
      }
    },
    
    // Individual nurse statistics for this schedule period
    nurseStats: {
      type: Map,
      of: {
        nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
        nurseName: String,
        totalHours: { type: Number, default: 0 },
        totalShifts: { type: Number, default: 0 },
        dayShifts: { type: Number, default: 0 },
        eveningShifts: { type: Number, default: 0 },
        nightShifts: { type: Number, default: 0 },
        weekendShifts: { type: Number, default: 0 },
        consecutiveNights: { type: Number, default: 0 },
        maxConsecutiveNights: { type: Number, default: 0 },
        consecutiveDays: { type: Number, default: 0 },
        maxConsecutiveDays: { type: Number, default: 0 },
        overtimeHours: { type: Number, default: 0 },
        daysOff: { type: Number, default: 0 },
        preferencesSatisfied: { type: Number, default: 0 },
        totalPreferences: { type: Number, default: 0 },
        satisfactionScore: { type: Number, default: 0 }
      }
    }
  },
  
  // Schedule Metadata and Status
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'ARCHIVED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  
  // Generation Information
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: String,
    default: 'SYSTEM'
  },
  generationSettings: {
    algorithm: {
      type: String,
      default: 'GENETIC_ALGORITHM'
    },
    generations: {
      type: Number,
      default: 100
    },
    populationSize: {
      type: Number,
      default: 50
    },
    mutationRate: {
      type: Number,
      default: 0.1
    },
    crossoverRate: {
      type: Number,
      default: 0.8
    },
    fitnessThreshold: {
      type: Number,
      default: 0.95
    }
  },
  
  // Quality Metrics
  qualityMetrics: {
    coveragePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    constraintViolations: {
      hard: { type: Number, default: 0 },
      soft: { type: Number, default: 0 }
    },
    fairnessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    preferenceSatisfactionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalFitnessScore: {
      type: Number,
      default: 0
    }
  },
  
  // Approval and Publishing
  version: {
    type: Number,
    default: 1
  },
  publishedAt: Date,
  publishedBy: String,
  approvedBy: String,
  approvedAt: Date,
  
  // Comments and Notes
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    trim: true
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