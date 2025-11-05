import mongoose from 'mongoose';

const unavailabilityRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: false, // Will be auto-generated in pre-save middleware
    unique: true,
    trim: true
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true,
    index: true
  },
  nurseName: {
    type: String,
    required: true,
    trim: true
  },
  nurseCode: {
    type: String,
    required: true,
    trim: true
  },
  // Date and shift combinations where nurse is unavailable
  unavailableDates: [{
    date: {
      type: Date,
      required: true
    },
    shifts: [{
      type: String,
      enum: ['DAY', 'EVENING', 'NIGHT'],
      required: true
    }],
    dateString: {
      type: String,
      required: true // Store as YYYY-MM-DD for easy querying
    }
  }],
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  // Admin response
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse'
    },
    respondedAt: Date
  },
  // Validity period
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  // Priority (for scheduling algorithm - higher priority requests are more important)
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
unavailabilityRequestSchema.index({ nurseId: 1, status: 1, createdAt: -1 });
unavailabilityRequestSchema.index({ status: 1, validUntil: 1 });
unavailabilityRequestSchema.index({ 'unavailableDates.dateString': 1, 'unavailableDates.shifts': 1 });

// Pre-save middleware to generate request ID and set date strings
unavailabilityRequestSchema.pre('save', async function(next) {
  if (!this.requestId) {
    try {
      const count = await this.constructor.countDocuments();
      this.requestId = `UNAV${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  
  // Ensure dateString is set for each unavailable date
  if (this.unavailableDates && this.unavailableDates.length > 0) {
    this.unavailableDates.forEach(item => {
      if (item.date && !item.dateString) {
        const date = new Date(item.date);
        item.dateString = date.toISOString().split('T')[0];
      }
    });
  }
  
  next();
});

// Instance methods
unavailabilityRequestSchema.methods.isValidForDate = function(dateString, shiftType) {
  if (this.status !== 'approved') {
    return false;
  }
  
  const checkDate = new Date(dateString);
  if (checkDate < this.validFrom || checkDate > this.validUntil) {
    return false;
  }
  
  const unavailableDate = this.unavailableDates.find(
    item => item.dateString === dateString
  );
  
  if (!unavailableDate) {
    return false;
  }
  
  return unavailableDate.shifts.includes(shiftType);
};

unavailabilityRequestSchema.methods.approve = function(adminId, message) {
  this.status = 'approved';
  this.adminResponse = {
    message: message || 'Request approved',
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

unavailabilityRequestSchema.methods.reject = function(adminId, message) {
  this.status = 'rejected';
  this.adminResponse = {
    message: message || 'Request rejected',
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

// Pre-save middleware to auto-generate requestId
unavailabilityRequestSchema.pre('save', async function(next) {
  // Only generate if this is a new document and requestId is not set
  if (this.isNew && !this.requestId) {
    try {
      const count = await this.constructor.countDocuments();
      this.requestId = `REQ${String(count + 1).padStart(5, '0')}`;
      console.log(`Generated requestId: ${this.requestId}`);
    } catch (error) {
      console.error('Error generating requestId:', error);
      return next(error);
    }
  }
  next();
});

// Static methods
unavailabilityRequestSchema.statics.findActiveForNurse = function(nurseId) {
  const now = new Date();
  return this.find({
    nurseId: nurseId,
    status: 'approved',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  }).sort({ createdAt: -1 });
};

unavailabilityRequestSchema.statics.findPendingRequests = function() {
  return this.find({
    status: 'pending'
  })
  .populate('nurseId', 'name nurseId email')
  .sort({ createdAt: -1 });
};

unavailabilityRequestSchema.statics.checkNurseAvailability = async function(nurseId, dateString, shiftType) {
  const now = new Date();
  const checkDate = new Date(dateString);
  
  const blockingRequests = await this.find({
    nurseId: nurseId,
    status: 'approved',
    validFrom: { $lte: checkDate },
    validUntil: { $gte: checkDate },
    'unavailableDates.dateString': dateString,
    'unavailableDates.shifts': shiftType
  });
  
  return blockingRequests.length === 0; // true if available, false if blocked
};

export default mongoose.model('UnavailabilityRequest', unavailabilityRequestSchema);

