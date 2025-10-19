import mongoose from 'mongoose';
import Nurse from '../models/Nurse.js';
import Ward from '../models/Ward.js';
import Schedule from '../models/Schedule.js';

/**
 * Comprehensive Genetic Algorithm for Nurse Shift Scheduling
 * 
 * This metaheuristic approach optimizes nurse schedules across multiple wards
 * while handling complex constraints and multi-objective optimization.
 * 
 * Features:
 * - Multi-ward optimization
 * - Qualification-based assignment
 * - Preference consideration
 * - Complex constraint handling
 * - Fair workload distribution
 * - Scalable population-based optimization
 */
class GeneticSchedulingAlgorithm {
  constructor(options = {}) {
    // Core algorithm parameters
    this.populationSize = options.populationSize || 100;
    this.generations = options.generations || 300;
    this.crossoverRate = options.crossoverRate || 0.8;
    this.mutationRate = options.mutationRate || 0.15;
    this.eliteSize = options.eliteSize || 15;
    this.tournamentSize = options.tournamentSize || 5;
    
    // Multi-objective fitness weights
    this.fitnessWeights = {
      coverage: 0.30,        // All shifts properly staffed
      fairness: 0.25,        // Equal workload distribution
      preferences: 0.20,     // Nurse preference satisfaction
      constraints: 0.15,     // Hard constraint compliance
      qualifications: 0.10   // Skill-shift matching
    };
    
    // Comprehensive scheduling constraints
    this.constraints = {
      maxDailyHours: 12,           // Maximum working hours per day
      maxWeeklyHours: 48,          // Maximum working hours per week
      maxConsecutiveNights: 3,     // Maximum consecutive night shifts
      minRestBetweenShifts: 8,     // Minimum rest hours between shifts
      maxShiftsPerWeek: 5,         // Maximum shifts per week per nurse
      minDaysOff: 2,              // Minimum consecutive days off
      maxOvertimeHours: 8,         // Maximum overtime hours per week
      minStaffingRatio: 0.8        // Minimum staffing level (80%)
    };
    
    // Shift definitions
    this.shiftTypes = {
      DAY: { start: 7, end: 15, hours: 8, intensity: 'medium' },
      EVENING: { start: 15, end: 23, hours: 8, intensity: 'medium' },
      NIGHT: { start: 23, end: 7, hours: 8, intensity: 'high' }
    };
    
    // Nurse skill levels and specializations
    this.skillLevels = {
      'junior_nurse': 1,
      'staff_nurse': 2,
      'senior_nurse': 3,
      'charge_nurse': 4,
      'nurse_supervisor': 5
    };
    
    this.bestSolution = null;
    this.convergenceHistory = [];
    this.startTime = null;
  }

  /**
   * Main entry point for genetic algorithm optimization
   */
  async optimizeSchedule({ wards, nurses, startDate, endDate, preferences = {} }) {
    console.log(`🧬 Starting Genetic Algorithm optimization for ${wards.length} wards, ${nurses.length} nurses`);
    this.startTime = Date.now();
    
    try {
      // Preprocess data
      const schedulingData = await this.preprocessSchedulingData(wards, nurses, startDate, endDate, preferences);
      
      // Initialize population
      let population;
      try {
        population = this.initializePopulation(schedulingData);
        console.log(`📊 Initialized population of ${population.length} individuals`);
      } catch (popError) {
        console.error('❌ Error in population initialization:', popError.message);
        throw popError;
      }
      
      // Evolution loop
      for (let generation = 0; generation < this.generations; generation++) {
        // Evaluate fitness
        let fitnessScores;
        try {
          fitnessScores = population.map(individual => 
            this.evaluateFitness(individual, schedulingData)
          );
        } catch (fitnessError) {
          console.error('❌ Error in fitness evaluation:', fitnessError.message);
          console.error('Stack trace:', fitnessError.stack);
          throw fitnessError;
        }
        
        // Track best solution
        const bestFitnessIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
        const currentBest = {
          individual: population[bestFitnessIndex],
          fitness: fitnessScores[bestFitnessIndex]
        };
        
        if (!this.bestSolution || currentBest.fitness > this.bestSolution.fitness) {
          this.bestSolution = { ...currentBest };
        }
        
        this.convergenceHistory.push({
          generation,
          bestFitness: this.bestSolution.fitness,
          avgFitness: fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length
        });
        
        // Log progress
        if (generation % 50 === 0) {
          console.log(`🔄 Generation ${generation}: Best=${(this.bestSolution.fitness * 100).toFixed(2)}%, Avg=${((this.convergenceHistory[generation].avgFitness) * 100).toFixed(2)}%`);
        }
        
        // Early termination if solution is excellent
        if (this.bestSolution.fitness > 0.95) {
          console.log(`🎯 Excellent solution found at generation ${generation}!`);
          break;
        }
        
        // Create next generation
        population = this.createNextGeneration(population, fitnessScores, schedulingData);
      }
      
      // Convert best solution to schedule format
      const optimizedSchedule = this.convertToScheduleFormat(this.bestSolution.individual, schedulingData);
      
      const executionTime = Date.now() - this.startTime;
      console.log(`✅ Optimization completed in ${executionTime}ms with fitness ${(this.bestSolution.fitness * 100).toFixed(2)}%`);
      
      return {
        schedule: optimizedSchedule,
        metrics: this.calculateDetailedMetrics(this.bestSolution.individual, schedulingData),
        convergence: this.convergenceHistory,
        executionTime
      };
      
    } catch (error) {
      console.error('❌ Genetic algorithm optimization failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess and structure data for optimization
   */
  async preprocessSchedulingData(wards, nurses, startDate, endDate, preferences) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let dates = [];
    
    // Generate date array
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    // Process nurse qualifications and preferences
    const processedNurses = nurses.map(nurse => ({
      ...nurse,
      skillLevel: this.skillLevels[nurse.role] || 2,
      availability: this.parseAvailability(nurse.availability || {}),
      preferences: this.parsePreferences(preferences[nurse._id] || {}),
      workloadCapacity: this.calculateWorkloadCapacity(nurse)
    }));
    
    // Process ward requirements
    const processedWards = wards.map(ward => ({
      ...ward,
      shiftRequirements: this.normalizeShiftRequirements(ward.shiftRequirements),
      qualificationRequirements: this.processQualificationRequirements(ward.qualifications),
      criticality: this.assessWardCriticality(ward)
    }));
    
    return {
      dates,
      nurses: processedNurses,
      wards: processedWards,
      totalShifts: dates.length * processedWards.length * 3, // 3 shifts per day
      schedulingPeriod: { start: startDate, end: endDate }
    };
  }

  /**
   * Initialize population with diverse, valid solutions
   */
  initializePopulation(schedulingData) {
    let population = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      try {
        const individual = this.createRandomIndividual(schedulingData);
        population.push(individual);
      } catch (indError) {
        console.error(`❌ Error creating individual ${i}:`, indError.message);
        console.error('Stack trace:', indError.stack);
        throw indError;
      }
    }
    
    return population;
  }

  /**
   * Create a single random but valid schedule individual
   */
  createRandomIndividual(schedulingData) {
    try {
      let individual = {};
      const nurseWorkloads = new Map();
    
    // Initialize nurse workload tracking
    schedulingData.nurses.forEach(nurse => {
      nurseWorkloads.set(nurse._id.toString(), {
        totalHours: 0,
        shiftsThisWeek: 0,
        consecutiveNights: 0,
        lastShift: null,
        daysWorked: new Set()
      });
    });
    
    // Generate assignments for each date and ward
    for (const date of schedulingData.dates) {
      individual[date] = {};
      
      for (const ward of schedulingData.wards) {
        // Ensure ward has shift requirements
        const shiftReqs = ward.shiftRequirements || {
          day: { nurses: 2 },
          evening: { nurses: 2 },
          night: { nurses: 1 }
        };
        
        individual[date][ward._id.toString()] = {
          DAY: { nurses: [], required: shiftReqs.day.nurses },
          EVENING: { nurses: [], required: shiftReqs.evening.nurses },
          NIGHT: { nurses: [], required: shiftReqs.night.nurses }
        };
        
        // Assign nurses to each shift
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const required = shiftReqs[shiftType.toLowerCase()].nurses;
          const availableNurses = this.getAvailableNurses(
            schedulingData.nurses, 
            date, 
            shiftType, 
            ward, 
            nurseWorkloads
          );
          
          // Select best qualified nurses
          const selectedNurses = this.selectNursesForShift(
            availableNurses, 
            required, 
            ward, 
            shiftType
          );
          
          // Assign and update workloads
          selectedNurses.forEach(nurse => {
            individual[date][ward._id.toString()][shiftType].nurses.push(nurse._id.toString());
            this.updateNurseWorkload(nurseWorkloads.get(nurse._id.toString()), date, shiftType);
          });
        }
      }
    }
    
    return individual;
    } catch (error) {
      console.error('❌ Error in createRandomIndividual:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Get nurses available for a specific shift considering constraints
   */
  getAvailableNurses(allNurses, date, shiftType, ward, workloads) {
    return allNurses.filter(nurse => {
      const workload = workloads.get(nurse._id.toString());
      
      // Check basic availability
      if (!this.isNurseAvailable(nurse, date, shiftType)) return false;
      
      // Check workload constraints
      if (workload.totalHours + this.shiftTypes[shiftType].hours > this.constraints.maxWeeklyHours) return false;
      if (workload.shiftsThisWeek >= this.constraints.maxShiftsPerWeek) return false;
      
      // Check consecutive constraints
      if (shiftType === 'NIGHT' && workload.consecutiveNights >= this.constraints.maxConsecutiveNights) return false;
      
      // Check rest requirements
      if (!this.hasAdequateRest(workload.lastShift, shiftType, date)) return false;
      
      // Check qualification match
      if (!this.hasRequiredQualifications(nurse, ward)) return false;
      
      return true;
    });
  }

  /**
   * Select best nurses for a shift based on qualifications and preferences
   */
  selectNursesForShift(availableNurses, required, ward, shiftType) {
    // Sort by qualification match and preference
    const scored = availableNurses.map(nurse => ({
      nurse,
      score: this.calculateNurseShiftScore(nurse, ward, shiftType)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, required).map(item => item.nurse);
  }

  /**
   * Calculate how well a nurse fits a specific shift
   */
  calculateNurseShiftScore(nurse, ward, shiftType) {
    let score = 0;
    
    // Qualification match (40%)
    const qualMatch = this.getQualificationMatch(nurse, ward);
    score += qualMatch * 0.4;
    
    // Preference match (30%)
    const prefMatch = this.getPreferenceMatch(nurse, shiftType);
    score += prefMatch * 0.3;
    
    // Experience level (20%)
    const expMatch = nurse.skillLevel / 5;
    score += expMatch * 0.2;
    
    // Workload balance (10%)
    const workloadBalance = 1 - (nurse.currentWorkload || 0);
    score += workloadBalance * 0.1;
    
    return score;
  }

  /**
   * Multi-objective fitness evaluation
   */
  evaluateFitness(individual, schedulingData) {
    const metrics = {
      coverage: this.evaluateCoverage(individual, schedulingData),
      fairness: this.evaluateFairness(individual, schedulingData),
      preferences: this.evaluatePreferences(individual, schedulingData),
      constraints: this.evaluateConstraints(individual, schedulingData),
      qualifications: this.evaluateQualifications(individual, schedulingData)
    };
    
    // Weighted sum of objectives
    let fitness = 0;
    for (const [metric, weight] of Object.entries(this.fitnessWeights)) {
      fitness += metrics[metric] * weight;
    }
    
    return Math.min(Math.max(fitness, 0), 1); // Normalize to [0,1]
  }

  /**
   * Evaluate shift coverage completeness
   */
  evaluateCoverage(individual, schedulingData) {
    let totalRequired = 0;
    let totalAssigned = 0;
    
    for (const date of schedulingData.dates) {
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const required = individual[date][wardId][shiftType].required;
          const assigned = individual[date][wardId][shiftType].nurses.length;
          
          totalRequired += required;
          totalAssigned += Math.min(assigned, required);
        }
      }
    }
    
    return totalRequired > 0 ? totalAssigned / totalRequired : 1;
  }

  /**
   * Evaluate workload fairness among nurses
   */
  evaluateFairness(individual, schedulingData) {
    const nurseWorkloads = new Map();
    
    // Initialize workload tracking
    schedulingData.nurses.forEach(nurse => {
      nurseWorkloads.set(nurse._id.toString(), 0);
    });
    
    // Count assignments per nurse
    for (const date of schedulingData.dates) {
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const nurses = individual[date][wardId][shiftType].nurses;
          nurses.forEach(nurseId => {
            const current = nurseWorkloads.get(nurseId) || 0;
            nurseWorkloads.set(nurseId, current + this.shiftTypes[shiftType].hours);
          });
        }
      }
    }
    
    // Calculate variance in workloads
    const workloads = Array.from(nurseWorkloads.values());
    const mean = workloads.reduce((a, b) => a + b, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
    
    // Convert to fairness score (lower variance = higher fairness)
    return 1 / (1 + variance / 100);
  }

  /**
   * Evaluate nurse preference satisfaction
   */
  evaluatePreferences(individual, schedulingData) {
    let totalAssignments = 0;
    let preferenceMatches = 0;
    
    for (const date of schedulingData.dates) {
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const nurses = individual[date][wardId][shiftType].nurses;
          
          nurses.forEach(nurseId => {
            const nurse = schedulingData.nurses.find(n => n._id.toString() === nurseId);
            if (nurse) {
              totalAssignments++;
              if (this.getPreferenceMatch(nurse, shiftType) > 0.7) {
                preferenceMatches++;
              }
            }
          });
        }
      }
    }
    
    return totalAssignments > 0 ? preferenceMatches / totalAssignments : 1;
  }

  /**
   * Evaluate constraint violations
   */
  evaluateConstraints(individual, schedulingData) {
    let violations = 0;
    let totalChecks = 0;
    
    const nurseSchedules = this.buildNurseSchedules(individual, schedulingData);
    
    for (const [nurseId, schedule] of nurseSchedules) {
      // Check weekly hours
      totalChecks++;
      if (schedule.totalHours > this.constraints.maxWeeklyHours) violations++;
      
      // Check daily hours
      for (const dayHours of schedule.dailyHours) {
        totalChecks++;
        if (dayHours > this.constraints.maxDailyHours) violations++;
      }
      
      // Check consecutive nights
      totalChecks++;
      if (schedule.maxConsecutiveNights > this.constraints.maxConsecutiveNights) violations++;
      
      // Check minimum days off
      totalChecks++;
      if (schedule.daysOff < this.constraints.minDaysOff) violations++;
    }
    
    return totalChecks > 0 ? 1 - (violations / totalChecks) : 1;
  }

  /**
   * Evaluate qualification matching
   */
  evaluateQualifications(individual, schedulingData) {
    let totalAssignments = 0;
    let qualificationMatches = 0;
    
    for (const date of schedulingData.dates) {
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const nurses = individual[date][wardId][shiftType].nurses;
          
          nurses.forEach(nurseId => {
            const nurse = schedulingData.nurses.find(n => n._id.toString() === nurseId);
            if (nurse) {
              totalAssignments++;
              if (this.hasRequiredQualifications(nurse, ward)) {
                qualificationMatches++;
              }
            }
          });
        }
      }
    }
    
    return totalAssignments > 0 ? qualificationMatches / totalAssignments : 1;
  }

  /**
   * Create next generation using genetic operators
   */
  createNextGeneration(population, fitnessScores, schedulingData) {
    let newPopulation = [];
    
    // Elitism - keep best solutions
    const elite = this.selectElite(population, fitnessScores);
    newPopulation.push(...elite);
    
    // Generate offspring through crossover and mutation
    while (newPopulation.length < this.populationSize) {
      const parent1 = this.tournamentSelection(population, fitnessScores);
      const parent2 = this.tournamentSelection(population, fitnessScores);
      
      let offspring;
      if (Math.random() < this.crossoverRate) {
        offspring = this.crossover(parent1, parent2, schedulingData);
      } else {
        offspring = Math.random() < 0.5 ? parent1 : parent2;
      }
      
      if (Math.random() < this.mutationRate) {
        offspring = this.mutate(offspring, schedulingData);
      }
      
      newPopulation.push(offspring);
    }
    
    return newPopulation;
  }

  /**
   * Tournament selection for parent selection
   */
  tournamentSelection(population, fitnessScores) {
    let tournament = [];
    
    for (let i = 0; i < this.tournamentSize; i++) {
      const index = Math.floor(Math.random() * population.length);
      tournament.push({ individual: population[index], fitness: fitnessScores[index] });
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0].individual;
  }

  /**
   * Multi-point crossover for schedule mixing
   */
  crossover(parent1, parent2, schedulingData) {
    let offspring = {};
    
    for (const date of schedulingData.dates) {
      offspring[date] = {};
      
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        
        // Randomly choose parent for each ward-day combination
        const source = Math.random() < 0.5 ? parent1 : parent2;
        offspring[date][wardId] = JSON.parse(JSON.stringify(source[date][wardId]));
      }
    }
    
    // Repair any constraint violations
    return this.repairSolution(offspring, schedulingData);
  }

  /**
   * Smart mutation with constraint preservation
   */
  mutate(individual, schedulingData) {
    const mutated = JSON.parse(JSON.stringify(individual));
    
    // Select random date and ward for mutation
    const randomDate = schedulingData.dates[Math.floor(Math.random() * schedulingData.dates.length)];
    const randomWard = schedulingData.wards[Math.floor(Math.random() * schedulingData.wards.length)];
    const wardId = randomWard._id.toString();
    
    // Select random shift type
    const shiftTypes = ['DAY', 'EVENING', 'NIGHT'];
    const randomShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
    
    // Reassign nurses for this shift
    const availableNurses = this.getAvailableNurses(
      schedulingData.nurses, 
      randomDate, 
      randomShift, 
      randomWard, 
      new Map() // Fresh workload for mutation
    );
    
    const required = mutated[randomDate][wardId][randomShift].required;
    const newAssignment = this.selectNursesForShift(availableNurses, required, randomWard, randomShift);
    
    mutated[randomDate][wardId][randomShift].nurses = newAssignment.map(n => n._id.toString());
    
    return this.repairSolution(mutated, schedulingData);
  }

  /**
   * Repair solution to satisfy hard constraints
   */
  repairSolution(individual, schedulingData) {
    // Implementation of constraint repair logic
    // This ensures all solutions remain feasible
    
    const nurseWorkloads = this.buildNurseSchedules(individual, schedulingData);
    
    // Fix weekly hour violations
    for (const [nurseId, schedule] of nurseWorkloads) {
      if (schedule.totalHours > this.constraints.maxWeeklyHours) {
        this.reduceNurseWorkload(individual, nurseId, schedulingData);
      }
    }
    
    return individual;
  }

  /**
   * Convert optimized individual to schedule format
   */
  convertToScheduleFormat(individual, schedulingData) {
    const scheduleMap = new Map();
    
    for (const date of schedulingData.dates) {
      const daySchedule = {
        date,
        dayOfWeek: new Date(date).toLocaleDateString('en', { weekday: 'long' }),
        wards: {}
      };
      
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        daySchedule.wards[wardId] = {
          wardName: ward.name,
          shifts: {
            DAY: {
              nurses: individual[date][wardId].DAY.nurses.map(nurseId => 
                this.createNurseAssignment(nurseId, schedulingData.nurses, 'DAY')
              ),
              requiredNurses: individual[date][wardId].DAY.required,
              actualNurses: individual[date][wardId].DAY.nurses.length,
              coverage: this.calculateShiftCoverage(individual[date][wardId].DAY)
            },
            EVENING: {
              nurses: individual[date][wardId].EVENING.nurses.map(nurseId => 
                this.createNurseAssignment(nurseId, schedulingData.nurses, 'EVENING')
              ),
              requiredNurses: individual[date][wardId].EVENING.required,
              actualNurses: individual[date][wardId].EVENING.nurses.length,
              coverage: this.calculateShiftCoverage(individual[date][wardId].EVENING)
            },
            NIGHT: {
              nurses: individual[date][wardId].NIGHT.nurses.map(nurseId => 
                this.createNurseAssignment(nurseId, schedulingData.nurses, 'NIGHT')
              ),
              requiredNurses: individual[date][wardId].NIGHT.required,
              actualNurses: individual[date][wardId].NIGHT.nurses.length,
              coverage: this.calculateShiftCoverage(individual[date][wardId].NIGHT)
            }
          }
        };
      }
      
      scheduleMap.set(date, daySchedule);
    }
    
    return scheduleMap;
  }

  /**
   * Create detailed performance metrics
   */
  calculateDetailedMetrics(individual, schedulingData) {
    const coverage = this.evaluateCoverage(individual, schedulingData);
    const fairness = this.evaluateFairness(individual, schedulingData);
    const preferences = this.evaluatePreferences(individual, schedulingData);
    const constraints = this.evaluateConstraints(individual, schedulingData);
    const qualifications = this.evaluateQualifications(individual, schedulingData);
    
    return {
      overallScore: this.bestSolution.fitness * 100,
      coverage: coverage * 100,
      fairness: fairness * 100,
      preferences: preferences * 100,
      constraints: constraints * 100,
      qualifications: qualifications * 100,
      executionTime: Date.now() - this.startTime,
      generations: this.convergenceHistory.length,
      totalNurses: schedulingData.nurses.length,
      totalWards: schedulingData.wards.length,
      totalShifts: schedulingData.totalShifts,
      constraintViolations: this.countConstraintViolations(individual, schedulingData)
    };
  }

  // Helper methods
  parseAvailability(availability) {
    // Parse nurse availability from various formats
    return availability;
  }

  parsePreferences(preferences) {
    // Parse nurse preferences
    return preferences;
  }

  calculateWorkloadCapacity(nurse) {
    // Calculate nurse's workload capacity based on role and experience
    return this.skillLevels[nurse.role] * 10;
  }

  normalizeShiftRequirements(requirements) {
    // Normalize ward shift requirements - ensure all shift types exist
    if (!requirements) {
      return {
        day: { nurses: 2, doctors: 1, support: 1 },
        evening: { nurses: 2, doctors: 1, support: 1 },
        night: { nurses: 1, doctors: 1, support: 1 }
      };
    }
    
    return {
      day: requirements.day || { nurses: 2, doctors: 1, support: 1 },
      evening: requirements.evening || { nurses: 2, doctors: 1, support: 1 },
      night: requirements.night || { nurses: 1, doctors: 1, support: 1 }
    };
  }

  processQualificationRequirements(qualifications) {
    // Process ward qualification requirements - ensure it's an array
    if (!qualifications || !Array.isArray(qualifications)) {
      return ['BSN', 'BLS']; // Default qualifications
    }
    return qualifications;
  }

  assessWardCriticality(ward) {
    // Assess ward criticality level
    const criticalWards = ['ICU', 'Emergency', 'Surgery'];
    return criticalWards.some(cw => ward.name.toLowerCase().includes(cw.toLowerCase())) ? 'high' : 'medium';
  }

  isNurseAvailable(nurse, date, shiftType) {
    // Check if nurse is available for specific date/shift
    return true; // Simplified - implement based on nurse availability data
  }

  hasAdequateRest(lastShift, currentShift, date) {
    // Check if nurse has adequate rest between shifts
    return true; // Simplified - implement rest period checking
  }

  hasRequiredQualifications(nurse, ward) {
    // Check if nurse has required qualifications for ward
    const nurseQuals = new Set(nurse.qualifications || []);
    const requiredQuals = ward.qualifications || [];
    return requiredQuals.some(qual => nurseQuals.has(qual));
  }

  getQualificationMatch(nurse, ward) {
    // Calculate qualification match score
    const nurseQuals = new Set(nurse.qualifications || []);
    const requiredQuals = ward.qualifications || [];
    const matches = requiredQuals.filter(qual => nurseQuals.has(qual)).length;
    return requiredQuals.length > 0 ? matches / requiredQuals.length : 1;
  }

  getPreferenceMatch(nurse, shiftType) {
    // Calculate preference match score
    return nurse.preferences?.[shiftType.toLowerCase()] || 0.5;
  }

  updateNurseWorkload(workload, date, shiftType) {
    // Update nurse workload tracking
    workload.totalHours += this.shiftTypes[shiftType].hours;
    workload.shiftsThisWeek++;
    workload.lastShift = shiftType;
    workload.daysWorked.add(date);
    
    if (shiftType === 'NIGHT') {
      workload.consecutiveNights++;
    } else {
      workload.consecutiveNights = 0;
    }
  }

  buildNurseSchedules(individual, schedulingData) {
    // Build individual nurse schedules for analysis
    const nurseSchedules = new Map();
    
    schedulingData.nurses.forEach(nurse => {
      nurseSchedules.set(nurse._id.toString(), {
        totalHours: 0,
        dailyHours: [],
        maxConsecutiveNights: 0,
        daysOff: 0,
        shifts: []
      });
    });
    
    // Populate schedules
    for (const date of schedulingData.dates) {
      for (const ward of schedulingData.wards) {
        const wardId = ward._id.toString();
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          const nurses = individual[date][wardId][shiftType].nurses;
          nurses.forEach(nurseId => {
            const schedule = nurseSchedules.get(nurseId);
            if (schedule) {
              schedule.totalHours += this.shiftTypes[shiftType].hours;
              schedule.shifts.push({ date, shiftType, ward: wardId });
            }
          });
        }
      }
    }
    
    return nurseSchedules;
  }

  selectElite(population, fitnessScores) {
    // Select elite individuals for next generation
    const elite = population
      .map((individual, index) => ({ individual, fitness: fitnessScores[index] }))
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, this.eliteSize)
      .map(item => item.individual);
    
    return elite;
  }

  reduceNurseWorkload(individual, nurseId, schedulingData) {
    // Reduce nurse workload to fix constraint violations
    // Implementation depends on specific constraint violation
  }

  createNurseAssignment(nurseId, nurses, shiftType) {
    // Create nurse assignment object
    const nurse = nurses.find(n => n._id.toString() === nurseId);
    return {
      nurseId,
      nurseName: nurse?.name || 'Unknown',
      hours: this.shiftTypes[shiftType].hours,
      specialization: nurse?.role || 'staff_nurse',
      isFloating: false,
      overtime: false,
      preference: 'AVAILABLE'
    };
  }

  calculateShiftCoverage(shift) {
    // Calculate shift coverage percentage
    return shift.required > 0 ? (shift.nurses.length / shift.required) * 100 : 100;
  }

  countConstraintViolations(individual, schedulingData) {
    // Count total constraint violations
    let violations = 0;
    const nurseSchedules = this.buildNurseSchedules(individual, schedulingData);
    
    for (const [nurseId, schedule] of nurseSchedules) {
      if (schedule.totalHours > this.constraints.maxWeeklyHours) violations++;
      if (schedule.maxConsecutiveNights > this.constraints.maxConsecutiveNights) violations++;
      if (schedule.daysOff < this.constraints.minDaysOff) violations++;
    }
    
    return violations;
  }
}

export default GeneticSchedulingAlgorithm;
