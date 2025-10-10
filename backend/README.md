# MongoDB Backend Setup and Installation Guide

This guide will help you set up the MongoDB backend for the Nurse Scheduling System.

## Prerequisites

Before you begin, make sure you have the following installed:
- Node.js (version 18 or higher)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)

## MongoDB Installation

### Option 1: Local MongoDB Installation

#### Windows:
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Choose "Complete" installation
4. Install as a Windows Service
5. MongoDB Compass (GUI) installation is optional but recommended

#### macOS:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Linux (Ubuntu/Debian):
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Configure network access (add your IP or 0.0.0.0/0 for development)
4. Create a database user
5. Get your connection string

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/nurse-scheduling

# For MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nurse-scheduling
```

### 4. Environment Variables Explanation

- `PORT`: Backend server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name
- `CORS_ORIGIN`: Frontend URL for CORS (default: http://localhost:5173)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `JWT_SECRET`: Secret key for JWT tokens (change in production)
- `BCRYPT_ROUNDS`: Bcrypt hashing rounds
- `LOG_LEVEL`: Logging level (info/debug/error)

### 5. Start the Backend Server

#### Development Mode (with hot reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The backend server will start on http://localhost:3001

## API Endpoints

### Nurses
- `GET /api/nurses` - Get all nurses
- `GET /api/nurses/:id` - Get nurse by ID
- `POST /api/nurses` - Create new nurse
- `PUT /api/nurses/:id` - Update nurse
- `DELETE /api/nurses/:id` - Delete nurse

### Shifts
- `GET /api/shifts` - Get all shifts
- `GET /api/shifts/:id` - Get shift by ID
- `POST /api/shifts` - Create new shift
- `PUT /api/shifts/:id` - Update shift
- `DELETE /api/shifts/:id` - Delete shift

### Schedules
- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `PATCH /api/schedules/:id/publish` - Publish schedule
- `PATCH /api/schedules/:id/activate` - Activate schedule
- `PATCH /api/schedules/:id/complete` - Complete schedule

## Frontend Integration

### 1. Start Frontend Development Server
```bash
# In the root directory
npm run dev
```

The frontend will be available at http://localhost:5173

### 2. API Configuration

The frontend is configured to use the backend API at `http://localhost:3001/api`. If you need to change this, update the `API_BASE_URL` in `src/utils/api.ts`.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running: `sudo systemctl status mongod` (Linux) or check Services (Windows)
   - Verify connection string in `.env` file
   - Check network access if using MongoDB Atlas

2. **Port Already in Use**
   - Change the `PORT` in `.env` file
   - Kill existing processes: `lsof -ti:3001 | xargs kill -9` (macOS/Linux)

3. **CORS Errors**
   - Ensure `CORS_ORIGIN` in `.env` matches your frontend URL
   - Check that both frontend and backend are running

4. **API Not Found**
   - Verify backend is running on the correct port
   - Check API endpoint URLs in browser or Postman

### Logging

The backend includes detailed logging. Check the console output for:
- Server startup messages
- Database connection status
- API request/response logs
- Error messages

### Development Tips

1. Use MongoDB Compass to view and manage your database
2. Test API endpoints with Postman or similar tools
3. Check browser DevTools Network tab for API calls
4. Use `npm run dev` for hot reload during development

## Database Schema

### Nurses Collection
- Auto-generated `nurseId`
- Role-based hierarchy levels
- Qualifications array
- Ward access permissions

### Shifts Collection
- Time-based validation
- Duration calculation
- Ward assignment

### Schedules Collection
- Date range validation
- Status management (draft/published/active/completed)
- Nurse-shift assignments

## Production Deployment

### Environment Variables
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure proper MongoDB production URI
- Set restrictive `CORS_ORIGIN`

### Security Considerations
- Enable MongoDB authentication
- Use HTTPS in production
- Implement proper rate limiting
- Regular database backups

### Performance
- Add database indexes for frequently queried fields
- Enable MongoDB connection pooling
- Implement caching for read-heavy operations

For additional help, check the logs or consult the MongoDB documentation.