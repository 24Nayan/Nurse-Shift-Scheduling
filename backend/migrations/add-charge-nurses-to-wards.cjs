const mongoose = require('mongoose');
require('dotenv').config();

// Import Ward model
const Ward = require('../models/Ward.js');

async function addChargeNursesToWards() {
    try {
        console.log('Starting migration: Adding chargeNurses fields to existing wards...');
        console.log('MongoDB URI:', process.env.MONGODB_URI);
        
        // Connect to MongoDB
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB successfully!');

        // Find all wards
        const wards = await Ward.find({});
        console.log(`Found ${wards.length} wards to update`);

        let updatedCount = 0;
        
        for (const ward of wards) {
            console.log(`\nProcessing ward: ${ward.name}`);
            
            let needsUpdate = false;
            const updateFields = {};

            // Check and update day shift
            if (ward.shiftRequirements.day && typeof ward.shiftRequirements.day.chargeNurses === 'undefined') {
                const dayStaff = ward.shiftRequirements.day.nurses || 2;
                const dayCharge = Math.max(1, Math.ceil(dayStaff / 4));
                updateFields['shiftRequirements.day.chargeNurses'] = dayCharge;
                console.log(`  Day shift: Adding ${dayCharge} charge nurses (staff: ${dayStaff})`);
                needsUpdate = true;
            }

            // Check and update evening shift
            if (ward.shiftRequirements.evening && typeof ward.shiftRequirements.evening.chargeNurses === 'undefined') {
                const eveningStaff = ward.shiftRequirements.evening.nurses || 2;
                const eveningCharge = Math.max(1, Math.ceil(eveningStaff / 4));
                updateFields['shiftRequirements.evening.chargeNurses'] = eveningCharge;
                console.log(`  Evening shift: Adding ${eveningCharge} charge nurses (staff: ${eveningStaff})`);
                needsUpdate = true;
            }

            // Check and update night shift
            if (ward.shiftRequirements.night && typeof ward.shiftRequirements.night.chargeNurses === 'undefined') {
                const nightStaff = ward.shiftRequirements.night.nurses || 2;
                const nightCharge = Math.max(1, Math.ceil(nightStaff / 4));
                updateFields['shiftRequirements.night.chargeNurses'] = nightCharge;
                console.log(`  Night shift: Adding ${nightCharge} charge nurses (staff: ${nightStaff})`);
                needsUpdate = true;
            }

            if (needsUpdate) {
                await Ward.updateOne({ _id: ward._id }, { $set: updateFields });
                updatedCount++;
                console.log(`  ✓ Updated ward: ${ward.name}`);
            } else {
                console.log(`  ✓ Ward already has chargeNurses fields: ${ward.name}`);
            }
        }

        console.log(`\n✓ Migration completed successfully!`);
        console.log(`✓ Updated ${updatedCount} wards`);
        console.log(`✓ Total wards processed: ${wards.length}`);

    } catch (error) {
        console.error('Migration failed:', error);
        console.error('Error stack:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

addChargeNursesToWards();
