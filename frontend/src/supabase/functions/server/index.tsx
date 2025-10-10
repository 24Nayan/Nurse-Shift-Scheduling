import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from './kv_store.tsx';

const app = new Hono();

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));

// Enable logging
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Auth routes
app.post('/make-server-c76fcf04/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, nurseId, qualifications } = body;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return c.json({ error: authError.message }, 400);
    }

    // Store nurse profile in KV store
    const nurseProfile = {
      id: authData.user.id,
      email,
      name,
      role,
      nurseId,
      qualifications: qualifications ? qualifications.split(',').map((q: string) => q.trim()) : [],
      wardAccess: role === 'admin' ? ['all'] : role === 'charge_nurse' ? ['ICU', 'Emergency', 'Surgery'] : ['General', 'Pediatrics'],
      hierarchyLevel: role === 'admin' ? 3 : role === 'charge_nurse' ? 2 : 1,
      availability: {
        monday: { available: true, preferred_shift: 'day' },
        tuesday: { available: true, preferred_shift: 'day' },
        wednesday: { available: true, preferred_shift: 'day' },
        thursday: { available: true, preferred_shift: 'day' },
        friday: { available: true, preferred_shift: 'day' },
        saturday: { available: false, preferred_shift: null },
        sunday: { available: false, preferred_shift: null },
      },
      createdAt: new Date().toISOString(),
    };

    await kv.set(`nurse:${authData.user.id}`, nurseProfile);

    return c.json({ message: 'User created successfully', userId: authData.user.id });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

app.get('/make-server-c76fcf04/auth/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      console.error('Auth profile error:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get nurse profile from KV store
    const nurseProfile = await kv.get(`nurse:${user.id}`);
    if (!nurseProfile) {
      return c.json({ error: 'Nurse profile not found' }, 404);
    }

    return c.json(nurseProfile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return c.json({ error: 'Internal server error fetching profile' }, 500);
  }
});

// Nurses management routes
app.get('/make-server-c76fcf04/nurses', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all nurses from KV store
    const nurses = await kv.getByPrefix('nurse:');
    return c.json(nurses || []);
  } catch (error) {
    console.error('Nurses fetch error:', error);
    return c.json({ error: 'Internal server error fetching nurses' }, 500);
  }
});

// Wards management routes
app.get('/make-server-c76fcf04/wards', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get wards from KV store or create default ones
    let wards = await kv.get('wards');
    if (!wards) {
      wards = [
        {
          id: '1',
          name: 'ICU',
          description: 'Intensive Care Unit',
          requiredQualifications: ['RN', 'ACLS', 'Critical Care'],
          minHierarchyLevel: 2,
          capacity: 12,
          patientTypes: ['critical', 'post-surgery'],
          shiftRequirements: {
            day: { nurses: 4, charge_nurse: 1 },
            night: { nurses: 3, charge_nurse: 1 },
            evening: { nurses: 3, charge_nurse: 1 }
          }
        },
        {
          id: '2',
          name: 'Emergency',
          description: 'Emergency Department',
          requiredQualifications: ['RN', 'ACLS', 'BLS'],
          minHierarchyLevel: 2,
          capacity: 20,
          patientTypes: ['trauma', 'emergency'],
          shiftRequirements: {
            day: { nurses: 6, charge_nurse: 1 },
            night: { nurses: 4, charge_nurse: 1 },
            evening: { nurses: 5, charge_nurse: 1 }
          }
        },
        {
          id: '3',
          name: 'General',
          description: 'General Medical Ward',
          requiredQualifications: ['RN'],
          minHierarchyLevel: 1,
          capacity: 30,
          patientTypes: ['general', 'recovery'],
          shiftRequirements: {
            day: { nurses: 5, charge_nurse: 1 },
            night: { nurses: 3, charge_nurse: 1 },
            evening: { nurses: 4, charge_nurse: 1 }
          }
        },
        {
          id: '4',
          name: 'Pediatrics',
          description: 'Children\'s Ward',
          requiredQualifications: ['RN', 'PALS'],
          minHierarchyLevel: 1,
          capacity: 16,
          patientTypes: ['pediatric'],
          shiftRequirements: {
            day: { nurses: 3, charge_nurse: 1 },
            night: { nurses: 2, charge_nurse: 1 },
            evening: { nurses: 3, charge_nurse: 1 }
          }
        },
        {
          id: '5',
          name: 'Surgery',
          description: 'Surgical Ward',
          requiredQualifications: ['RN', 'Surgical', 'ACLS'],
          minHierarchyLevel: 2,
          capacity: 18,
          patientTypes: ['pre-surgery', 'post-surgery'],
          shiftRequirements: {
            day: { nurses: 4, charge_nurse: 1 },
            night: { nurses: 2, charge_nurse: 1 },
            evening: { nurses: 3, charge_nurse: 1 }
          }
        }
      ];
      await kv.set('wards', wards);
    }

    return c.json(wards);
  } catch (error) {
    console.error('Wards fetch error:', error);
    return c.json({ error: 'Internal server error fetching wards' }, 500);
  }
});

// Schedule generation route
app.post('/make-server-c76fcf04/generate-schedule', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is admin or charge nurse
    const userProfile = await kv.get(`nurse:${user.id}`);
    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'charge_nurse')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const { startDate, endDate } = await c.req.json();

    // Get nurses and wards
    const nurses = await kv.getByPrefix('nurse:') || [];
    const wards = await kv.get('wards') || [];

    // Basic scheduling algorithm
    const schedule = generateOptimalSchedule(nurses, wards, startDate, endDate);

    // Store the schedule
    await kv.set(`schedule:${startDate}:${endDate}`, {
      startDate,
      endDate,
      schedule,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id
    });

    return c.json({ message: 'Schedule generated successfully', schedule });
  } catch (error) {
    console.error('Schedule generation error:', error);
    return c.json({ error: 'Internal server error generating schedule' }, 500);
  }
});

// Basic scheduling algorithm
function generateOptimalSchedule(nurses: any[], wards: any[], startDate: string, endDate: string) {
  const schedule: any[] = [];
  const shifts = ['day', 'evening', 'night'];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });

    for (const shift of shifts) {
      for (const ward of wards) {
        const requirements = ward.shiftRequirements[shift];
        
        // Find eligible nurses for this ward
        const eligibleNurses = nurses.filter(nurse => {
          const hasQualifications = ward.requiredQualifications.every((qual: string) => 
            nurse.qualifications.includes(qual)
          );
          const hasAccess = nurse.wardAccess.includes('all') || nurse.wardAccess.includes(ward.name);
          const meetsHierarchy = nurse.hierarchyLevel >= ward.minHierarchyLevel;
          const isAvailable = nurse.availability[dayOfWeek]?.available;
          
          return hasQualifications && hasAccess && meetsHierarchy && isAvailable;
        });

        // Assign charge nurse first
        if (requirements.charge_nurse > 0) {
          const chargeNurse = eligibleNurses.find(nurse => nurse.role === 'charge_nurse' || nurse.role === 'admin');
          if (chargeNurse) {
            schedule.push({
              date: dateStr,
              shift,
              wardId: ward.id,
              wardName: ward.name,
              nurseId: chargeNurse.id,
              nurseName: chargeNurse.name,
              role: 'charge',
              assignedAt: new Date().toISOString()
            });
          }
        }

        // Assign staff nurses
        const availableStaff = eligibleNurses.filter(nurse => 
          nurse.role === 'staff_nurse' && 
          !schedule.some(s => s.date === dateStr && s.shift === shift && s.nurseId === nurse.id)
        );

        for (let i = 0; i < Math.min(requirements.nurses, availableStaff.length); i++) {
          const nurse = availableStaff[i];
          schedule.push({
            date: dateStr,
            shift,
            wardId: ward.id,
            wardName: ward.name,
            nurseId: nurse.id,
            nurseName: nurse.name,
            role: 'staff',
            assignedAt: new Date().toISOString()
          });
        }
      }
    }
  }

  return schedule;
}

// Get schedule route
app.get('/make-server-c76fcf04/schedule', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!startDate || !endDate) {
      return c.json({ error: 'Start date and end date are required' }, 400);
    }

    const scheduleData = await kv.get(`schedule:${startDate}:${endDate}`);
    
    if (!scheduleData) {
      return c.json({ schedule: [], message: 'No schedule found for this date range' });
    }

    // Filter schedule based on user role
    const userProfile = await kv.get(`nurse:${user.id}`);
    let filteredSchedule = scheduleData.schedule;

    if (userProfile?.role === 'staff_nurse') {
      // Staff nurses only see their own schedule
      filteredSchedule = scheduleData.schedule.filter((entry: any) => entry.nurseId === user.id);
    }

    return c.json({
      ...scheduleData,
      schedule: filteredSchedule
    });
  } catch (error) {
    console.error('Schedule fetch error:', error);
    return c.json({ error: 'Internal server error fetching schedule' }, 500);
  }
});

// Initialize with demo data - This endpoint should work without authentication
app.post('/make-server-c76fcf04/init-demo', async (c) => {
  try {
    console.log('=== DEMO INITIALIZATION STARTED ===');
    
    // Check if demo users already exist by checking KV store first
    let adminExists = false;
    let nurseExists = false;
    
    try {
      const existingAdminProfile = await kv.get('nurse:admin@hospital.com');
      const existingNurseProfile = await kv.get('nurse:nurse@hospital.com');
      
      if (existingAdminProfile) {
        adminExists = true;
        console.log('Admin profile already exists in KV store');
      }
      
      if (existingNurseProfile) {
        nurseExists = true;
        console.log('Nurse profile already exists in KV store');
      }
    } catch (kvError) {
      console.log('KV check error (normal on first run):', kvError);
    }

    // Create demo admin user
    if (!adminExists) {
      console.log('Creating admin user...');
      try {
        const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
          email: 'admin@hospital.com',
          password: 'admin123',
          user_metadata: { name: 'Dr. Sarah Johnson', role: 'admin' },
          email_confirm: true
        });

        if (adminError) {
          console.error('Admin creation error:', adminError);
          if (!adminError.message.includes('already registered')) {
            throw adminError;
          }
        } else if (adminUser?.user?.id) {
          console.log('✅ Created admin user:', adminUser.user.id);
          const adminProfile = {
            id: adminUser.user.id,
            email: 'admin@hospital.com',
            name: 'Dr. Sarah Johnson',
            role: 'admin',
            nurseId: 'A001',
            qualifications: ['MD', 'RN', 'ACLS', 'PALS', 'Critical Care'],
            wardAccess: ['all'],
            hierarchyLevel: 3,
            availability: {
              monday: { available: true, preferred_shift: 'day' },
              tuesday: { available: true, preferred_shift: 'day' },
              wednesday: { available: true, preferred_shift: 'day' },
              thursday: { available: true, preferred_shift: 'day' },
              friday: { available: true, preferred_shift: 'day' },
              saturday: { available: false, preferred_shift: null },
              sunday: { available: false, preferred_shift: null },
            },
            createdAt: new Date().toISOString(),
          };
          
          await kv.set(`nurse:${adminUser.user.id}`, adminProfile);
          await kv.set('nurse:admin@hospital.com', adminProfile);
          console.log('✅ Admin profile stored successfully');
        }
      } catch (error) {
        console.error('Failed to create admin user:', error);
      }
    }

    // Create demo nurse user
    if (!nurseExists) {
      console.log('Creating nurse user...');
      try {
        const { data: nurseUser, error: nurseError } = await supabase.auth.admin.createUser({
          email: 'nurse@hospital.com',
          password: 'nurse123',
          user_metadata: { name: 'Emily Rodriguez, RN', role: 'staff_nurse' },
          email_confirm: true
        });

        if (nurseError) {
          console.error('Nurse creation error:', nurseError);
          if (!nurseError.message.includes('already registered')) {
            throw nurseError;
          }
        } else if (nurseUser?.user?.id) {
          console.log('✅ Created nurse user:', nurseUser.user.id);
          const nurseProfile = {
            id: nurseUser.user.id,
            email: 'nurse@hospital.com',
            name: 'Emily Rodriguez, RN',
            role: 'staff_nurse',
            nurseId: 'N001',
            qualifications: ['RN', 'BLS', 'PALS'],
            wardAccess: ['General', 'Pediatrics'],
            hierarchyLevel: 1,
            availability: {
              monday: { available: true, preferred_shift: 'day' },
              tuesday: { available: true, preferred_shift: 'day' },
              wednesday: { available: true, preferred_shift: 'evening' },
              thursday: { available: true, preferred_shift: 'day' },
              friday: { available: true, preferred_shift: 'day' },
              saturday: { available: true, preferred_shift: 'night' },
              sunday: { available: false, preferred_shift: null },
            },
            createdAt: new Date().toISOString(),
          };
          
          await kv.set(`nurse:${nurseUser.user.id}`, nurseProfile);
          await kv.set('nurse:nurse@hospital.com', nurseProfile);
          console.log('✅ Nurse profile stored successfully');
        }
      } catch (error) {
        console.error('Failed to create nurse user:', error);
      }
    }

    // Create additional demo nurses if they don't exist
    const demoNurses = [
      {
        email: 'michael.chen@hospital.com',
        password: 'demo123',
        name: 'Michael Chen, RN',
        role: 'charge_nurse',
        nurseId: 'C002',
        qualifications: ['RN', 'BSN', 'ACLS', 'Critical Care'],
        wardAccess: ['ICU', 'Emergency'],
        hierarchyLevel: 2
      },
      {
        email: 'sarah.wilson@hospital.com', 
        password: 'demo123',
        name: 'Sarah Wilson, RN',
        role: 'staff_nurse',
        nurseId: 'N002',
        qualifications: ['RN', 'BLS', 'PALS'],
        wardAccess: ['Pediatrics', 'General'],
        hierarchyLevel: 1
      }
    ];

    for (const demoNurse of demoNurses) {
      try {
        const existingProfile = await kv.get(`nurse:${demoNurse.email}`);
        if (!existingProfile) {
          const { data: user, error } = await supabase.auth.admin.createUser({
            email: demoNurse.email,
            password: demoNurse.password,
            user_metadata: { name: demoNurse.name, role: demoNurse.role },
            email_confirm: true
          });

          if (!error && user?.user?.id) {
            const profile = {
              id: user.user.id,
              email: demoNurse.email,
              name: demoNurse.name,
              role: demoNurse.role,
              nurseId: demoNurse.nurseId,
              qualifications: demoNurse.qualifications,
              wardAccess: demoNurse.wardAccess,
              hierarchyLevel: demoNurse.hierarchyLevel,
              availability: {
                monday: { available: true, preferred_shift: 'day' },
                tuesday: { available: true, preferred_shift: 'day' },
                wednesday: { available: true, preferred_shift: 'day' },
                thursday: { available: true, preferred_shift: 'day' },
                friday: { available: true, preferred_shift: 'day' },
                saturday: { available: false, preferred_shift: null },
                sunday: { available: false, preferred_shift: null },
              },
              createdAt: new Date().toISOString(),
            };
            
            await kv.set(`nurse:${user.user.id}`, profile);
            await kv.set(`nurse:${demoNurse.email}`, profile);
            console.log(`✅ Created demo nurse: ${demoNurse.name}`);
          }
        }
      } catch (e) {
        console.log(`Demo nurse ${demoNurse.email} may already exist or failed to create:`, e);
      }
    }

    console.log('=== DEMO INITIALIZATION COMPLETED ===');
    return c.json({ 
      success: true,
      message: 'Demo data initialized successfully', 
      adminExists, 
      nurseExists,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('=== DEMO INITIALIZATION FAILED ===');
    console.error('Demo initialization error:', error);
    return c.json({ 
      success: false,
      error: 'Failed to initialize demo data', 
      details: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

serve(app.fetch);