import express from 'express';
import Schedule from '../models/Schedule.js';
import Notification from '../models/Notification.js';
import { protect } from './auth.js';

const router = express.Router();

// Middleware to protect all routes
router.use(protect);

// GET NURSE DASHBOARD DATA
router.get('/', async (req, res) => {
  try {
    console.log('=== DASHBOARD REQUEST RECEIVED ===');
    console.log('Request user:', req.nurse ? {
      id: req.nurse._id,
      nurseId: req.nurse.nurseId,
      name: req.nurse.name
    } : 'NO USER');
    
    if (!req.nurse) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const nurseId = req.nurse._id; // Use ObjectId for matching schedule entries
    const nurseCode = req.nurse.nurseId; // Human-readable nurse code for notifications
    const currentDate = new Date();
    
    console.log(`Dashboard request for nurse: ${nurseCode} (${nurseId})`);
    
    // Get current week's schedule (Sunday to Saturday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log(`Week calculation: Current date=${currentDate.toISOString().split('T')[0]}, Week=${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);

    // Find schedules that include this nurse and overlap with current week
    // Don't use .lean() so we can use the model's getAssignmentsForNurse method
    // IMPORTANT: Mongoose Maps need to be retrieved without .lean() to preserve Map type
    // Also check ALL active schedules regardless of date range, then filter by dates
    const allSchedules = await Schedule.find({
      status: { $in: ['ACTIVE', 'APPROVED', 'DRAFT'] }
    }).exec();
    
    console.log(`Found ${allSchedules.length} total active schedules`);
    
    // Filter schedules that overlap with the week
    const schedules = allSchedules.filter(schedule => {
      const overlaps = schedule.startDate <= endOfWeek && schedule.endDate >= startOfWeek;
      if (overlaps) {
        console.log(`  Schedule ${schedule._id} overlaps: ${schedule.startDate.toISOString()} to ${schedule.endDate.toISOString()}`);
      }
      return overlaps;
    });
    
    console.log(`Filtered to ${schedules.length} schedules that overlap with week ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);

    console.log(`Found ${schedules.length} schedule(s) for week ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);
    
    if (schedules.length === 0) {
      console.log(`No schedules found for week ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);
      console.log(`Current date: ${currentDate.toISOString().split('T')[0]}`);
      console.log(`Week start: ${startOfWeek.toISOString()}, Week end: ${endOfWeek.toISOString()}`);
    }

    // Extract nurse's assignments for the current week
    let weeklyAssignments = {};
    let upcomingShifts = [];
    let totalHoursThisWeek = 0;
    let weeklyShiftCounts = { DAY: 0, EVENING: 0, NIGHT: 0 }; // Track weekly shift distribution
    let processedShifts = new Set(); // Track processed shifts to prevent duplicates

    console.log(`\n=== PROCESSING ${schedules.length} SCHEDULE(S) FOR WEEK ===`);
    schedules.forEach((schedule, scheduleIndex) => {
      console.log(`\n=== Processing schedule ${scheduleIndex + 1}/${schedules.length}: ${schedule._id} ===`);
      console.log(`  Ward: ${schedule.wardName}`);
      console.log(`  Status: ${schedule.status}`);
      console.log(`  Schedule dates: ${schedule.startDate.toISOString().split('T')[0]} to ${schedule.endDate.toISOString().split('T')[0]}`);
      console.log(`  Week range: ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);
      console.log(`  Date overlap check: startDate <= endOfWeek? ${schedule.startDate <= endOfWeek}, endDate >= startOfWeek? ${schedule.endDate >= startOfWeek}`);
      
      // Check scheduleData structure
      console.log(`  scheduleData type: ${schedule.scheduleData?.constructor?.name || typeof schedule.scheduleData}`);
      console.log(`  scheduleData size: ${schedule.scheduleData instanceof Map ? schedule.scheduleData.size : schedule.scheduleData ? Object.keys(schedule.scheduleData).length : 0}`);
      
      // Use the model's built-in method which properly handles Map structures
      let nurseAssignments = {};
      try {
        if (schedule.getAssignmentsForNurse) {
          console.log(`  Calling getAssignmentsForNurse with nurseId: ${nurseId} (type: ${nurseId.constructor.name})`);
          nurseAssignments = schedule.getAssignmentsForNurse(nurseId);
          console.log(`  getAssignmentsForNurse returned ${Object.keys(nurseAssignments).length} days`);
          
          // Debug: log what assignments were found
          if (Object.keys(nurseAssignments).length > 0) {
            Object.keys(nurseAssignments).forEach(dateKey => {
              const shifts = Object.keys(nurseAssignments[dateKey].shifts || {});
              console.log(`    Found assignments for ${dateKey}: ${shifts.join(', ')}`);
            });
          } else {
            console.log(`  WARNING: No assignments found for nurse ${nurseCode} (${nurseId}) in schedule ${schedule._id}`);
            
            // Debug: check what nurses ARE in the schedule
            if (schedule.scheduleData) {
              const scheduleEntries = schedule.scheduleData instanceof Map ? 
                Array.from(schedule.scheduleData.entries()) : 
                Object.entries(schedule.scheduleData);
              
              if (scheduleEntries.length > 0) {
                const firstDay = scheduleEntries[0][1];
                if (firstDay && firstDay.shifts) {
                  ['DAY', 'EVENING', 'NIGHT'].forEach(shiftType => {
                    const nurses = firstDay.shifts[shiftType]?.nurses || [];
                    if (nurses.length > 0) {
                      console.log(`    ${shiftType} shift nurses in schedule:`, nurses.map(n => {
                        const nId = n.nurseId?.toString ? n.nurseId.toString() : String(n.nurseId);
                        return `${n.nurseName}(${nId})`;
                      }).join(', '));
                    }
                  });
                }
                console.log(`    Looking for nurse ID: ${nurseId.toString()}`);
              }
            }
          }
        } else {
          console.log(`  Schedule doesn't have getAssignmentsForNurse method, using extractNurseAssignments`);
          const safeObj = schedule.toSafeObject ? schedule.toSafeObject() : schedule;
          nurseAssignments = extractNurseAssignments(safeObj, nurseId.toString());
          console.log(`  extractNurseAssignments returned ${Object.keys(nurseAssignments).length} days`);
        }
      } catch (err) {
        console.error(`  ERROR extracting assignments from schedule ${schedule._id}:`, err.message);
        console.error(`  Stack:`, err.stack);
        // Fallback to extraction helper
        const safeObj = schedule.toSafeObject ? schedule.toSafeObject() : schedule;
        nurseAssignments = extractNurseAssignments(safeObj, nurseId.toString());
      }
      
      Object.entries(nurseAssignments).forEach(([dateKey, dayData]) => {
        if (!dayData || !dayData.shifts) return;
        
        const assignmentDate = new Date(dayData.date || dateKey);
        assignmentDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Check if assignment is within current week
        if (assignmentDate >= startOfWeek && assignmentDate <= endOfWeek) {
          // Only add to weeklyAssignments if this nurse has actual assignments
          let hasAssignmentForThisNurse = false;
          
          // Count hours and upcoming shifts - check each shift type
          // Note: getAssignmentsForNurse already filters shifts for this nurse
          // So each shift object is the assignment for this nurse
          Object.entries(dayData.shifts).forEach(([shiftType, shift]) => {
            if (!shift) return;
            
            // CRITICAL: Check if shift is the full shiftData object (with nurses array) instead of assignment object
            // If shift has a 'nurses' property that's an array, it's the full shiftData, not the assignment
            if (Array.isArray(shift.nurses) && shift.nurses.length > 0) {
              console.log(`  ERROR: Shift ${shiftType} on ${dateKey} is full shiftData object with ${shift.nurses.length} nurses, not assignment!`);
              console.log(`  This means getAssignmentsForNurse returned wrong structure!`);
              // Find the specific nurse's assignment from the nurses array
              const assignment = shift.nurses.find(n => {
                const nId = n.nurseId?.toString ? n.nurseId.toString() : String(n.nurseId || '');
                return nId === nurseId.toString();
              });
              if (!assignment) {
                console.log(`  No assignment found for nurse ${nurseId} in shift ${shiftType} on ${dateKey}`);
                return; // Skip if no assignment for this nurse
              }
              // Use the assignment object instead
              shift = assignment;
            }
            
            // Double-check that this shift is for the current nurse
            // The shift object from getAssignmentsForNurse should be the nurse assignment object
            // It should have nurseId, nurseName, hours properties
            const shiftNurseId = shift.nurseId?.toString ? shift.nurseId.toString() : (shift.nurseId ? String(shift.nurseId) : null);
            
            // If nurseId doesn't match, skip (shouldn't happen if getAssignmentsForNurse worked correctly)
            if (shiftNurseId && shiftNurseId !== nurseId.toString()) {
              console.log(`  WARNING: Shift ${shiftType} on ${dateKey} has different nurseId (${shiftNurseId} vs ${nurseId})`);
              return;
            }
            
            // Only count if this shift is assigned to this nurse
            hasAssignmentForThisNurse = true;
            
            // Create unique key for this shift to prevent duplicate counting
            // Use only date and shiftType (not schedule._id) because a nurse can only work one shift per day
            // Even if the same shift appears in multiple schedules, it should only be counted once
            const shiftKey = `${dateKey}-${shiftType}`;
            if (processedShifts.has(shiftKey)) {
              console.log(`  SKIP: Already counted ${shiftType} shift on ${dateKey} (duplicate - already processed from another schedule)`);
              return; // Skip if already counted
            }
            processedShifts.add(shiftKey);
            
            const shiftHours = shift.hours || (shiftType === 'NIGHT' ? 12 : 8);
            
            // Validate hours - should be 8 or 12, not 80 or 800
            if (shiftHours > 24) {
              console.log(`  WARNING: Shift hours seem incorrect: ${shiftHours}h for ${shiftType} shift on ${dateKey}`);
              console.log(`  Shift object:`, JSON.stringify(shift, null, 2));
            }
            
            // Count this shift only once
            console.log(`  Counting ${shiftType} shift on ${dateKey}: ${shiftHours}h (nurse: ${shift.nurseName || 'unknown'}, key: ${shiftKey})`);
            console.log(`  Before: totalHoursThisWeek=${totalHoursThisWeek}, weeklyShiftCounts[${shiftType}]=${weeklyShiftCounts[shiftType]}`);
            totalHoursThisWeek += shiftHours;
            weeklyShiftCounts[shiftType] = (weeklyShiftCounts[shiftType] || 0) + 1;
            console.log(`  After: totalHoursThisWeek=${totalHoursThisWeek}, weeklyShiftCounts[${shiftType}]=${weeklyShiftCounts[shiftType]}`);
            
            // If shift is in the future, add to upcoming
            if (assignmentDate >= currentDate) {
              upcomingShifts.push({
                date: dayData.date || dateKey,
                shift: shiftType,
                ward: schedule.wardName,
                hours: shiftHours
              });
            }
          });
          
          // Only add to weeklyAssignments if nurse has assignments
          if (hasAssignmentForThisNurse) {
            weeklyAssignments[dateKey] = dayData;
          }
        }
      });
    });

    // Sort upcoming shifts by date
    upcomingShifts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get recent notifications
    const notifications = await Notification.findUnreadForNurse(nurseCode)
      .limit(5)
      .lean() || [];

    // Get next 30 days schedule
    const next30Days = new Date(currentDate);
    next30Days.setDate(currentDate.getDate() + 30);

    const futureSchedules = await Schedule.find({
      status: { $in: ['ACTIVE', 'APPROVED', 'DRAFT'] },
      startDate: { $lte: next30Days },
      endDate: { $gte: currentDate }
    });

    let monthlyAssignments = {};
    let totalHoursNext30Days = 0;
    let shiftCounts = { DAY: 0, EVENING: 0, NIGHT: 0 };

    futureSchedules.forEach(schedule => {
      // Use the model's built-in method which properly handles Map structures
      let nurseAssignments = {};
      try {
        if (schedule.getAssignmentsForNurse) {
          nurseAssignments = schedule.getAssignmentsForNurse(nurseId);
        } else {
          const safeObj = schedule.toSafeObject ? schedule.toSafeObject() : schedule;
          nurseAssignments = extractNurseAssignments(safeObj, nurseId.toString());
        }
      } catch (err) {
        console.error(`Error extracting assignments from schedule ${schedule._id}:`, err.message);
        // Fallback to extraction helper
        const safeObj = schedule.toSafeObject ? schedule.toSafeObject() : schedule;
        nurseAssignments = extractNurseAssignments(safeObj, nurseId.toString());
      }
      
      Object.entries(nurseAssignments).forEach(([dateKey, dayData]) => {
        if (!dayData || !dayData.shifts) return;
        
        const assignmentDate = new Date(dayData.date || dateKey);
        assignmentDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        if (assignmentDate >= currentDate && assignmentDate <= next30Days) {
          // Only count shifts assigned to this nurse
          // Note: getAssignmentsForNurse already filters shifts for this nurse
          let hasAssignmentForThisNurse = false;
          
          Object.entries(dayData.shifts).forEach(([shiftType, shift]) => {
            if (!shift) return;
            
            // The shift from getAssignmentsForNurse is already filtered for this nurse
            // So if it exists, it's for this nurse
            hasAssignmentForThisNurse = true;
            const shiftHours = shift.hours || (shiftType === 'NIGHT' ? 12 : 8);
            totalHoursNext30Days += shiftHours;
            shiftCounts[shiftType] = (shiftCounts[shiftType] || 0) + 1;
          });
          
          // Only add to monthlyAssignments if nurse has assignments
          if (hasAssignmentForThisNurse) {
            monthlyAssignments[dateKey] = dayData;
          }
        }
      });
    });

    // Calculate statistics - count actual shifts from weeklyShiftCounts instead of recounting
    // This ensures consistency with the hours calculation
    let shiftsThisWeekCount = weeklyShiftCounts.DAY + weeklyShiftCounts.EVENING + weeklyShiftCounts.NIGHT;
    
    console.log(`\n=== SHIFT COUNT CALCULATION ===`);
    console.log(`shiftsThisWeekCount from weeklyShiftCounts: ${shiftsThisWeekCount}`);
    console.log(`weeklyShiftCounts breakdown:`, weeklyShiftCounts);
    
    // Also calculate from weeklyAssignments for verification
    let shiftsFromAssignments = 0;
    Object.values(weeklyAssignments).forEach(dayData => {
      shiftsFromAssignments += Object.keys(dayData.shifts || {}).length;
    });
    console.log(`shiftsFromAssignments count: ${shiftsFromAssignments}`);
    if (shiftsThisWeekCount !== shiftsFromAssignments) {
      console.log(`WARNING: Mismatch! shiftsThisWeekCount (${shiftsThisWeekCount}) != shiftsFromAssignments (${shiftsFromAssignments})`);
    }
    
    let shiftsNext30DaysCount = 0;
    Object.values(monthlyAssignments).forEach(dayData => {
      shiftsNext30DaysCount += Object.keys(dayData.shifts || {}).length;
    });

    const stats = {
      hoursThisWeek: totalHoursThisWeek,
      hoursNext30Days: totalHoursNext30Days,
      shiftsThisWeek: shiftsThisWeekCount,
      shiftsNext30Days: shiftsNext30DaysCount,
      shiftDistribution: weeklyShiftCounts, // Use weekly distribution instead of 30-day
      unreadNotifications: notifications.filter(n => n.status !== 'read').length
    };
    
    console.log(`\n=== FINAL DASHBOARD STATS ===`);
    console.log(`Nurse: ${nurseCode} (${nurseId})`);
    console.log(`Total schedules processed: ${schedules.length}`);
    console.log(`Total unique shifts processed: ${processedShifts.size}`);
    console.log(`Hours this week: ${totalHoursThisWeek} (expected: ~40h for 5 shifts)`);
    console.log(`Shifts this week: ${shiftsThisWeekCount} (expected: 5)`);
    console.log(`Hours next 30 days: ${totalHoursNext30Days}`);
    console.log(`Shifts next 30 days: ${shiftsNext30DaysCount}`);
    console.log(`Upcoming shifts: ${upcomingShifts.length}`);
    console.log(`Weekly assignments days: ${Object.keys(weeklyAssignments).length}`);
    console.log(`Weekly assignments dates:`, Object.keys(weeklyAssignments));
    console.log(`Weekly shift distribution:`, weeklyShiftCounts);
    console.log(`  Expected: DAY=0, EVENING=3, NIGHT=2 (total=5)`);
    console.log(`30-day shift distribution:`, shiftCounts);
    console.log(`Monthly assignments days: ${Object.keys(monthlyAssignments).length}`);
    console.log(`===========================\n`);

    res.status(200).json({
      success: true,
      data: {
        nurse: {
          id: req.nurse._id,
          nurseId: req.nurse.nurseId,
          name: req.nurse.name,
          role: req.nurse.role,
          wardAccess: req.nurse.wardAccess
        },
        weeklySchedule: weeklyAssignments,
        upcomingShifts: upcomingShifts.slice(0, 10), // Next 10 shifts
        recentNotifications: notifications,
        statistics: stats,
        currentWeek: {
          start: startOfWeek,
          end: endOfWeek
        }
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// GET NURSE'S FULL SCHEDULE
router.get('/schedule', async (req, res) => {
  try {
    const nurseId = req.nurse.nurseId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : (() => {
      const end = new Date(startDate);
      end.setDate(startDate.getDate() + 30); // Default 30 days
      return end;
    })();

    // Find schedules that include this nurse and overlap with requested period
    const schedules = await Schedule.find({
      status: { $in: ['ACTIVE', 'APPROVED'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    let nurseSchedule = {};
    let totalStats = {
      totalHours: 0,
      totalShifts: 0,
      shiftDistribution: { DAY: 0, EVENING: 0, NIGHT: 0 }
    };

    schedules.forEach(schedule => {
      const nurseAssignments = extractNurseAssignments(schedule, nurseId);
      
      Object.entries(nurseAssignments).forEach(([dateKey, dayData]) => {
        const assignmentDate = new Date(dayData.date);
        
        if (assignmentDate >= startDate && assignmentDate <= endDate) {
          nurseSchedule[dateKey] = {
            ...dayData,
            scheduleId: schedule._id,
            wardName: schedule.wardName,
            status: schedule.status
          };
          
          // Update statistics
          Object.entries(dayData.shifts).forEach(([shiftType, shift]) => {
            totalStats.totalHours += shift.hours || 8;
            totalStats.totalShifts += 1;
            totalStats.shiftDistribution[shiftType] = (totalStats.shiftDistribution[shiftType] || 0) + 1;
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: {
        schedule: nurseSchedule,
        period: {
          startDate,
          endDate
        },
        statistics: totalStats
      }
    });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
});

// GET NURSE'S AVAILABILITY REQUESTS
router.get('/availability-requests', async (req, res) => {
  try {
    const requests = await Notification.find({
      type: 'AVAILABILITY_REQUEST',
      senderId: req.nurse.nurseId
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error('Availability requests fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching availability requests',
      error: error.message
    });
  }
});

// HELPER FUNCTION to extract nurse assignments from schedule
function extractNurseAssignments(schedule, nurseId) {
  const assignments = {};
  
  if (!schedule.scheduleData) return assignments;
  
  // Handle both Map and Object structures
  const scheduleDataEntries = schedule.scheduleData instanceof Map ? 
    Array.from(schedule.scheduleData.entries()) : 
    Object.entries(schedule.scheduleData);
  
  scheduleDataEntries.forEach(([dateKey, dayData]) => {
    if (!dayData || !dayData.shifts) return;
    
    const nurseShifts = {};
    
    // Check each shift type
    Object.entries(dayData.shifts).forEach(([shiftType, shiftData]) => {
      if (!shiftData || !shiftData.nurses) return;
      
      // Handle ObjectId matching: can be ObjectId object, string, or need conversion
      const nurseAssignment = shiftData.nurses.find(nurse => {
        if (!nurse || !nurse.nurseId) return false;
        
        // Normalize both sides to strings for comparison
        const nurseIdStr = typeof nurse.nurseId === 'object' && nurse.nurseId.toString ? 
          nurse.nurseId.toString() : 
          String(nurse.nurseId);
        const targetIdStr = String(nurseId);
        
        return nurseIdStr === targetIdStr;
      });
      
      if (nurseAssignment) {
        nurseShifts[shiftType] = {
          ...nurseAssignment,
          requiredNurses: shiftData.requiredNurses,
          actualNurses: shiftData.actualNurses,
          coverage: shiftData.coverage
        };
      }
    });
    
    if (Object.keys(nurseShifts).length > 0) {
      assignments[dateKey] = {
        date: dayData.date || dateKey,
        shifts: nurseShifts
      };
    }
  });
  
  return assignments;
}

export default router;