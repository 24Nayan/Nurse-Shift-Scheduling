import express from 'express';
import Nurse from '../models/Nurse.js';

const router = express.Router();

// GET /api/nurses - Get all nurses with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      role, 
      ward, 
      isActive = 'true', 
      page = 1, 
      limit = 50,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    let filter = { isActive: isActive === 'true' };
    
    if (role) filter.role = role;
    if (ward) filter.wardAccess = { $in: [ward] };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { nurseId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const nurses = await Nurse.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    // Get total count for pagination
    const total = await Nurse.countDocuments(filter);
    
    res.json({
      success: true,
      count: nurses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: nurses
    });
  } catch (error) {
    console.error('Get nurses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurses',
      error: error.message
    });
  }
});

// GET /api/nurses/statistics - Get nurse statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Nurse.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get nurse statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurse statistics',
      error: error.message
    });
  }
});

// GET /api/nurses/:id - Get single nurse by ID
router.get('/:id', async (req, res) => {
  try {
    const nurse = await Nurse.findById(req.params.id).select('-__v');
    
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }
    
    res.json({
      success: true,
      data: nurse
    });
  } catch (error) {
    console.error('Get nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurse',
      error: error.message
    });
  }
});

// POST /api/nurses - Create new nurse
router.post('/', async (req, res) => {
  try {
    const nurseData = req.body;
    
    // Convert comma-separated strings to arrays if they exist
    if (typeof nurseData.qualifications === 'string') {
      nurseData.qualifications = nurseData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    }
    
    if (typeof nurseData.wardAccess === 'string') {
      nurseData.wardAccess = nurseData.wardAccess
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
    }
    
    // Create new nurse
    const nurse = new Nurse(nurseData);
    const savedNurse = await nurse.save();
    
    res.status(201).json({
      success: true,
      message: 'Nurse created successfully',
      data: savedNurse
    });
  } catch (error) {
    console.error('Create nurse error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Nurse ID';
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists`
      });
    }
    
    // Handle validation errors
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
      message: 'Failed to create nurse',
      error: error.message
    });
  }
});

// PUT /api/nurses/:id - Update nurse
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    
    // Convert comma-separated strings to arrays if they exist
    if (typeof updateData.qualifications === 'string') {
      updateData.qualifications = updateData.qualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    }
    
    if (typeof updateData.wardAccess === 'string') {
      updateData.wardAccess = updateData.wardAccess
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;
    
    const nurse = await Nurse.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        select: '-__v'
      }
    );
    
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Nurse updated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Update nurse error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'email' ? 'Email' : 'Nurse ID';
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists`
      });
    }
    
    // Handle validation errors
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
      message: 'Failed to update nurse',
      error: error.message
    });
  }
});

// PATCH /api/nurses/:id/activate - Activate nurse
router.patch('/:id/activate', async (req, res) => {
  try {
    const nurse = await Nurse.findById(req.params.id);
    
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }
    
    await nurse.activate();
    
    res.json({
      success: true,
      message: 'Nurse activated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Activate nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate nurse',
      error: error.message
    });
  }
});

// PATCH /api/nurses/:id/deactivate - Deactivate nurse (soft delete)
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const nurse = await Nurse.findById(req.params.id);
    
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }
    
    await nurse.deactivate();
    
    res.json({
      success: true,
      message: 'Nurse deactivated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Deactivate nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate nurse',
      error: error.message
    });
  }
});

// DELETE /api/nurses/:id - Hard delete nurse (use with caution)
router.delete('/:id', async (req, res) => {
  try {
    const nurse = await Nurse.findByIdAndDelete(req.params.id);
    
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Nurse deleted permanently',
      data: nurse
    });
  } catch (error) {
    console.error('Delete nurse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete nurse',
      error: error.message
    });
  }
});

// GET /api/nurses/ward/:wardName - Get nurses by ward
router.get('/ward/:wardName', async (req, res) => {
  try {
    const nurses = await Nurse.findByWard(req.params.wardName);
    
    res.json({
      success: true,
      count: nurses.length,
      data: nurses
    });
  } catch (error) {
    console.error('Get nurses by ward error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurses by ward',
      error: error.message
    });
  }
});

// GET /api/nurses/role/:role - Get nurses by role
router.get('/role/:role', async (req, res) => {
  try {
    const nurses = await Nurse.findByRole(req.params.role);
    
    res.json({
      success: true,
      count: nurses.length,
      data: nurses
    });
  } catch (error) {
    console.error('Get nurses by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurses by role',
      error: error.message
    });
  }
});

export default router;