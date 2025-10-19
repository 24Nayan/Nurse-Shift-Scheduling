// Simple debug endpoint to test const assignment
import express from 'express';

const router = express.Router();

router.post('/debug-const', async (req, res) => {
  console.log('🐛 Testing const assignment...');
  
  try {
    // Test various const assignments that might cause issues
    const testArray = [];
    console.log('✅ const testArray = [] - OK');
    
    const testObject = {};
    console.log('✅ const testObject = {} - OK');
    
    // Test array modification
    testArray.push('test');
    console.log('✅ testArray.push() - OK');
    
    // Test object property assignment
    testObject.test = 'value';
    console.log('✅ testObject.test = value - OK');
    
    // Test for...of loop with const
    for (const item of ['DAY', 'EVENING', 'NIGHT']) {
      console.log(`Processing: ${item}`);
    }
    console.log('✅ for...of with const - OK');
    
    // Test forEach with const
    ['test1', 'test2'].forEach(item => {
      console.log(`ForEach item: ${item}`);
    });
    console.log('✅ forEach with const callback - OK');
    
    res.json({
      success: true,
      message: 'All const tests passed',
      tests: [
        'const array declaration',
        'const object declaration', 
        'array.push()',
        'object property assignment',
        'for...of with const',
        'forEach callback'
      ]
    });
    
  } catch (error) {
    console.error('❌ Debug const error:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Const test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;