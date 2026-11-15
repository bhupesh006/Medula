import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import measurementRoutes from './routes/measurementRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medula_mission_db';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ONLINE',
    module: 'MDAE-01',
    system: 'MEDULA Autonomous Astronaut Health Intelligence',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Module 01 Routes
app.use('/api/measurements', measurementRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Aerospace Server Error',
    errors: err.errors || [],
  });
});

// Connect to MongoDB and start listening if executed directly
export const connectDb = async (uri = MONGODB_URI) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[MEDULA] Connected to Mission MongoDB database at ${uri}`);
    }
  } catch (err) {
    console.warn(`[MEDULA WARNING] MongoDB connection failed: ${err.message}. Operating in degraded offline mode.`);
  }
};

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  connectDb().then(() => {
    app.listen(PORT, () => {
      console.log(`[MEDULA MDAE] Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;

