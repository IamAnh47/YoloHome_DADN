const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const errorMiddleware = require('./middleware/errorMiddleware');
const mqttService = require('./services/mqttService');
const adafruitService = require('./services/adafruitService');
const feedAlertService = require('./services/feedAlertService');
const schedulerService = require('./services/schedulerService');
const DeviceModel = require('./models/deviceModel');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Import routes
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const alertConfigRoutes = require('./routes/alertConfigRoutes');
const statusRoutes = require('./routes/statusRoutes');
const feedRoutes = require('./routes/feedRoutes');
const systemRoutes = require('./routes/systemRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/alert-config', alertConfigRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/feeds', feedRoutes);
app.use('/api/system', systemRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorMiddleware);

// Set port
const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to MQTT broker
mqttService.connect();

// Helper function to update device status in the database
const updateDeviceStatusFromFeed = async (deviceType, status) => {
  try {
    const device = await DeviceModel.findDeviceByType(deviceType);
    if (device) {
      await DeviceModel.updateDevice(device.device_id, { status });
      console.log(`Updated ${deviceType} status to ${status} from feed`);
    }
  } catch (error) {
    console.error(`Error updating ${deviceType} status: ${error.message}`);
  }
};

// Set up periodic sync from Adafruit feeds to database (every 5 seconds instead of 10)
setInterval(async () => {
  await adafruitService.syncDeviceStatesFromFeed(updateDeviceStatusFromFeed);
}, 5000);

// Set up periodic check for feed thresholds (every 60 seconds)
console.log('Setting up feed alert threshold check every minute');
setInterval(async () => {
  console.log('Running feed alert threshold check...');
  await feedAlertService.checkFeedThresholds();
}, 60000);

// Start the scheduler service (check every 30 seconds)
console.log('Starting device schedule service');
schedulerService.start(30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});