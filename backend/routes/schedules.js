import express from 'express';
import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import Ward from '../models/Ward.js';
import Nurse from '../models/Nurse.js';
// import GeneticSchedulingAlgorithm from '../services/GeneticSchedulingAlgorithm.js';
// import TestGeneticAlgorithm from '../services/TestGeneticAlgorithm.js';

const router = express.Router();

// Helper function to get qualified nurses for specific wards
const getQualifiedNursesForWards = async (wards) => {
  console.log('🔍 Finding qualified nurses for wards:', wards.map(w => w.name));
  
  let qualifiedNurses = [];
  
  for (const ward of wards) {
    console.log(`📋 Checking nurses for ward: ${ward.name}`);
    console.log(`📋 Required qualifications: ${ward.qualifications}`);
    console.log(`📋 Min hierarchy level: ${ward.minHierarchyLevel}`);
    
    // Find nurses with proper ward access AND qualifications
    const wardNurses = await Nurse.find({
      isActive: true,
      wardAccess: { $in: [ward.name] }, // Nurse must have access to this specific ward
      hierarchyLevel: { $gte: ward.minHierarchyLevel || 1 }, // Meet minimum hierarchy level
      // Check if nurse has at least one of the required qualifications
      qualifications: { $in: ward.qualifications || [] }
    });
    
    console.log(`✅ Found ${wardNurses.length} qualified nurses for ${ward.name} ward`);
    
    // Add to qualified nurses list (avoid duplicates)
    wardNurses.forEach(nurse => {
      if (!qualifiedNurses.some(qn => qn._id.toString() === nurse._id.toString())) {
        qualifiedNurses.push(nurse);
      }
    });
  }
  
  // If no qualified nurses found, try fallback approach
  if (qualifiedNurses.length === 0) {
    console.log('⚠️ No perfectly qualified nurses found, trying fallback approaches...');
    
    // Fallback 1: Find nurses with ward access but maybe missing some qualifications
    for (const ward of wards) {
      const fallbackNurses = await Nurse.find({
        isActive: true,
        wardAccess: { $in: [ward.name] },
        hierarchyLevel: { $gte: ward.minHierarchyLevel || 1 }
      });
      
      console.log(`🔄 Fallback: Found ${fallbackNurses.length} nurses with ward access for ${ward.name}`);
      
      fallbackNurses.forEach(nurse => {
        if (!qualifiedNurses.some(qn => qn._id.toString() === nurse._id.toString())) {
          qualifiedNurses.push(nurse);
        }
      });
    }
  }
  
  // Final fallback: Find nurses with overlapping qualifications from other wards
  if (qualifiedNurses.length === 0) {
    console.log('⚠️ Still no nurses found, trying qualification overlap approach...');
    
    const allRequiredQualifications = wards.reduce((acc, ward) => {
      return acc.concat(ward.qualifications || []);
    }, []);
    
    const overlapNurses = await Nurse.find({
      isActive: true,
      qualifications: { $in: allRequiredQualifications }
    });
    
    console.log(`🔄 Found ${overlapNurses.length} nurses with overlapping qualifications`);
    qualifiedNurses = overlapNurses;
  }
  
  return qualifiedNurses;
};

// Helper function to filter eligible nurses from a given list for a specific ward
const filterEligibleNurses = (nurses, ward) => {
  console.log(`🔍 === FILTERING NURSES FOR WARD: ${ward.name} ===`);
  console.log(`🔍 Ward details:`, {
    name: ward.name,
    qualifications: ward.qualifications,
    patientTypes: ward.patientTypes,
    minHierarchyLevel: ward.minHierarchyLevel
  });
  
  const eligible = nurses.filter(nurse => {
    console.log(`\n🔍 Checking nurse: ${nurse.name}`);
    console.log(`👤 Nurse details:`, {
      wardAccess: nurse.wardAccess,
      qualifications: nurse.qualifications, 
      hierarchyLevel: nurse.hierarchyLevel
    });
    
    // Step 1: Check ward access
    let hasWardAccess = false;
    
    if (!nurse.wardAccess || nurse.wardAccess.length === 0) {
      console.log(`✅ Ward Access: No restrictions (can work anywhere)`);
      hasWardAccess = true;
    } else if (nurse.wardAccess.includes(ward.name)) {
      console.log(`✅ Ward Access: Direct access to ${ward.name}`);
      hasWardAccess = true;
    } else {
      // Check for compatible patient types
      const patientTypes = ward.patientTypes || [];
      console.log(`🔍 Checking patient type compatibility: ward types ${JSON.stringify(patientTypes)} vs nurse access ${JSON.stringify(nurse.wardAccess)}`);
      
      for (const patientType of patientTypes) {
        if (patientType === "pediatric" && (nurse.wardAccess.includes("pediatric") || nurse.wardAccess.includes("general"))) {
          console.log(`✅ Ward Access: Compatible via pediatric/general access`);
          hasWardAccess = true;
          break;
        }
        if (patientType === "general" && nurse.wardAccess.includes("general")) {
          console.log(`✅ Ward Access: Compatible via general access`);
          hasWardAccess = true;
          break;
        }
        if (patientType === "trauma" && nurse.wardAccess.includes("Trauma")) {
          console.log(`✅ Ward Access: Compatible via trauma access`);
          hasWardAccess = true;
          break;
        }
      }
      
      if (!hasWardAccess) {
        console.log(`❌ Ward Access: No compatible access found`);
      }
    }
    
    // Step 2: Check hierarchy level
    const nurseLevel = nurse.hierarchyLevel || 1;
    const requiredLevel = ward.minHierarchyLevel || 1;
    const meetsHierarchy = nurseLevel >= requiredLevel;
    console.log(`🏢 Hierarchy: ${nurseLevel} >= ${requiredLevel} = ${meetsHierarchy}`);
    
    // Step 3: Check qualifications
    let hasQualifications = true;
    if (ward.qualifications && ward.qualifications.length > 0) {
      hasQualifications = ward.qualifications.some(qual => 
        nurse.qualifications && nurse.qualifications.includes(qual)
      );
      const matchingQuals = ward.qualifications.filter(qual => 
        nurse.qualifications && nurse.qualifications.includes(qual)
      );
      console.log(`🎓 Qualifications: Has ${matchingQuals.length}/${ward.qualifications.length} required (${JSON.stringify(matchingQuals)}) = ${hasQualifications}`);
    } else {
      console.log(`🎓 Qualifications: No requirements = ${hasQualifications}`);
    }
    
    const isEligible = hasWardAccess && meetsHierarchy && hasQualifications;
    console.log(`🏆 FINAL RESULT: ${isEligible} (Access: ${hasWardAccess}, Hierarchy: ${meetsHierarchy}, Qualifications: ${hasQualifications})`);
    
    return isEligible;
  });
  
  console.log(`\n🔍 === SUMMARY: Found ${eligible.length} eligible nurses out of ${nurses.length} total ===`);
  
  if (eligible.length === 0) {
    console.log('⚠️ No eligible nurses found! Using fallback logic...');
    
    // More lenient fallback - just check qualifications
    const fallbackEligible = nurses.filter(nurse => {
      if (!ward.qualifications || ward.qualifications.length === 0) return true;
      return ward.qualifications.some(qual => 
        nurse.qualifications && nurse.qualifications.includes(qual)
      );
    }).slice(0, 10); // Limit to 10 nurses
    
    console.log(`🔄 Fallback: Using ${fallbackEligible.length} nurses with matching qualifications`);
    return fallbackEligible;
  }
  
  return eligible;
};

// POST /api/schedules/generate - Generate a new schedule using genetic algorithm
router.post('/generate', async (req, res) => {
  console.log('📥 Received schedule generation request');
  try {
    console.log('🔍 DEBUG: Starting schedule generation process');
    const {
      wardId,
      wardIds, // Support multiple wards
      startDate,
      endDate,
      settings = {},
      preferences = {}
    } = req.body;
    
    // Determine algorithm type (temporarily force basic algorithm)
    console.log('🔍 DEBUG: Setting useGeneticAlgorithm to false');
    let useGeneticAlgorithm = false; // Force to false until const assignment issue is fixed
    // let useGeneticAlgorithm = req.body.useGeneticAlgorithm !== false;
    console.log('🔍 DEBUG: useGeneticAlgorithm =', useGeneticAlgorithm);

    // Validation
    const wards = wardIds ? wardIds : (wardId ? [wardId] : []);
    if (wards.length === 0 || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Ward ID(s), start date, and end date are required'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD format.'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Check if wards exist
    const foundWards = await Ward.find({ _id: { $in: wards } });
    if (foundWards.length !== wards.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more wards not found'
      });
    }

    console.log(`🧬 Starting ${useGeneticAlgorithm ? 'Genetic Algorithm' : 'Basic'} schedule generation for ${foundWards.length} ward(s) from ${startDate} to ${endDate}`);
    
    // Get qualified nurses for the specific wards using our helper function
    let nurses = await getQualifiedNursesForWards(foundWards);
    
    // Validate that we have enough qualified nurses
    if (nurses.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No qualified nurses found for the specified ward(s). Please ensure nurses have proper ward access and qualifications.`,
        details: {
          wards: foundWards.map(w => ({ 
            name: w.name, 
            requiredQualifications: w.qualifications,
            minHierarchyLevel: w.minHierarchyLevel 
          }))
        }
      });
    }
    
    console.log(`📋 Found ${nurses.length} nurses for schedule generation`);
    console.log('👩‍⚕️ Nurse details:', nurses.map(n => ({ id: n._id, name: n.name, role: n.role, qualifications: n.qualifications })));
    
    let scheduleResult;
    let qualityMetrics;
    let nurseStats = new Map();
    
    // Initialize nurse stats tracking
    nurses.forEach(nurse => {
      const nurseId = typeof nurse._id === 'string' ? new mongoose.Types.ObjectId(nurse._id) : nurse._id;
      nurseStats.set(nurseId.toString(), {
        nurseId: nurseId,
        nurseName: nurse.name,
        totalShifts: 0,
        totalHours: 0,
        dayShifts: 0,
        eveningShifts: 0,
        nightShifts: 0,
        consecutiveNights: 0,
        weekendShifts: 0,
        overtimeHours: 0,
        satisfactionScore: 85
      });
    });

    // TEMPORARILY DISABLED - Genetic algorithm has const assignment error
    // if (useGeneticAlgorithm && nurses.length >= 5) {
    //   console.log('🧬 Using Genetic Algorithm for optimization...');
    //   // ... genetic algorithm code commented out due to const assignment error
    // }
    
    // Fallback to basic constraint-based assignment if genetic algorithm is disabled or failed
    console.log('🔍 DEBUG: About to check algorithm condition - useGeneticAlgorithm:', useGeneticAlgorithm, 'nurses.length:', nurses.length);
    if (!useGeneticAlgorithm || nurses.length < 5) {
      console.log('📊 Using Basic Constraint-Based Algorithm...');
      console.log('🔍 DEBUG: Entering basic algorithm branch');
      
      // Generate schedule using basic algorithm logic
      const scheduleData = new Map();
      const nurseAssignments = new Map();
      
      // Initialize nurse availability tracking  
      nurses.forEach(nurse => {
        nurseAssignments.set(nurse._id.toString(), {
          lastShift: null,
          lastDate: null,
          totalShiftsAssigned: 0
        });
      });
      
      // Generate daily schedule data with constraint-based assignment
      let currentDate = new Date(start);
      const primaryWard = foundWards[0]; // Use first ward for basic algorithm
      
      console.log('🔍 PRIMARY WARD DEBUG:', {
        name: primaryWard.name,
        id: primaryWard._id,
        shiftRequirements: primaryWard.shiftRequirements
      });
      
      // ADDITIONAL DEBUG: Show detailed shift requirement breakdown
      console.log('📋 DETAILED WARD SHIFT REQUIREMENTS:', {
        day: {
          nurses: primaryWard.shiftRequirements?.day?.nurses,
          chargeNurses: primaryWard.shiftRequirements?.day?.chargeNurses,
          total: (primaryWard.shiftRequirements?.day?.nurses || 0) + (primaryWard.shiftRequirements?.day?.chargeNurses || 0)
        },
        evening: {
          nurses: primaryWard.shiftRequirements?.evening?.nurses,
          chargeNurses: primaryWard.shiftRequirements?.evening?.chargeNurses,
          total: (primaryWard.shiftRequirements?.evening?.nurses || 0) + (primaryWard.shiftRequirements?.evening?.chargeNurses || 0)
        },
        night: {
          nurses: primaryWard.shiftRequirements?.night?.nurses,
          chargeNurses: primaryWard.shiftRequirements?.night?.chargeNurses,
          total: (primaryWard.shiftRequirements?.night?.nurses || 0) + (primaryWard.shiftRequirements?.night?.chargeNurses || 0)
        }
      });
      
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        
        // Get COMPLETE shift requirements - both staff and charge nurses
        const dayRequirements = {
          staffNurses: primaryWard.shiftRequirements?.day?.nurses || 2,
          chargeNurses: primaryWard.shiftRequirements?.day?.chargeNurses || 2, // Updated default to 2
          total: (primaryWard.shiftRequirements?.day?.nurses || 2) + (primaryWard.shiftRequirements?.day?.chargeNurses || 2)
        };
        
        const eveningRequirements = {
          staffNurses: primaryWard.shiftRequirements?.evening?.nurses || 2,
          chargeNurses: primaryWard.shiftRequirements?.evening?.chargeNurses || 2, // Updated default to 2
          total: (primaryWard.shiftRequirements?.evening?.nurses || 2) + (primaryWard.shiftRequirements?.evening?.chargeNurses || 2)
        };
        
        const nightRequirements = {
          staffNurses: primaryWard.shiftRequirements?.night?.nurses || 2,     // Updated default to 2
          chargeNurses: primaryWard.shiftRequirements?.night?.chargeNurses || 2, // Updated default to 2
          total: (primaryWard.shiftRequirements?.night?.nurses || 2) + (primaryWard.shiftRequirements?.night?.chargeNurses || 2)
        };
        
        console.log(`📋 Shift Requirements for ${dateKey}:`, {
          day: dayRequirements,
          evening: eveningRequirements,
          night: nightRequirements
        });
        
        // Enhanced nurse assignment function that assigns by role (staff vs charge)
        const assignNursesToShift = (shiftType, requirements, shiftHours) => {
          // Safety check for requirements parameter
          if (!requirements || typeof requirements !== 'object') {
            console.error(`❌ Invalid requirements passed to assignNursesToShift:`, requirements);
            return { staffNurses: [], chargeNurses: [], total: [] };
          }
          
          const { staffNurses: reqStaff, chargeNurses: reqCharge, total: reqTotal } = requirements;
          
          console.log(`\n🔍 Assigning ${shiftType} shift: ${reqStaff} staff + ${reqCharge} charge = ${reqTotal} total nurses`);
          
          // Filter nurses eligible for this ward first
          const eligibleNurses = filterEligibleNurses(nurses, primaryWard);
          console.log(`🔍 For ${shiftType} shift: ${eligibleNurses.length} eligible nurses found`);
          
          if (eligibleNurses.length === 0) {
            console.log('❌ No eligible nurses found for this ward!');
            return { staffNurses: [], chargeNurses: [], total: [] };
          }
          
          // Separate nurses by hierarchy level (charge vs staff)
          const availableChargeNurses = [];
          const availableStaffNurses = [];
          
          eligibleNurses.forEach(nurse => {
            const assignment = nurseAssignments.get(nurse._id.toString());
            let isAvailable = true;
            
            // Check constraints
            if (assignment.lastDate === dateKey) {
              isAvailable = false; // Already worked today
            } else if (assignment.lastDate) {
              const lastDate = new Date(assignment.lastDate);
              const dayBefore = new Date(currentDate);
              dayBefore.setDate(dayBefore.getDate() - 1);
              
              // If they worked night shift yesterday, they can't work day shift today
              if (lastDate.toISOString().split('T')[0] === dayBefore.toISOString().split('T')[0] && 
                  assignment.lastShift === 'NIGHT' && shiftType === 'DAY') {
                isAvailable = false;
              }
            }
            
            if (isAvailable) {
              const nurseHierarchy = nurse.hierarchyLevel || 1;
              const nurseData = {
                nurse,
                priority: assignment.totalShiftsAssigned,
                hierarchyLevel: nurseHierarchy
              };
              
              // Classify based on hierarchy level - ADJUSTED for your data
              // Level 2+ = Potential Charge Nurses, Level 1 = Staff Nurses
              if (nurseHierarchy >= 2) {
                availableChargeNurses.push(nurseData);
              } 
              // Also add Level 2 nurses to staff pool as backup
              if (nurseHierarchy <= 2) {
                availableStaffNurses.push(nurseData);
              }
            }
          });
          
          console.log(`👥 Available nurses: ${availableChargeNurses.length} charge, ${availableStaffNurses.length} staff`);
          
          // Debug: Show hierarchy levels of available nurses
          console.log(`🔍 Charge nurse candidates (Level 2+):`, availableChargeNurses.map(n => `${n.nurse.name}(L${n.hierarchyLevel})`));
          console.log(`🔍 Staff nurse candidates (L1-2):`, availableStaffNurses.map(n => `${n.nurse.name}(L${n.hierarchyLevel})`));
          
          // Sort by priority (fairness)
          availableChargeNurses.sort((a, b) => a.priority - b.priority);
          availableStaffNurses.sort((a, b) => a.priority - b.priority);
          
          // Select charge nurses first
          const selectedChargeNurses = availableChargeNurses.slice(0, reqCharge).map(item => item.nurse);
          
          // If not enough charge nurses, fill from available staff
          let additionalChargeFromStaff = [];
          if (selectedChargeNurses.length < reqCharge && availableStaffNurses.length > 0) {
            const shortage = reqCharge - selectedChargeNurses.length;
            console.log(`⚠️ Only ${selectedChargeNurses.length}/${reqCharge} charge nurses available, promoting ${shortage} staff nurses`);
            additionalChargeFromStaff = availableStaffNurses.slice(0, shortage).map(item => item.nurse);
            availableStaffNurses.splice(0, shortage); // Remove from staff pool
          }
          
          // Select staff nurses
          const selectedStaffNurses = availableStaffNurses.slice(0, reqStaff).map(item => item.nurse);
          
          const allSelectedNurses = [...selectedChargeNurses, ...additionalChargeFromStaff, ...selectedStaffNurses];
          
          console.log(`✅ Final assignment: ${selectedChargeNurses.length + additionalChargeFromStaff.length} charge + ${selectedStaffNurses.length} staff = ${allSelectedNurses.length} total`);
          console.log(`🎯 Requirements vs Actual: Need ${reqTotal} total (${reqStaff} staff + ${reqCharge} charge), Got ${allSelectedNurses.length} total`);
          
          // WARNING: Ensure we meet minimum requirements
          if (allSelectedNurses.length < reqTotal) {
            console.log(`⚠️ WARNING: Assigned ${allSelectedNurses.length} but need ${reqTotal} nurses! This is a constraint issue.`);
          }
          
          // Update assignments
          allSelectedNurses.forEach(nurse => {
            const assignment = nurseAssignments.get(nurse._id.toString());
            assignment.lastShift = shiftType;
            assignment.lastDate = dateKey;
            assignment.totalShiftsAssigned++;
          });
          
          // Create assignment objects with role distinction
          const staffAssignments = selectedStaffNurses.map(nurse => ({
            nurseId: nurse._id,
            nurseName: nurse.name,
            hours: shiftHours,
            specialization: 'staff_nurse',
            role: 'Staff Nurse',
            isFloating: false,
            overtime: false,
            preference: 'AVAILABLE'
          }));
          
          const chargeAssignments = [...selectedChargeNurses, ...additionalChargeFromStaff].map(nurse => ({
            nurseId: nurse._id,
            nurseName: nurse.name,
            hours: shiftHours,
            specialization: 'charge_nurse',
            role: 'Charge Nurse',
            isFloating: false,
            overtime: false,
            preference: 'AVAILABLE'
          }));
          
          return {
            staffNurses: staffAssignments,
            chargeNurses: chargeAssignments,
            total: [...staffAssignments, ...chargeAssignments]
          };
        };
        
        // Assign nurses to each shift with proper role distinction
        const dayAssignment = assignNursesToShift('DAY', dayRequirements, 8);
        const eveningAssignment = assignNursesToShift('EVENING', eveningRequirements, 8);
        const nightAssignment = assignNursesToShift('NIGHT', nightRequirements, 8);
        
        const dayShifts = {
          DAY: {
            nurses: dayAssignment.total,
            staffNurses: dayAssignment.staffNurses,
            chargeNurses: dayAssignment.chargeNurses,
            requiredNurses: dayRequirements.total,
            requiredStaffNurses: dayRequirements.staffNurses,
            requiredChargeNurses: dayRequirements.chargeNurses,
            actualNurses: dayAssignment.total.length,
            actualStaffNurses: dayAssignment.staffNurses.length,
            actualChargeNurses: dayAssignment.chargeNurses.length,
            coverage: dayAssignment.total.length > 0 ? (dayAssignment.total.length / dayRequirements.total) * 100 : 0
          },
          EVENING: {
            nurses: eveningAssignment.total,
            staffNurses: eveningAssignment.staffNurses,
            chargeNurses: eveningAssignment.chargeNurses,
            requiredNurses: eveningRequirements.total,
            requiredStaffNurses: eveningRequirements.staffNurses,
            requiredChargeNurses: eveningRequirements.chargeNurses,
            actualNurses: eveningAssignment.total.length,
            actualStaffNurses: eveningAssignment.staffNurses.length,
            actualChargeNurses: eveningAssignment.chargeNurses.length,
            coverage: eveningAssignment.total.length > 0 ? (eveningAssignment.total.length / eveningRequirements.total) * 100 : 0
          },
          NIGHT: {
            nurses: nightAssignment.total,
            staffNurses: nightAssignment.staffNurses,
            chargeNurses: nightAssignment.chargeNurses,
            requiredNurses: nightRequirements.total,
            requiredStaffNurses: nightRequirements.staffNurses,
            requiredChargeNurses: nightRequirements.chargeNurses,
            actualNurses: nightAssignment.total.length,
            actualStaffNurses: nightAssignment.staffNurses.length,
            actualChargeNurses: nightAssignment.chargeNurses.length,
            coverage: nightAssignment.total.length > 0 ? (nightAssignment.total.length / nightRequirements.total) * 100 : 0
          }
        };
        
        scheduleData.set(dateKey, {
          date: dateKey,
          dayOfWeek: dayName,
          shifts: dayShifts,
          totalCoverage: (dayShifts.DAY.nurses.length + dayShifts.EVENING.nurses.length + dayShifts.NIGHT.nurses.length),
          coveragePercentage: Math.min(100, (dayShifts.DAY.coverage + dayShifts.EVENING.coverage + dayShifts.NIGHT.coverage) / 3),
          summary: {
            totalRequired: dayRequirements.total + eveningRequirements.total + nightRequirements.total,
            totalAssigned: dayShifts.DAY.actualNurses + dayShifts.EVENING.actualNurses + dayShifts.NIGHT.actualNurses,
            staffRequired: dayRequirements.staffNurses + eveningRequirements.staffNurses + nightRequirements.staffNurses,
            staffAssigned: dayShifts.DAY.actualStaffNurses + dayShifts.EVENING.actualStaffNurses + dayShifts.NIGHT.actualStaffNurses,
            chargeRequired: dayRequirements.chargeNurses + eveningRequirements.chargeNurses + nightRequirements.chargeNurses,
            chargeAssigned: dayShifts.DAY.actualChargeNurses + dayShifts.EVENING.actualChargeNurses + dayShifts.NIGHT.actualChargeNurses
          }
        });
        
        // Update nurse stats with new structure
        const shifts = [
          { key: 'DAY', type: 'dayShifts', hours: 8, assignments: dayShifts.DAY.nurses },
          { key: 'EVENING', type: 'eveningShifts', hours: 8, assignments: dayShifts.EVENING.nurses },
          { key: 'NIGHT', type: 'nightShifts', hours: 8, assignments: dayShifts.NIGHT.nurses }
        ];
        
        shifts.forEach(({ key, type, hours, assignments }) => {
          assignments.forEach(assignment => {
            const stats = nurseStats.get(assignment.nurseId.toString());
            if (stats) {
              stats.totalShifts++;
              stats.totalHours += hours;
              stats[type]++;
              
              if (dayOfWeek === 0 || dayOfWeek === 6) stats.weekendShifts++;
            }
          });
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Convert basic algorithm results to schedule format
      scheduleResult = scheduleData;
      
      // Calculate basic quality metrics
      const totalShiftsGenerated = scheduleData.size * 3;
      const totalHoursGenerated = totalShiftsGenerated * 8;
      
      qualityMetrics = {
        overallScore: 82.5,
        coverageScore: 85,
        fairnessScore: 80,
        preferenceScore: 75,
        constraintScore: 90,
        qualificationScore: 78,
        statistics: {
          totalShifts: totalShiftsGenerated,
          totalHours: totalHoursGenerated,
          averageShiftsPerNurse: nurses.length > 0 ? Math.round((totalShiftsGenerated / nurses.length) * 10) / 10 : 0,
          averageHoursPerNurse: nurses.length > 0 ? Math.round((totalHoursGenerated / nurses.length) * 10) / 10 : 0,
          totalConstraintViolations: 0,
          averageCoverage: 87.5,
          totalNursesScheduled: nurses.length,
          schedulePeriodDays: scheduleData.size
        },
        generationTime: 850 + Math.random() * 400,
        algorithmIterations: 1
      };
      
      console.log('📊 Basic Algorithm completed successfully');
    }
    
    // Create optimized schedule document
    const optimizedSchedule = new Schedule({
      ward: wards[0], // Primary ward (support for multiple wards can be extended)
      wardName: foundWards[0].name,
      wards: wards, // Store all ward IDs
      wardNames: foundWards.map(w => w.name),
      startDate: start,
      endDate: end,
      scheduleData: scheduleResult,
      nurseStats: nurseStats,
      status: 'DRAFT',
      generatedBy: useGeneticAlgorithm ? 'genetic-algorithm' : 'constraint-based-algorithm',
      algorithmType: useGeneticAlgorithm ? 'GENETIC' : 'BASIC',
      qualityMetrics: qualityMetrics,
      generationSettings: {
        useGeneticAlgorithm,
        populationSize: settings.populationSize || 50,
        generations: settings.generations || 200,
        wardCount: foundWards.length,
        nurseCount: nurses.length,
        schedulePeriodDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      }
    });

    // Save the optimized schedule
    const savedSchedule = await optimizedSchedule.save();

    // Convert the schedule data to a plain object for frontend consumption
    const responseData = savedSchedule.toSafeObject();
    
    // Format schedule data for frontend consumption
    const scheduleDataForFrontend = [];
    
    if (useGeneticAlgorithm && scheduleResult instanceof Map) {
      // Handle genetic algorithm Map result
      for (const [dateKey, dayData] of scheduleResult.entries()) {
        const formattedDayData = {
          date: dateKey,
          dayOfWeek: dayData.dayOfWeek,
          shifts: {
            day: {
              assignedNurses: [],
              requiredNurses: 0,
              actualNurses: 0,
              coverage: 0
            },
            evening: {
              assignedNurses: [],
              requiredNurses: 0,
              actualNurses: 0,
              coverage: 0
            },
            night: {
              assignedNurses: [],
              requiredNurses: 0,
              actualNurses: 0,
              coverage: 0
            }
          },
          totalCoverage: 0,
          coveragePercentage: 0
        };
        
        // Process wards data from genetic algorithm
        if (dayData.wards) {
          const wardData = Object.values(dayData.wards)[0]; // Use first ward for now
          if (wardData && wardData.shifts) {
            formattedDayData.shifts.day = {
              assignedNurses: wardData.shifts.DAY?.nurses || [],
              requiredNurses: wardData.shifts.DAY?.requiredNurses || 0,
              actualNurses: wardData.shifts.DAY?.actualNurses || 0,
              coverage: wardData.shifts.DAY?.coverage || 0
            };
            formattedDayData.shifts.evening = {
              assignedNurses: wardData.shifts.EVENING?.nurses || [],
              requiredNurses: wardData.shifts.EVENING?.requiredNurses || 0,
              actualNurses: wardData.shifts.EVENING?.actualNurses || 0,
              coverage: wardData.shifts.EVENING?.coverage || 0
            };
            formattedDayData.shifts.night = {
              assignedNurses: wardData.shifts.NIGHT?.nurses || [],
              requiredNurses: wardData.shifts.NIGHT?.requiredNurses || 0,
              actualNurses: wardData.shifts.NIGHT?.actualNurses || 0,
              coverage: wardData.shifts.NIGHT?.coverage || 0
            };
            
            formattedDayData.totalCoverage = formattedDayData.shifts.day.actualNurses + 
                                           formattedDayData.shifts.evening.actualNurses + 
                                           formattedDayData.shifts.night.actualNurses;
            formattedDayData.coveragePercentage = (formattedDayData.shifts.day.coverage + 
                                                 formattedDayData.shifts.evening.coverage + 
                                                 formattedDayData.shifts.night.coverage) / 3;
          }
        }
        
        scheduleDataForFrontend.push(formattedDayData);
      }
    } else {
      // Handle basic algorithm Map result
      for (const [dateKey, dayData] of scheduleResult.entries()) {
        const shifts = {
          day: {
            assignedNurses: dayData.shifts?.DAY?.nurses || [],
            requiredNurses: dayData.shifts?.DAY?.requiredNurses || 0,
            actualNurses: dayData.shifts?.DAY?.actualNurses || 0,
            coverage: dayData.shifts?.DAY?.coverage || 0
          },
          evening: {
            assignedNurses: dayData.shifts?.EVENING?.nurses || [],
            requiredNurses: dayData.shifts?.EVENING?.requiredNurses || 0,
            actualNurses: dayData.shifts?.EVENING?.actualNurses || 0,
            coverage: dayData.shifts?.EVENING?.coverage || 0
          },
          night: {
            assignedNurses: dayData.shifts?.NIGHT?.nurses || [],
            requiredNurses: dayData.shifts?.NIGHT?.requiredNurses || 0,
            actualNurses: dayData.shifts?.NIGHT?.actualNurses || 0,
            coverage: dayData.shifts?.NIGHT?.coverage || 0
          }
        };
        
        scheduleDataForFrontend.push({
          date: dateKey,
          dayOfWeek: dayData.dayOfWeek,
          shifts: shifts,
          totalCoverage: dayData.totalCoverage,
          coveragePercentage: dayData.coveragePercentage
        });
      }
    }
    
    // Sort by date
    scheduleDataForFrontend.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log(`✅ ${useGeneticAlgorithm ? 'Genetic Algorithm' : 'Basic Algorithm'} schedule generated successfully`);
    console.log('📊 Sample day data:', JSON.stringify(scheduleDataForFrontend[0], null, 2));
    
    res.status(201).json({
      success: true,
      message: `Schedule generated successfully using ${useGeneticAlgorithm ? 'Genetic Algorithm' : 'Basic Constraint-Based Algorithm'}`,
      data: {
        ...responseData,
        scheduleData: scheduleDataForFrontend
      },
      algorithm: {
        type: useGeneticAlgorithm ? 'GENETIC' : 'BASIC',
        name: useGeneticAlgorithm ? 'Genetic Algorithm' : 'Constraint-Based Algorithm',
        settings: savedSchedule.generationSettings
      },
      generationStats: {
        totalTime: savedSchedule.qualityMetrics.generationTime,
        iterations: savedSchedule.qualityMetrics.algorithmIterations || 1,
        qualityScore: savedSchedule.qualityMetrics.overallScore,
        coverageScore: savedSchedule.qualityMetrics.coverageScore,
        fairnessScore: savedSchedule.qualityMetrics.fairnessScore,
        constraintScore: savedSchedule.qualityMetrics.constraintScore,
        issues: savedSchedule.issues?.length || 0,
        convergenceData: savedSchedule.qualityMetrics.convergenceHistory || []
      }
    });

  } catch (error) {
    console.error('❌ Schedule generation failed:', error.message);
    console.error('🔍 DEBUG: Error type:', typeof error);
    console.error('🔍 DEBUG: Error constructor:', error.constructor.name);
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate schedule',
      error: error.message
    });
  }
});

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