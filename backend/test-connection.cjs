const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB connection...');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('✓ MongoDB connected successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('✗ MongoDB connection failed:', error);
    process.exit(1);
});

// Set a timeout to avoid hanging
setTimeout(() => {
    console.log('Connection timeout - exiting');
    process.exit(1);
}, 10000);
