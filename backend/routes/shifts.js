import express from 'express';
import Shift from '../models/Shift.js';

const router = express.Router();

// GET /api/shifts - Get all shifts with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      ward, 
      type, 
      isActive = 'true',
      page = 1,
      limit = 50,
      sortBy = 'startTime',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter object
    let filter = { isActive: isActive === 'true' };
    
    if (ward) filter.ward = ward;
    if (type) filter.type = type;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const shifts = await Shift.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Shift.countDocuments(filter);
    
    res.json({
      success: true,
      count: shifts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: shifts
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: error.message
    });
  }
});

// GET /api/shifts/:id - Get single shift by ID
router.get('/:id', async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).select('-__v');
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift',
      error: error.message
    });
  }
});

// POST /api/shifts - Create new shift
router.post('/', async (req, res) => {
  try {
    const shift = new Shift(req.body);
    const savedShift = await shift.save();
    
    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: savedShift
    });
  } catch (error) {
    console.error('Create shift error:', error);
    
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
      message: 'Failed to create shift',
      error: error.message
    });
  }
});

// PUT /api/shifts/:id - Update shift
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;
    
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        select: '-__v'
      }
    );
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    console.error('Update shift error:', error);
    
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
      message: 'Failed to update shift',
      error: error.message
    });
  }
});

// DELETE /api/shifts/:id - Delete shift (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Shift deactivated successfully',
      data: shift
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift',
      error: error.message
    });
  }
});

// GET /api/shifts/ward/:wardName - Get shifts by ward
router.get('/ward/:wardName', async (req, res) => {
  try {
    const shifts = await Shift.findByWard(req.params.wardName);
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Get shifts by ward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts by ward',
      error: error.message
    });
  }
});

// GET /api/shifts/type/:type - Get shifts by type
router.get('/type/:type', async (req, res) => {
  try {
    const shifts = await Shift.findByType(req.params.type);
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('Get shifts by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts by type',
      error: error.message
    });
  }
});

export default router;