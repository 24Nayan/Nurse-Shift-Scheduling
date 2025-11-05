import express from 'express';
import Notification from '../models/Notification.js';
import { protect, restrictTo } from './auth.js';

const router = express.Router();

// Middleware to protect all routes
router.use(protect);

// GET NOTIFICATIONS FOR CURRENT NURSE
router.get('/my', async (req, res) => {
  try {
    const notifications = await Notification.findUnreadForNurse(req.nurse.nurseId)
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter(n => n.status !== 'read').length
      }
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// MARK NOTIFICATION AS READ
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      notificationId: req.params.notificationId,
      recipientNurseId: req.nurse.nurseId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

// CREATE AVAILABILITY REQUEST
router.post('/availability-request', async (req, res) => {
  try {
    const { requestedDates, reason, deadline } = req.body;

    if (!requestedDates || !Array.isArray(requestedDates) || requestedDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide requested dates'
      });
    }

    // Validate requested dates format
    const validDates = requestedDates.every(dateObj => 
      dateObj.date && dateObj.shifts && Array.isArray(dateObj.shifts)
    );

    if (!validDates) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Each date should have date and shifts array.'
      });
    }

    const availabilityData = {
      requestedDates: requestedDates.map(dateObj => ({
        date: new Date(dateObj.date),
        shifts: dateObj.shifts
      })),
      reason: reason || '',
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
    };

    const notification = await Notification.createAvailabilityRequest(
      req.nurse.nurseId,
      req.nurse.name,
      availabilityData
    );

    res.status(201).json({
      success: true,
      message: 'Availability request submitted successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Create availability request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating availability request',
      error: error.message
    });
  }
});

// GET AVAILABILITY REQUESTS (Admin only)
router.get('/availability-requests', restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    const requests = await Notification.findPendingAvailabilityRequests();

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Fetch availability requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability requests',
      error: error.message
    });
  }
});

// RESPOND TO AVAILABILITY REQUEST (Admin only)
router.patch('/:notificationId/availability-response', restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    const { status, message } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    const notification = await Notification.findOne({
      notificationId: req.params.notificationId,
      type: 'AVAILABILITY_REQUEST'
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Availability request not found'
      });
    }

    // Update the availability request
    notification.availabilityRequest.status = status;
    notification.availabilityRequest.adminResponse = {
      message: message || '',
      respondedBy: req.nurse.name,
      respondedAt: new Date()
    };

    await notification.save();

    // Create response notification for the requesting nurse
    await Notification.create({
      type: 'AVAILABILITY_RESPONSE',
      title: `Availability Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your availability request has been ${status}. ${message || ''}`,
      recipientNurseId: notification.senderId,
      recipientType: 'nurse',
      senderType: 'admin',
      senderId: req.nurse.nurseId,
      senderName: req.nurse.name,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      message: `Availability request ${status} successfully`,
      data: { notification }
    });
  } catch (error) {
    console.error('Respond to availability request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to availability request',
      error: error.message
    });
  }
});

// CREATE SYSTEM ANNOUNCEMENT (Admin only)
router.post('/announcement', restrictTo('admin'), async (req, res) => {
  try {
    const { title, message, recipientType = 'nurse', priority = 'medium' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notification = await Notification.create({
      type: 'SYSTEM_ANNOUNCEMENT',
      title,
      message,
      recipientType,
      senderType: 'admin',
      senderId: req.nurse.nurseId,
      senderName: req.nurse.name,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating announcement',
      error: error.message
    });
  }
});

// GET ALL NOTIFICATIONS (Admin only)
router.get('/all', restrictTo('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.recipientType) filter.recipientType = req.query.recipientType;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Fetch all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// DELETE NOTIFICATION (Admin only)
router.delete('/:notificationId', restrictTo('admin'), async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      notificationId: req.params.notificationId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

export default router;