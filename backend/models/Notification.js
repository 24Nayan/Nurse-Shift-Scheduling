import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'SCHEDULE_PUBLISHED',
      'AVAILABILITY_REQUEST', 
      'AVAILABILITY_RESPONSE',
      'SCHEDULE_CHANGE',
      'SHIFT_REMINDER',
      'OVERTIME_REQUEST',
      'SYSTEM_ANNOUNCEMENT'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  // For nurse-specific notifications
  recipientNurseId: {
    type: String,
    trim: true
  },
  recipientNurseName: {
    type: String,
    trim: true
  },
  // For admin notifications  
  recipientType: {
    type: String,
    enum: ['nurse', 'admin'],
    default: 'nurse'
  },
  // Sender information
  senderType: {
    type: String,
    enum: ['system', 'admin', 'nurse'],
    default: 'system'
  },
  senderId: {
    type: String,
    trim: true
  },
  senderName: {
    type: String,
    trim: true
  },
  // Related data for context
  relatedScheduleId: {
    type: String,
    trim: true
  },
  relatedWardId: {
    type: String,
    trim: true
  },
  relatedDate: {
    type: Date
  },
  relatedShift: {
    type: String,
    enum: ['DAY', 'EVENING', 'NIGHT']
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'read', 'archived'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Availability request specific fields
  availabilityRequest: {
    requestedDates: [{
      date: Date,
      shifts: [{
        type: String,
        enum: ['DAY', 'EVENING', 'NIGHT']
      }]
    }],
    reason: {
      type: String,
      maxlength: 200
    },
    deadline: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminResponse: {
      message: String,
      respondedBy: String,
      respondedAt: Date
    }
  },
  // Timestamps
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  sentAt: Date,
  readAt: Date,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ recipientNurseId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ 'availabilityRequest.status': 1 });

// Pre-save middleware to generate notification ID
notificationSchema.pre('save', async function(next) {
  if (!this.notificationId) {
    try {
      const count = await this.constructor.countDocuments();
      this.notificationId = `NOT${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static methods
notificationSchema.statics.findUnreadForNurse = function(nurseId) {
  return this.find({
    recipientNurseId: nurseId,
    status: { $in: ['sent', 'pending'] }
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findPendingAvailabilityRequests = function() {
  return this.find({
    type: 'AVAILABILITY_REQUEST',
    'availabilityRequest.status': 'pending',
    recipientType: 'admin'
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.createScheduleNotification = function(scheduleId, nurseIds, wardName) {
  const notifications = nurseIds.map(nurseId => ({
    type: 'SCHEDULE_PUBLISHED',
    title: 'New Schedule Published',
    message: `A new schedule has been published for ${wardName}. Please check your assignments.`,
    recipientNurseId: nurseId,
    recipientType: 'nurse',
    relatedScheduleId: scheduleId,
    priority: 'high'
  }));
  
  return this.insertMany(notifications);
};

notificationSchema.statics.createAvailabilityRequest = function(nurseId, nurseName, requestData) {
  return this.create({
    type: 'AVAILABILITY_REQUEST',
    title: `Availability Request from ${nurseName}`,
    message: `${nurseName} has requested time off. Please review and respond.`,
    recipientType: 'admin',
    senderType: 'nurse',
    senderId: nurseId,
    senderName: nurseName,
    availabilityRequest: requestData,
    priority: 'medium'
  });
};

export default mongoose.model('Notification', notificationSchema);