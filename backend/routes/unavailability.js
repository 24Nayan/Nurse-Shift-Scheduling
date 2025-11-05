import express from 'express';
import UnavailabilityRequest from '../models/UnavailabilityRequest.js';
import Notification from '../models/Notification.js';
import { protect, restrictTo } from './auth.js';

const router = express.Router();

// GET /api/unavailability - Get unavailability requests for the logged-in nurse
router.get('/', protect, async (req, res) => {
  try {
    const nurseId = req.nurse._id;
    const requests = await UnavailabilityRequest.find({ nurseId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching unavailability requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unavailability requests',
      error: error.message
    });
  }
});

// GET /api/unavailability/all - Get all requests (admin only)
router.get('/all', protect, restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    // Don't use populate to avoid errors with missing nurse references
    // The request already has nurseName and nurseCode stored directly
    const requests = await UnavailabilityRequest.find()
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

// GET /api/unavailability/pending - Get pending requests (admin only)
router.get('/pending', protect, restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    // Don't use populate to avoid errors with missing nurse references
    // The request already has nurseName and nurseCode stored directly
    const requests = await UnavailabilityRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
});

// POST /api/unavailability - Create a new unavailability request
router.post('/', protect, async (req, res) => {
  try {
    const { unavailableDates, reason, validUntil, priority } = req.body;
    const nurseId = req.nurse._id;
    const nurseName = req.nurse.name;
    const nurseCode = req.nurse.nurseId;

    // Validate input
    if (!unavailableDates || !Array.isArray(unavailableDates) || unavailableDates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one unavailable date is required'
      });
    }

    if (!validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Valid until date is required'
      });
    }

    // Validate dates and shifts
    const validatedDates = unavailableDates.map(item => {
      if (!item.date || !item.shifts || !Array.isArray(item.shifts) || item.shifts.length === 0) {
        throw new Error('Each unavailable date must have a date and at least one shift');
      }
      
      const date = new Date(item.date);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${item.date}`);
      }

      const dateString = date.toISOString().split('T')[0];
      
      return {
        date: date,
        dateString: dateString,
        shifts: item.shifts.filter(s => ['DAY', 'EVENING', 'NIGHT'].includes(s))
      };
    });

    // Create the request
    const request = new UnavailabilityRequest({
      nurseId,
      nurseName,
      nurseCode,
      unavailableDates: validatedDates,
      reason: reason || '',
      validUntil: new Date(validUntil),
      priority: priority || 1
    });

    await request.save();

    // Create notification for admin
    try {
      await Notification.create({
        type: 'AVAILABILITY_REQUEST',
        title: `Unavailability Request from ${nurseName}`,
        message: `${nurseName} (${nurseCode}) has submitted an unavailability request. Please review.`,
        recipientType: 'admin',
        senderType: 'nurse',
        senderId: nurseCode,
        senderName: nurseName,
        priority: 'medium',
        status: 'sent'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Unavailability request submitted successfully',
      data: request
    });
  } catch (error) {
    console.error('Error creating unavailability request:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create unavailability request',
      error: error.message
    });
  }
});

// PATCH /api/unavailability/:id/approve - Approve a request (admin only)
router.patch('/:id/approve', protect, restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    const { message } = req.body;
    const adminId = req.nurse._id;
    
    const request = await UnavailabilityRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    await request.approve(adminId, message);

    // Create notification for the nurse
    try {
      await Notification.create({
        type: 'AVAILABILITY_RESPONSE',
        title: 'Unavailability Request Approved',
        message: `Your unavailability request has been approved. ${message || 'You will not be scheduled for the requested dates/shifts.'}`,
        recipientNurseId: request.nurseCode,
        recipientNurseName: request.nurseName,
        recipientType: 'nurse',
        senderType: 'admin',
        senderId: req.nurse.nurseId,
        senderName: req.nurse.name,
        priority: 'medium',
        status: 'sent'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Request approved successfully',
      data: request
    });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

// PATCH /api/unavailability/:id/reject - Reject a request (admin only)
router.patch('/:id/reject', protect, restrictTo('admin', 'charge_nurse'), async (req, res) => {
  try {
    const { message } = req.body;
    const adminId = req.nurse._id;
    
    const request = await UnavailabilityRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    await request.reject(adminId, message);

    // Create notification for the nurse
    try {
      await Notification.create({
        type: 'AVAILABILITY_RESPONSE',
        title: 'Unavailability Request Rejected',
        message: `Your unavailability request has been rejected. ${message || 'Please contact administration for more information.'}`,
        recipientNurseId: request.nurseCode,
        recipientNurseName: request.nurseName,
        recipientType: 'nurse',
        senderType: 'admin',
        senderId: req.nurse.nurseId,
        senderName: req.nurse.name,
        priority: 'medium',
        status: 'sent'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Request rejected',
      data: request
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  }
});

// DELETE /api/unavailability/:id - Delete a request (nurse can delete their own, admin can delete any)
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await UnavailabilityRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    // Check if nurse owns the request or is admin
    const isOwner = request.nurseId.toString() === req.nurse._id.toString();
    const isAdmin = req.nurse.role === 'admin' || req.nurse.role === 'charge_nurse';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this request'
      });
    }

    await UnavailabilityRequest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete request',
      error: error.message
    });
  }
});

export default router;

