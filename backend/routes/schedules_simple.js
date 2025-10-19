import express from 'express';

const router = express.Router();

// TEST endpoint to verify changes
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Simple schedules route is working', 
    timestamp: new Date().toISOString()
  });
});

// POST /api/schedules/generate - Minimal test version
router.post('/generate', async (req, res) => {
  console.log('📥 Simple generate route called');
  
  res.json({
    success: true,
    message: 'Simple schedule generation test',
    timestamp: new Date().toISOString(),
    data: {
      scheduleId: 'test-123',
      ward: req.body.wardIds?.[0] || 'test-ward',
      startDate: req.body.startDate || '2024-12-16',
      endDate: req.body.endDate || '2024-12-22'
    }
  });
});

export default router;