import express from 'express';
import Schedule from '../models/Schedule.js';

const router = express.Router();

// GET /api/schedules - Get all schedules with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      ward, 
      status, 
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (ward) filter.ward = ward;
    if (status) filter.status = status;
    
    // Date range filtering
    if (startDate || endDate) {
      filter.$and = [];
      if (startDate) {
        filter.$and.push({ startDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        filter.$and.push({ endDate: { $lte: new Date(endDate) } });
      }
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with population
    const schedules = await Schedule.find(filter)
      .populate('createdBy', 'name nurseId')
      .populate('approvedBy', 'name nurseId')
      .populate('assignments.nurse', 'name nurseId role')
      .populate('assignments.shift', 'name startTime endTime type')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Schedule.countDocuments(filter);
    
    res.json({
      success: true,
      count: schedules.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: schedules
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules',
      error: error.message
    });
  }
});

// GET /api/schedules/:id - Get single schedule by ID
router.get('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('createdBy', 'name nurseId role')
      .populate('approvedBy', 'name nurseId role')
      .populate('assignments.nurse', 'name nurseId role qualifications')
      .populate('assignments.shift', 'name startTime endTime type duration ward')
      .select('-__v');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
});

// POST /api/schedules - Create new schedule
router.post('/', async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    const savedSchedule = await schedule.save();
    
    // Populate the response
    await savedSchedule.populate('createdBy', 'name nurseId');
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: savedSchedule
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
});

// PUT /api/schedules/:id - Update schedule
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;
    
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        select: '-__v'
      }
    )
    .populate('createdBy', 'name nurseId')
    .populate('approvedBy', 'name nurseId')
    .populate('assignments.nurse', 'name nurseId role')
    .populate('assignments.shift', 'name startTime endTime type');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to update schedule',
      error: error.message
    });
  }
});

// PATCH /api/schedules/:id/publish - Publish schedule
router.patch('/:id/publish', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.publish();
    
    res.json({
      success: true,
      message: 'Schedule published successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Publish schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish schedule',
      error: error.message
    });
  }
});

// PATCH /api/schedules/:id/activate - Activate schedule
router.patch('/:id/activate', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.activate();
    
    res.json({
      success: true,
      message: 'Schedule activated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Activate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate schedule',
      error: error.message
    });
  }
});

// PATCH /api/schedules/:id/complete - Complete schedule
router.patch('/:id/complete', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await schedule.complete();
    
    res.json({
      success: true,
      message: 'Schedule completed successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Complete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete schedule',
      error: error.message
    });
  }
});

// DELETE /api/schedules/:id - Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message
    });
  }
});

// GET /api/schedules/ward/:wardName - Get schedules by ward
router.get('/ward/:wardName', async (req, res) => {
  try {
    const schedules = await Schedule.findByWard(req.params.wardName)
      .populate('createdBy', 'name nurseId')
      .select('-__v');
    
    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Get schedules by ward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules by ward',
      error: error.message
    });
  }
});

// GET /api/schedules/active - Get active schedules
router.get('/status/active', async (req, res) => {
  try {
    const schedules = await Schedule.findActive()
      .populate('createdBy', 'name nurseId')
      .populate('assignments.nurse', 'name nurseId')
      .select('-__v');
    
    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Get active schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active schedules',
      error: error.message
    });
  }
});

export default router;