import express from 'express';
import Ward from '../models/Ward.js';

const router = express.Router();

// GET /api/wards - Get all wards with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      patientType, 
      qualification,
      minCapacity,
      maxCapacity,
      isActive
    } = req.query;

    // Build filter object
    const filter = {};
    // Only filter by isActive if explicitly provided in query
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (patientType) filter.patientTypes = { $in: [patientType] };
    if (qualification) filter.qualifications = { $in: [qualification] };
    if (minCapacity || maxCapacity) {
      filter.capacity = {};
      if (minCapacity) filter.capacity.$gte = parseInt(minCapacity);
      if (maxCapacity) filter.capacity.$lte = parseInt(maxCapacity);
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const wards = await Ward.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Ward.countDocuments(filter);
    const pages = Math.ceil(total / limitNum);

    const safeWards = wards.map(ward => ward.toSafeObject());

    res.json({
      success: true,
      data: safeWards,
      pagination: {
        page: pageNum,
        pages,
        total,
        count: wards.length
      }
    });
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch wards',
      details: error.message
    });
  }
});

// GET /api/wards/stats - Get ward statistics
router.get('/stats', async (req, res) => {
  try {
    const totalWards = await Ward.countDocuments({ isActive: true });
    
    const capacityResult = await Ward.getTotalCapacity();
    const totalCapacity = capacityResult.length > 0 ? capacityResult[0].totalCapacity : 0;
    
    const staffResult = await Ward.getTotalDailyStaffNeed();
    const totalDailyStaff = staffResult.length > 0 ? staffResult[0].totalDailyStaff : 0;

    // Get qualifications distribution
    const qualificationsStats = await Ward.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$qualifications' },
      { $group: { _id: '$qualifications', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get patient types distribution
    const patientTypesStats = await Ward.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$patientTypes' },
      { $group: { _id: '$patientTypes', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalWards,
        totalCapacity,
        totalDailyStaff,
        qualificationsDistribution: qualificationsStats,
        patientTypesDistribution: patientTypesStats
      }
    });
  } catch (error) {
    console.error('Get ward stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch ward statistics',
      details: error.message
    });
  }
});

// GET /api/wards/:id - Get single ward by ID
router.get('/:id', async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);
    
    if (!ward) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Ward not found'
      });
    }

    res.json({
      success: true,
      data: ward.toSafeObject()
    });
  } catch (error) {
    console.error('Get ward by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Invalid ward ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch ward',
      details: error.message
    });
  }
});

// POST /api/wards - Create new ward
router.post('/', async (req, res) => {
  try {
    const wardData = { ...req.body };

    // Validate required fields
    const requiredFields = ['name', 'department', 'capacity', 'qualifications', 'patientTypes', 'shiftRequirements'];
    const missingFields = requiredFields.filter(field => !wardData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate shift requirements structure
    if (!wardData.shiftRequirements.day || !wardData.shiftRequirements.night || !wardData.shiftRequirements.evening) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Shift requirements must include day, night, and evening shifts'
      });
    }

    // Process arrays if they come as strings
    if (typeof wardData.qualifications === 'string') {
      wardData.qualifications = wardData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q);
    }

    if (typeof wardData.patientTypes === 'string') {
      wardData.patientTypes = wardData.patientTypes
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    }

    // Create new ward
    const ward = new Ward(wardData);
    await ward.save();

    console.log('Ward created successfully:', ward.name);

    res.status(201).json({
      success: true,
      data: ward.toSafeObject(),
      message: 'Ward created successfully'
    });
  } catch (error) {
    console.error('Create ward error:', error);

    if (error.name === 'ValidationError') {
      // Handle both validation errors and our custom duplicate name error
      if (error.message === 'Ward name already exists') {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'Ward name already exists'
        });
      }
      
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Ward validation failed',
        details: validationErrors.length > 0 ? validationErrors : [error.message]
      });
    }

    if (error.code === 11000 || error.message === 'Ward name already exists') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Ward name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create ward',
      details: error.message
    });
  }
});

// PUT /api/wards/:id - Update ward
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Process arrays if they come as strings
    if (typeof updateData.qualifications === 'string') {
      updateData.qualifications = updateData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q);
    }

    if (typeof updateData.patientTypes === 'string') {
      updateData.patientTypes = updateData.patientTypes
        .split(',')
        .map(p => p.trim())
        .filter(p => p);
    }

    // Update the ward
    const ward = await Ward.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Ward not found'
      });
    }

    console.log('Ward updated successfully:', ward.name);

    res.json({
      success: true,
      data: ward.toSafeObject(),
      message: 'Ward updated successfully'
    });
  } catch (error) {
    console.error('Update ward error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Invalid ward ID format'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Ward validation failed',
        details: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Ward name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update ward',
      details: error.message
    });
  }
});

// DELETE /api/wards/:id - Delete ward (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const ward = await Ward.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false, updatedAt: new Date() } },
      { new: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Ward not found'
      });
    }

    console.log('Ward deleted successfully:', ward.name);

    res.json({
      success: true,
      data: ward.toSafeObject(),
      message: 'Ward deleted successfully'
    });
  } catch (error) {
    console.error('Delete ward error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Invalid ward ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete ward',
      details: error.message
    });
  }
});

// PATCH /api/wards/:id/activate - Reactivate a deleted ward
router.patch('/:id/activate', async (req, res) => {
  try {
    const ward = await Ward.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true, updatedAt: new Date() } },
      { new: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Ward not found'
      });
    }

    console.log('Ward reactivated successfully:', ward.name);

    res.json({
      success: true,
      data: ward.toSafeObject(),
      message: 'Ward reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate ward error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: 'Invalid ward ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to reactivate ward',
      details: error.message
    });
  }
});

// GET /api/wards/patient-types/:patientType - Get wards by patient type
router.get('/patient-types/:patientType', async (req, res) => {
  try {
    const wards = await Ward.findByPatientType(req.params.patientType);
    
    const safeWards = wards.map(ward => ward.toSafeObject());

    res.json({
      success: true,
      data: safeWards,
      count: wards.length
    });
  } catch (error) {
    console.error('Get wards by patient type error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch wards by patient type',
      details: error.message
    });
  }
});

// GET /api/wards/qualifications/:qualification - Get wards by qualification
router.get('/qualifications/:qualification', async (req, res) => {
  try {
    const wards = await Ward.findByQualification(req.params.qualification);
    
    const safeWards = wards.map(ward => ward.toSafeObject());

    res.json({
      success: true,
      data: safeWards,
      count: wards.length
    });
  } catch (error) {
    console.error('Get wards by qualification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch wards by qualification',
      details: error.message
    });
  }
});

export default router;