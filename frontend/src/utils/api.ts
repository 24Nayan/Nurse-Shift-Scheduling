// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface Nurse {
  id: string;
  email: string;
  name: string;
  role: string;
  nurseId: string;
  qualifications: string[];
  wardAccess: string[];
  hierarchyLevel: number;
  yearsOfExperience: number;
  availability: Record<string, any>;
  createdAt: string;
}

export interface Ward {
  _id: string;
  name: string;
  department: string;
  description?: string;
  capacity: number;
  currentOccupancy: number;
  location: string;
  dailyStaff: {
    nurses: number;
    doctors: number;
    support: number;
  };
  qualifications: string[];
  patientTypes: string[];
  shiftRequirements: {
    day: { nurses: number; doctors: number; support: number };
    evening: { nurses: number; doctors: number; support: number };
    night: { nurses: number; doctors: number; support: number };
  };
  specialEquipment?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// API Utility functions
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; count?: number; total?: number; page?: number; pages?: number; message?: string; error?: string }> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const result = await response.json();
      
      if (!response.ok) {
        let errorMessage = result.message || `HTTP error! status: ${response.status}`;
        if (result.details && result.details.length > 0) {
          errorMessage += '\nDetails: ' + result.details.join(', ');
        }
        throw new Error(errorMessage);
      }
      
      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Nurses API
  async getNurses(params?: {
    page?: number;
    limit?: number;
    ward?: string;
    role?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/nurses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<Nurse[]>(endpoint);
  }

  async getNurse(id: string) {
    return this.request<Nurse>(`/nurses/${id}`);
  }

  async checkNurseAvailability(nurseId?: string, email?: string) {
    const params = new URLSearchParams();
    if (nurseId) params.append('nurseId', nurseId);
    if (email) params.append('email', email);
    
    return this.request<{
      nurseId?: { available: boolean; exists: boolean };
      email?: { available: boolean; exists: boolean };
    }>(`/nurses/check-availability?${params.toString()}`);
  }

  async createNurse(nurseData: {
    name: string;
    email: string;
    role: string;
    nurseId?: string;
    qualifications?: string[];
    wardAccess?: string[];
    hierarchyLevel?: number;
    yearsOfExperience?: number;
  }) {
    return this.request<Nurse>('/nurses', {
      method: 'POST',
      body: JSON.stringify(nurseData),
    });
  }

  async updateNurse(id: string, nurseData: Partial<{
    name: string;
    email: string;
    role: string;
    nurseId: string;
    qualifications: string[];
    wardAccess: string[];
    hierarchyLevel: number;
    yearsOfExperience: number;
  }>) {
    return this.request<Nurse>(`/nurses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(nurseData),
    });
  }

  async deleteNurse(id: string) {
    return this.request(`/nurses/${id}`, {
      method: 'DELETE',
    });
  }

  // Wards API
  async getWards(params?: {
    page?: number;
    limit?: number;
    patientType?: string;
    qualification?: string;
    minCapacity?: number;
    maxCapacity?: number;
    isActive?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/wards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getWard(id: string) {
    return this.request(`/wards/${id}`);
  }

  async getWardStats() {
    return this.request('/wards/stats');
  }

  async createWard(wardData: {
    name: string;
    department: string;
    capacity: number;
    currentOccupancy?: number;
    location?: string;
    dailyStaff: {
      nurses: number;
      doctors: number;
      support: number;
    };
    qualifications: string[];
    patientTypes: string[];
    shiftRequirements: {
      day: { nurses: number; doctors: number; support: number };
      evening: { nurses: number; doctors: number; support: number };
      night: { nurses: number; doctors: number; support: number };
    };
    specialEquipment?: string[];
    notes?: string;
  }) {
    return this.request('/wards', {
      method: 'POST',
      body: JSON.stringify(wardData),
    });
  }

  async updateWard(id: string, wardData: Partial<{
    name: string;
    department: string;
    description: string;
    capacity: number;
    currentOccupancy: number;
    location: string;
    dailyStaff: {
      nurses: number;
      doctors: number;
      support: number;
    };
    qualifications: string[];
    patientTypes: string[];
    shiftRequirements: {
      day: { nurses: number; doctors: number; support: number };
      evening: { nurses: number; doctors: number; support: number };
      night: { nurses: number; doctors: number; support: number };
    };
    specialEquipment: string[];
    notes: string;
  }>) {
    return this.request(`/wards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(wardData),
    });
  }

  async deleteWard(id: string) {
    return this.request(`/wards/${id}`, {
      method: 'DELETE',
    });
  }

  async reactivateWard(id: string) {
    return this.request(`/wards/${id}/activate`, {
      method: 'PATCH',
    });
  }

  async getWardsByPatientType(patientType: string) {
    return this.request(`/wards/patient-types/${patientType}`);
  }

  async getWardsByQualification(qualification: string) {
    return this.request(`/wards/qualifications/${qualification}`);
  }

  // Shifts API
  async getShifts(params?: {
    page?: number;
    limit?: number;
    type?: string;
    ward?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/shifts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getShift(id: string) {
    return this.request(`/shifts/${id}`);
  }

  async createShift(shiftData: {
    name: string;
    startTime: string;
    endTime: string;
    type: string;
    ward?: string;
    requiredStaff?: number;
  }) {
    return this.request('/shifts', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
  }

  async updateShift(id: string, shiftData: Partial<{
    name: string;
    startTime: string;
    endTime: string;
    type: string;
    ward: string;
    requiredStaff: number;
  }>) {
    return this.request(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    });
  }

  async deleteShift(id: string) {
    return this.request(`/shifts/${id}`, {
      method: 'DELETE',
    });
  }

  // Schedules API
  async getSchedules(params?: {
    page?: number;
    limit?: number;
    ward?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/schedules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getSchedule(id: string) {
    return this.request(`/schedules/${id}`);
  }

  async createSchedule(scheduleData: {
    name: string;
    ward: string;
    startDate: string;
    endDate: string;
    assignments?: Array<{
      nurse: string;
      shift: string;
      date: string;
    }>;
  }) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  async updateSchedule(id: string, scheduleData: any) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    });
  }

  async deleteSchedule(id: string) {
    return this.request(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  async publishSchedule(id: string) {
    return this.request(`/schedules/${id}/publish`, {
      method: 'PATCH',
    });
  }

  async activateSchedule(id: string) {
    return this.request(`/schedules/${id}/activate`, {
      method: 'PATCH',
    });
  }

  async completeSchedule(id: string) {
    return this.request(`/schedules/${id}/complete`, {
      method: 'PATCH',
    });
  }

  // Generate Schedule using Genetic Algorithm
  async generateSchedule(scheduleData: {
    wardId: string;
    startDate: string;
    endDate: string;
    settings?: {
      populationSize?: number;
      generations?: number;
      mutationRate?: number;
      crossoverRate?: number;
      elitismRate?: number;
      maxConsecutiveNights?: number;
      maxWeeklyHours?: number;
      minRestHours?: number;
      enforceAvailability?: boolean;
      allowOvertime?: boolean;
      preferenceWeight?: number;
      coverageWeight?: number;
      fairnessWeight?: number;
      preferencesWeight?: number;
      constraintsWeight?: number;
    };
  }) {
    return this.request('/schedules/generate', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;