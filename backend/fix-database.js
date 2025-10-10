import mongoose from 'mongoose';
import Ward from './models/Ward.js';

async function fixDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/shift_scheduling');
    
    console.log('Checking and fixing ward indexes...');
    
    // Get current indexes
    const indexes = await Ward.collection.getIndexes();
    console.log('Current indexes:', Object.keys(indexes));
    
    // Drop old problematic indexes if they exist
    try {
      await Ward.collection.dropIndex('name_1');
      console.log('✓ Dropped old name_1 index');
    } catch (e) {
      console.log('- name_1 index does not exist');
    }
    
    // Ensure correct indexes are created
    await Ward.collection.createIndex(
      { name: 1, isActive: 1 }, 
      { 
        unique: true, 
        partialFilterExpression: { isActive: true },
        name: 'name_1_isActive_1_partial'
      }
    );
    console.log('✓ Created partial unique index for active wards');
    
    // Create other performance indexes
    await Ward.collection.createIndex({ isActive: 1 }, { name: 'isActive_1' });
    console.log('✓ Created isActive index');
    
    console.log('Database fixes completed successfully!');
    
  } catch (error) {
    console.error('Error fixing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixDatabase();