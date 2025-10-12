import mongoose from 'mongoose';
import Ward from '../models/Ward.js';
import Nurse from '../models/Nurse.js';
import Schedule from '../models/Schedule.js';

/**
 * Genetic Algorithm for Nurse Scheduling
 * Generates optimized schedules considering constraints and preferences
 */
class NurseSchedulingAlgorithm {
  constructor(wardId, startDate, endDate, settings = {}) {
    this.wardId = wardId;
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    
    // Algorithm parameters with defaults
    this.settings = {
      populationSize: settings.populationSize || 100,
      generations: settings.generations || 500,
      mutationRate: settings.mutationRate || 0.1,
      crossoverRate: settings.crossoverRate || 0.8,
      elitismRate: settings.elitismRate || 0.1,
      
      // Constraints
      maxConsecutiveNights: settings.maxConsecutiveNights || 3,
      maxWeeklyHours: settings.maxWeeklyHours || 48,
      minRestHours: settings.minRestHours || 11,
      enforceAvailability: settings.enforceAvailability !== false,
      allowOvertime: settings.allowOvertime || false,
      preferenceWeight: settings.preferenceWeight || 0.3,
      
      // Objective weights
      coverageWeight: settings.coverageWeight || 0.4,
      fairnessWeight: settings.fairnessWeight || 0.3,
      preferencesWeight: settings.preferencesWeight || 0.2,
      constraintsWeight: settings.constraintsWeight || 0.1
    };
    
    this.ward = null;
    this.nurses = [];
    this.dateRange = [];
    this.shifts = ['DAY', 'EVENING', 'NIGHT'];
    
    // Algorithm state
    this.population = [];
    this.bestSchedule = null;
    this.generationStats = [];
  }

  /**
   * Initialize the algorithm with ward and nurse data
   */
  async initialize() {
    try {
      // Load ward data
      this.ward = await Ward.findById(this.wardId).populate('nurses');
      if (!this.ward) {
        throw new Error('Ward not found');
      }

      // Load available nurses
      this.nurses = await Nurse.find({
        ward: this.wardId,
        isActive: true
      }).select('+workingConstraints +availability');

      if (this.nurses.length === 0) {
        throw new Error('No active nurses found for this ward');
      }

      // Generate date range
      this.dateRange = this.generateDateRange(this.startDate, this.endDate);

      console.log(`Initialized scheduling algorithm for ward: ${this.ward.name}`);
      console.log(`Nurses: ${this.nurses.length}, Days: ${this.dateRange.length}`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize scheduling algorithm:', error);
      throw error;
    }
  }

  /**
   * Generate the optimal schedule using genetic algorithm
   */
  async generateSchedule() {
    const startTime = Date.now();
    
    try {
      // Initialize the algorithm
      await this.initialize();
      
      // Create initial population
      this.population = this.createInitialPopulation();
      
      // Evolution loop
      for (let generation = 0; generation < this.settings.generations; generation++) {
        // Evaluate fitness for all individuals
        this.evaluatePopulation();
        
        // Track generation statistics
        const stats = this.getGenerationStats(generation);
        this.generationStats.push(stats);
        
        // Check for early termination (perfect solution found)
        if (stats.bestFitness >= 95) {
          console.log(`Early termination at generation ${generation} with fitness ${stats.bestFitness}`);
          break;
        }
        
        // Create next generation
        this.population = this.createNextGeneration();
        
        // Log progress every 50 generations
        if (generation % 50 === 0 || generation === this.settings.generations - 1) {
          console.log(`Generation ${generation}: Best fitness = ${stats.bestFitness.toFixed(2)}, Average = ${stats.averageFitness.toFixed(2)}`);
        }
      }
      
      // Get the best schedule from final population
      this.evaluatePopulation();
      const bestIndividual = this.getBestIndividual();
      
      // Convert to schedule format
      const schedule = await this.createScheduleFromIndividual(bestIndividual);
      
      const generationTime = Date.now() - startTime;
      schedule.qualityMetrics.generationTime = generationTime;
      schedule.qualityMetrics.algorithmIterations = this.generationStats.length;
      
      console.log(`Schedule generation completed in ${generationTime}ms`);
      console.log(`Final fitness score: ${bestIndividual.fitness.toFixed(2)}`);
      
      return schedule;
      
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      throw error;
    }
  }

  /**
   * Create initial population of random schedules
   */
  createInitialPopulation() {
    const population = [];
    
    for (let i = 0; i < this.settings.populationSize; i++) {
      const individual = this.createRandomIndividual();
      population.push(individual);
    }
    
    return population;
  }

  /**
   * Create a random schedule individual
   */
  createRandomIndividual() {
    const individual = {
      schedule: new Map(),
      fitness: 0,
      violations: []
    };
    
    // For each date in the range
    this.dateRange.forEach(dateStr => {
      const daySchedule = {
        shifts: {
          DAY: { nurses: [], requiredNurses: this.ward.staffingRequirements?.day || 2 },
          EVENING: { nurses: [], requiredNurses: this.ward.staffingRequirements?.evening || 2 },
          NIGHT: { nurses: [], requiredNurses: this.ward.staffingRequirements?.night || 1 }
        }
      };
      
      // Assign nurses to shifts randomly (respecting basic availability)
      this.shifts.forEach(shift => {
        const required = daySchedule.shifts[shift].requiredNurses;
        const availableNurses = this.getAvailableNurses(dateStr, shift);
        
        // Randomly select nurses for this shift
        const selectedNurses = this.randomlySelectNurses(availableNurses, required);
        daySchedule.shifts[shift].nurses = selectedNurses.map(nurse => ({
          nurseId: nurse._id,
          nurseName: nurse.name,
          hours: this.getShiftHours(shift),
          specialization: nurse.specialization,
          isFloating: false,
          overtime: false,
          preference: this.getNursePreference(nurse, dateStr, shift)
        }));
      });
      
      individual.schedule.set(dateStr, daySchedule);
    });
    
    return individual;
  }

  /**
   * Get available nurses for a specific date and shift
   */
  getAvailableNurses(dateStr, shift) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    
    return this.nurses.filter(nurse => {
      // Check if nurse is available on this day and shift
      if (this.settings.enforceAvailability && nurse.availability) {
        const dayAvailability = nurse.availability.weekly[dayName];
        if (dayAvailability && dayAvailability[shift.toLowerCase()]) {
          return dayAvailability[shift.toLowerCase()] !== 'UNAVAILABLE';
        }
      }
      return true; // If no specific availability data, assume available
    });
  }

  /**
   * Randomly select nurses from available pool
   */
  randomlySelectNurses(availableNurses, required) {
    if (availableNurses.length <= required) {
      return availableNurses;
    }
    
    const selected = [];
    const shuffled = [...availableNurses].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(required, shuffled.length); i++) {
      selected.push(shuffled[i]);
    }
    
    return selected;
  }

  /**
   * Get nurse preference for specific date/shift
   */
  getNursePreference(nurse, dateStr, shift) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    
    if (nurse.availability && nurse.availability.weekly[dayName]) {
      const preference = nurse.availability.weekly[dayName][shift.toLowerCase()];
      return preference || 'AVAILABLE';
    }
    
    return 'AVAILABLE';
  }

  /**
   * Get standard hours for a shift
   */
  getShiftHours(shift) {
    const hours = {
      'DAY': 8,
      'EVENING': 8,
      'NIGHT': 12
    };
    return hours[shift] || 8;
  }

  /**
   * Evaluate fitness for entire population
   */
  evaluatePopulation() {
    this.population.forEach(individual => {
      individual.fitness = this.calculateFitness(individual);
    });
    
    // Sort by fitness (descending)
    this.population.sort((a, b) => b.fitness - a.fitness);
  }

  /**
   * Calculate fitness score for an individual schedule
   */
  calculateFitness(individual) {
    const metrics = {
      coverage: this.calculateCoverageScore(individual),
      fairness: this.calculateFairnessScore(individual),
      preferences: this.calculatePreferenceScore(individual),
      constraints: this.calculateConstraintScore(individual)
    };
    
    // Weighted fitness score
    const fitness = 
      (metrics.coverage * this.settings.coverageWeight) +
      (metrics.fairness * this.settings.fairnessWeight) +
      (metrics.preferences * this.settings.preferencesWeight) +
      (metrics.constraints * this.settings.constraintsWeight);
    
    // Store metrics in individual
    individual.metrics = metrics;
    individual.violations = this.findConstraintViolations(individual);
    
    return fitness;
  }

  /**
   * Calculate coverage score (how well shifts are staffed)
   */
  calculateCoverageScore(individual) {
    let totalRequired = 0;
    let totalCovered = 0;
    
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        const required = daySchedule.shifts[shift].requiredNurses;
        const actual = daySchedule.shifts[shift].nurses.length;
        
        totalRequired += required;
        totalCovered += Math.min(actual, required);
      });
    });
    
    return totalRequired > 0 ? (totalCovered / totalRequired) * 100 : 0;
  }

  /**
   * Calculate fairness score (equitable distribution of shifts)
   */
  calculateFairnessScore(individual) {
    const nurseWorkload = new Map();
    
    // Calculate total shifts per nurse
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        daySchedule.shifts[shift].nurses.forEach(assignment => {
          const nurseId = assignment.nurseId.toString();
          nurseWorkload.set(nurseId, (nurseWorkload.get(nurseId) || 0) + 1);
        });
      });
    });
    
    if (nurseWorkload.size === 0) return 0;
    
    const workloads = Array.from(nurseWorkload.values());
    const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = better fairness
    // Convert to 0-100 scale where 100 is perfect fairness
    const maxExpectedStdDev = mean * 0.5; // Assume 50% of mean is maximum acceptable deviation
    const fairnessScore = Math.max(0, 100 - (stdDev / maxExpectedStdDev) * 100);
    
    return Math.min(100, fairnessScore);
  }

  /**
   * Calculate preference satisfaction score
   */
  calculatePreferenceScore(individual) {
    let totalAssignments = 0;
    let preferredAssignments = 0;
    
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        daySchedule.shifts[shift].nurses.forEach(assignment => {
          totalAssignments++;
          if (assignment.preference === 'PREFERRED') {
            preferredAssignments++;
          }
        });
      });
    });
    
    return totalAssignments > 0 ? (preferredAssignments / totalAssignments) * 100 : 0;
  }

  /**
   * Calculate constraint compliance score
   */
  calculateConstraintScore(individual) {
    const violations = this.findConstraintViolations(individual);
    const totalPossibleViolations = this.nurses.length * this.dateRange.length * 3; // Rough estimate
    
    const violationScore = violations.length;
    const maxViolations = totalPossibleViolations * 0.1; // Allow up to 10% violations
    
    const constraintScore = Math.max(0, 100 - (violationScore / maxViolations) * 100);
    return Math.min(100, constraintScore);
  }

  /**
   * Find all constraint violations in a schedule
   */
  findConstraintViolations(individual) {
    const violations = [];
    const nurseSchedules = this.getNurseSchedulesFromIndividual(individual);
    
    nurseSchedules.forEach((nurseSchedule, nurseId) => {
      const nurse = this.nurses.find(n => n._id.toString() === nurseId);
      if (!nurse) return;
      
      // Check consecutive night shifts
      const nightViolations = this.checkConsecutiveNights(nurseSchedule, nurse);
      violations.push(...nightViolations);
      
      // Check weekly hours
      const hourViolations = this.checkWeeklyHours(nurseSchedule, nurse);
      violations.push(...hourViolations);
      
      // Check availability violations
      if (this.settings.enforceAvailability) {
        const availabilityViolations = this.checkAvailabilityViolations(nurseSchedule, nurse);
        violations.push(...availabilityViolations);
      }
    });
    
    return violations;
  }

  /**
   * Get nurse schedules organized by nurse ID
   */
  getNurseSchedulesFromIndividual(individual) {
    const nurseSchedules = new Map();
    
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        daySchedule.shifts[shift].nurses.forEach(assignment => {
          const nurseId = assignment.nurseId.toString();
          if (!nurseSchedules.has(nurseId)) {
            nurseSchedules.set(nurseId, []);
          }
          
          nurseSchedules.get(nurseId).push({
            date: dateStr,
            shift: shift,
            hours: assignment.hours,
            assignment: assignment
          });
        });
      });
    });
    
    return nurseSchedules;
  }

  /**
   * Check consecutive night shift violations
   */
  checkConsecutiveNights(nurseSchedule, nurse) {
    const violations = [];
    const maxConsecutive = nurse.workingConstraints?.maxConsecutiveNights || this.settings.maxConsecutiveNights;
    
    // Sort by date
    const sortedSchedule = nurseSchedule.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let consecutiveNights = 0;
    let previousDate = null;
    
    sortedSchedule.forEach(entry => {
      const currentDate = new Date(entry.date);
      
      if (entry.shift === 'NIGHT') {
        // Check if this is consecutive to previous night
        if (previousDate && this.isConsecutiveDay(previousDate, currentDate)) {
          consecutiveNights++;
        } else {
          consecutiveNights = 1;
        }
        
        if (consecutiveNights > maxConsecutive) {
          violations.push({
            type: 'MAX_CONSECUTIVE_NIGHTS',
            nurseId: nurse._id,
            nurseName: nurse.name,
            description: `Nurse scheduled for ${consecutiveNights} consecutive night shifts (max: ${maxConsecutive})`,
            severity: 'HIGH',
            date: entry.date
          });
        }
        
        previousDate = currentDate;
      } else {
        consecutiveNights = 0;
        previousDate = null;
      }
    });
    
    return violations;
  }

  /**
   * Check weekly hours violations
   */
  checkWeeklyHours(nurseSchedule, nurse) {
    const violations = [];
    const maxWeeklyHours = nurse.workingConstraints?.maxWeeklyHours || this.settings.maxWeeklyHours;
    
    // Group by week
    const weeklyHours = new Map();
    
    nurseSchedule.forEach(entry => {
      const date = new Date(entry.date);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyHours.set(weekKey, (weeklyHours.get(weekKey) || 0) + entry.hours);
    });
    
    weeklyHours.forEach((hours, weekStart) => {
      if (hours > maxWeeklyHours) {
        violations.push({
          type: 'MAX_WEEKLY_HOURS',
          nurseId: nurse._id,
          nurseName: nurse.name,
          description: `Nurse scheduled for ${hours} hours in week starting ${weekStart} (max: ${maxWeeklyHours})`,
          severity: 'MEDIUM',
          date: weekStart
        });
      }
    });
    
    return violations;
  }

  /**
   * Check availability violations
   */
  checkAvailabilityViolations(nurseSchedule, nurse) {
    const violations = [];
    
    if (!nurse.availability || !nurse.availability.weekly) {
      return violations;
    }
    
    nurseSchedule.forEach(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      const dayAvailability = nurse.availability.weekly[dayName];
      if (dayAvailability) {
        const shiftAvailability = dayAvailability[entry.shift.toLowerCase()];
        if (shiftAvailability === 'UNAVAILABLE') {
          violations.push({
            type: 'UNAVAILABLE_ASSIGNMENT',
            nurseId: nurse._id,
            nurseName: nurse.name,
            description: `Nurse assigned to ${entry.shift} shift on ${entry.date} but marked as unavailable`,
            severity: 'CRITICAL',
            date: entry.date
          });
        }
      }
    });
    
    return violations;
  }

  /**
   * Create next generation using genetic operators
   */
  createNextGeneration() {
    const newPopulation = [];
    const eliteCount = Math.floor(this.settings.populationSize * this.settings.elitismRate);
    
    // Keep elite individuals
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(this.deepCopyIndividual(this.population[i]));
    }
    
    // Generate offspring to fill the rest
    while (newPopulation.length < this.settings.populationSize) {
      // Selection
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      
      // Crossover
      let offspring1, offspring2;
      if (Math.random() < this.settings.crossoverRate) {
        [offspring1, offspring2] = this.crossover(parent1, parent2);
      } else {
        offspring1 = this.deepCopyIndividual(parent1);
        offspring2 = this.deepCopyIndividual(parent2);
      }
      
      // Mutation
      if (Math.random() < this.settings.mutationRate) {
        this.mutate(offspring1);
      }
      if (Math.random() < this.settings.mutationRate) {
        this.mutate(offspring2);
      }
      
      newPopulation.push(offspring1);
      if (newPopulation.length < this.settings.populationSize) {
        newPopulation.push(offspring2);
      }
    }
    
    return newPopulation;
  }

  /**
   * Tournament selection for parent selection
   */
  tournamentSelection(tournamentSize = 3) {
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }
    
    // Return the best individual from tournament
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }

  /**
   * Crossover operation between two parents
   */
  crossover(parent1, parent2) {
    const offspring1 = this.deepCopyIndividual(parent1);
    const offspring2 = this.deepCopyIndividual(parent2);
    
    // Single-point crossover on date level
    const dates = Array.from(parent1.schedule.keys());
    const crossoverPoint = Math.floor(Math.random() * dates.length);
    
    for (let i = crossoverPoint; i < dates.length; i++) {
      const date = dates[i];
      // Swap schedule data for this date
      const temp = offspring1.schedule.get(date);
      offspring1.schedule.set(date, offspring2.schedule.get(date));
      offspring2.schedule.set(date, temp);
    }
    
    return [offspring1, offspring2];
  }

  /**
   * Mutation operation
   */
  mutate(individual) {
    const dates = Array.from(individual.schedule.keys());
    const randomDate = dates[Math.floor(Math.random() * dates.length)];
    const randomShift = this.shifts[Math.floor(Math.random() * this.shifts.length)];
    
    const daySchedule = individual.schedule.get(randomDate);
    const shiftSchedule = daySchedule.shifts[randomShift];
    
    // Mutation strategies (randomly choose one)
    const strategies = ['reassign', 'add', 'remove'];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];
    
    switch (strategy) {
      case 'reassign':
        this.mutateReassign(shiftSchedule, randomDate, randomShift);
        break;
      case 'add':
        this.mutateAdd(shiftSchedule, randomDate, randomShift);
        break;
      case 'remove':
        this.mutateRemove(shiftSchedule);
        break;
    }
  }

  /**
   * Mutation: Reassign a nurse in a shift
   */
  mutateReassign(shiftSchedule, date, shift) {
    if (shiftSchedule.nurses.length === 0) return;
    
    const availableNurses = this.getAvailableNurses(date, shift);
    if (availableNurses.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * shiftSchedule.nurses.length);
    const newNurse = availableNurses[Math.floor(Math.random() * availableNurses.length)];
    
    shiftSchedule.nurses[randomIndex] = {
      nurseId: newNurse._id,
      nurseName: newNurse.name,
      hours: this.getShiftHours(shift),
      specialization: newNurse.specialization,
      isFloating: false,
      overtime: false,
      preference: this.getNursePreference(newNurse, date, shift)
    };
  }

  /**
   * Mutation: Add a nurse to a shift
   */
  mutateAdd(shiftSchedule, date, shift) {
    const availableNurses = this.getAvailableNurses(date, shift);
    if (availableNurses.length === 0) return;
    
    // Don't add if already at required capacity (unless allowing overtime)
    if (!this.settings.allowOvertime && shiftSchedule.nurses.length >= shiftSchedule.requiredNurses) {
      return;
    }
    
    const newNurse = availableNurses[Math.floor(Math.random() * availableNurses.length)];
    
    // Check if nurse is already assigned to this shift
    const alreadyAssigned = shiftSchedule.nurses.some(assignment => 
      assignment.nurseId.toString() === newNurse._id.toString()
    );
    
    if (!alreadyAssigned) {
      shiftSchedule.nurses.push({
        nurseId: newNurse._id,
        nurseName: newNurse.name,
        hours: this.getShiftHours(shift),
        specialization: newNurse.specialization,
        isFloating: false,
        overtime: shiftSchedule.nurses.length >= shiftSchedule.requiredNurses,
        preference: this.getNursePreference(newNurse, date, shift)
      });
    }
  }

  /**
   * Mutation: Remove a nurse from a shift
   */
  mutateRemove(shiftSchedule) {
    if (shiftSchedule.nurses.length <= 1) return; // Keep at least one nurse
    
    const randomIndex = Math.floor(Math.random() * shiftSchedule.nurses.length);
    shiftSchedule.nurses.splice(randomIndex, 1);
  }

  /**
   * Get best individual from population
   */
  getBestIndividual() {
    return this.population[0]; // Population is sorted by fitness
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(generation) {
    const fitnesses = this.population.map(ind => ind.fitness);
    
    return {
      generation,
      bestFitness: Math.max(...fitnesses),
      averageFitness: fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      populationSize: this.population.length
    };
  }

  /**
   * Convert best individual to Schedule model format
   */
  async createScheduleFromIndividual(individual) {
    const scheduleData = new Map();
    const nurseStats = new Map();
    
    // Convert individual schedule to schedule data format
    individual.schedule.forEach((daySchedule, dateStr) => {
      const convertedDay = {
        shifts: {
          DAY: {
            nurses: daySchedule.shifts.DAY.nurses,
            requiredNurses: daySchedule.shifts.DAY.requiredNurses,
            actualNurses: daySchedule.shifts.DAY.nurses.length,
            coverage: Math.min(100, (daySchedule.shifts.DAY.nurses.length / daySchedule.shifts.DAY.requiredNurses) * 100)
          },
          EVENING: {
            nurses: daySchedule.shifts.EVENING.nurses,
            requiredNurses: daySchedule.shifts.EVENING.requiredNurses,
            actualNurses: daySchedule.shifts.EVENING.nurses.length,
            coverage: Math.min(100, (daySchedule.shifts.EVENING.nurses.length / daySchedule.shifts.EVENING.requiredNurses) * 100)
          },
          NIGHT: {
            nurses: daySchedule.shifts.NIGHT.nurses,
            requiredNurses: daySchedule.shifts.NIGHT.requiredNurses,
            actualNurses: daySchedule.shifts.NIGHT.nurses.length,
            coverage: Math.min(100, (daySchedule.shifts.NIGHT.nurses.length / daySchedule.shifts.NIGHT.requiredNurses) * 100)
          }
        },
        dailyStats: {
          totalNurses: daySchedule.shifts.DAY.nurses.length + daySchedule.shifts.EVENING.nurses.length + daySchedule.shifts.NIGHT.nurses.length,
          totalHours: this.calculateDayTotalHours(daySchedule),
          averageCoverage: this.calculateDayAverageCoverage(daySchedule),
          constraintViolations: individual.violations.filter(v => v.date === dateStr)
        }
      };
      
      scheduleData.set(dateStr, convertedDay);
    });
    
    // Calculate nurse statistics
    this.calculateNurseStats(individual, nurseStats);
    
    // Create schedule object
    const schedule = new Schedule({
      ward: this.wardId,
      wardName: this.ward.name,
      startDate: this.startDate,
      endDate: this.endDate,
      scheduleData: scheduleData,
      nurseStats: nurseStats,
      status: 'DRAFT',
      generatedBy: 'genetic-algorithm',
      generationSettings: {
        algorithm: 'GENETIC',
        parameters: {
          populationSize: this.settings.populationSize,
          generations: this.settings.generations,
          mutationRate: this.settings.mutationRate,
          crossoverRate: this.settings.crossoverRate,
          elitismRate: this.settings.elitismRate
        },
        constraints: {
          maxConsecutiveNights: this.settings.maxConsecutiveNights,
          maxWeeklyHours: this.settings.maxWeeklyHours,
          minRestHours: this.settings.minRestHours,
          enforceAvailability: this.settings.enforceAvailability,
          allowOvertime: this.settings.allowOvertime,
          preferenceWeight: this.settings.preferenceWeight
        },
        objectives: {
          coverageWeight: this.settings.coverageWeight,
          fairnessWeight: this.settings.fairnessWeight,
          preferencesWeight: this.settings.preferencesWeight,
          constraintsWeight: this.settings.constraintsWeight
        }
      },
      qualityMetrics: {
        overallScore: individual.fitness,
        coverageScore: individual.metrics.coverage,
        fairnessScore: individual.metrics.fairness,
        preferenceScore: individual.metrics.preferences,
        constraintScore: individual.metrics.constraints,
        statistics: this.calculateOverallStatistics(individual),
        generationTime: 0, // Will be set by caller
        algorithmIterations: 0 // Will be set by caller
      },
      issues: individual.violations.map(v => ({
        type: v.type,
        description: v.description,
        severity: v.severity,
        date: v.date,
        shift: v.shift,
        resolved: false,
        reportedAt: new Date()
      }))
    });
    
    return schedule;
  }

  /**
   * Calculate total hours for a day
   */
  calculateDayTotalHours(daySchedule) {
    let total = 0;
    this.shifts.forEach(shift => {
      daySchedule.shifts[shift].nurses.forEach(nurse => {
        total += nurse.hours;
      });
    });
    return total;
  }

  /**
   * Calculate average coverage for a day
   */
  calculateDayAverageCoverage(daySchedule) {
    let totalCoverage = 0;
    this.shifts.forEach(shift => {
      const required = daySchedule.shifts[shift].requiredNurses;
      const actual = daySchedule.shifts[shift].nurses.length;
      totalCoverage += Math.min(100, (actual / required) * 100);
    });
    return totalCoverage / this.shifts.length;
  }

  /**
   * Calculate nurse statistics for the schedule
   */
  calculateNurseStats(individual, nurseStats) {
    const nurseData = new Map();
    
    // Initialize nurse stats
    this.nurses.forEach(nurse => {
      nurseData.set(nurse._id.toString(), {
        nurseId: nurse._id,
        nurseName: nurse.name,
        totalHours: 0,
        totalShifts: 0,
        shiftDistribution: { DAY: 0, EVENING: 0, NIGHT: 0 },
        consecutiveNights: 0,
        maxConsecutiveNights: 0,
        weeklyHours: 0,
        overtimeHours: 0,
        preferenceSatisfaction: 0,
        constraintViolations: 0
      });
    });
    
    // Calculate stats from schedule
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        daySchedule.shifts[shift].nurses.forEach(assignment => {
          const nurseId = assignment.nurseId.toString();
          const stats = nurseData.get(nurseId);
          
          if (stats) {
            stats.totalHours += assignment.hours;
            stats.totalShifts += 1;
            stats.shiftDistribution[shift] += 1;
            
            if (assignment.overtime) {
              stats.overtimeHours += assignment.hours;
            }
            
            if (assignment.preference === 'PREFERRED') {
              stats.preferenceSatisfaction += 1;
            }
          }
        });
      });
    });
    
    // Calculate preference satisfaction percentage
    nurseData.forEach((stats, nurseId) => {
      if (stats.totalShifts > 0) {
        stats.preferenceSatisfaction = (stats.preferenceSatisfaction / stats.totalShifts) * 100;
      }
      
      // Count constraint violations for this nurse
      stats.constraintViolations = individual.violations.filter(v => 
        v.nurseId.toString() === nurseId
      ).length;
    });
    
    // Convert to Map format expected by Schema
    nurseData.forEach((stats, nurseId) => {
      nurseStats.set(nurseId, stats);
    });
  }

  /**
   * Calculate overall statistics for the schedule
   */
  calculateOverallStatistics(individual) {
    let totalShifts = 0;
    let totalHours = 0;
    let totalCoverage = 0;
    let totalDays = 0;
    
    individual.schedule.forEach((daySchedule, dateStr) => {
      totalDays++;
      this.shifts.forEach(shift => {
        const nurses = daySchedule.shifts[shift].nurses;
        const required = daySchedule.shifts[shift].requiredNurses;
        
        totalShifts += nurses.length;
        totalHours += nurses.reduce((sum, nurse) => sum + nurse.hours, 0);
        totalCoverage += Math.min(100, (nurses.length / required) * 100);
      });
    });
    
    const activeNurses = new Set();
    individual.schedule.forEach((daySchedule, dateStr) => {
      this.shifts.forEach(shift => {
        daySchedule.shifts[shift].nurses.forEach(assignment => {
          activeNurses.add(assignment.nurseId.toString());
        });
      });
    });
    
    return {
      totalShifts,
      totalHours,
      averageShiftsPerNurse: activeNurses.size > 0 ? totalShifts / activeNurses.size : 0,
      averageHoursPerNurse: activeNurses.size > 0 ? totalHours / activeNurses.size : 0,
      totalConstraintViolations: individual.violations.length,
      averageCoverage: totalDays > 0 ? totalCoverage / (totalDays * this.shifts.length) : 0
    };
  }

  /**
   * Utility functions
   */
  generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  isConsecutiveDay(date1, date2) {
    const diff = Math.abs(date2 - date1);
    return diff === 24 * 60 * 60 * 1000; // 1 day in milliseconds
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  deepCopyIndividual(individual) {
    return {
      schedule: new Map(individual.schedule),
      fitness: individual.fitness,
      violations: [...(individual.violations || [])],
      metrics: individual.metrics ? { ...individual.metrics } : undefined
    };
  }
}

export default NurseSchedulingAlgorithm;