/**
 * Minimal test version of genetic algorithm to isolate the const assignment error
 */
class TestGeneticAlgorithm {
  constructor() {
    this.populationSize = 10;
    this.shiftTypes = {
      DAY: { hours: 8 },
      EVENING: { hours: 8 },
      NIGHT: { hours: 8 }
    };
  }

  async optimizeSchedule({ wards, nurses, startDate, endDate, preferences = {} }) {
    console.log('🧪 Testing genetic algorithm...');
    
    try {
      // Simple test data
      let testData = {
        dates: ['2025-10-12'],
        wards: [{_id: 'test-ward', shiftRequirements: {day: {nurses: 1}, evening: {nurses: 1}, night: {nurses: 1}}}],
        nurses: [{_id: 'test-nurse'}]
      };
      
      // Simple test individual creation
      let individual = this.createTestIndividual(testData);
      console.log('✅ Test individual created successfully');
      
      return {
        success: true,
        message: 'Test completed successfully',
        data: individual,
        qualityMetrics: {
          overallScore: 0.85,
          coverageScore: 0.90,
          fairnessScore: 0.80,
          preferenceScore: 0.70,
          constraintScore: 0.95,
          statistics: {
            totalShifts: 3,
            totalHours: 24,
            averageShiftsPerNurse: 0.1,
            averageHoursPerNurse: 0.6,
            totalConstraintViolations: 0,
            averageCoverage: 90
          },
          generationTime: 100,
          algorithmIterations: 1,
          convergenceHistory: []
        }
      };
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  createTestIndividual(testData) {
    let individual = {};
    
    // Very simple structure
    for (let date of testData.dates) {
      individual[date] = {};
      
      for (let ward of testData.wards) {
        individual[date][ward._id] = {
          DAY: { nurses: [] },
          EVENING: { nurses: [] },
          NIGHT: { nurses: [] }
        };
        
        // Simple assignment test
        for (let shiftType of ['DAY', 'EVENING', 'NIGHT']) {
          individual[date][ward._id][shiftType].nurses.push('test-nurse');
        }
      }
    }
    
    return individual;
  }
}

export default TestGeneticAlgorithm;