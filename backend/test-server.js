import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());

// Test route
app.post('/api/schedules/generate', (req, res) => {
  console.log('Generate schedule route hit!', req.body);
  res.json({
    success: true,
    message: 'Test route working',
    data: {
      schedule: {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: 'DRAFT',
        qualityMetrics: {
          overallScore: 85.5
        }
      }
    },
    generationStats: {
      qualityScore: 85.5,
      totalTime: 1500,
      iterations: 100
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Test server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});