const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - temporarily disabled for debugging
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Stricter rate limiting for auth endpoints - temporarily disabled
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5 // limit auth attempts
// });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voting_system')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
  // Log the paths for debugging
  console.log('Current directory:', __dirname);
  console.log('Looking for client build at:', path.join(__dirname, '../client/build'));
  
  // Serve static files from client build
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing - send all non-API requests to React app
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/build/index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
} else {
  // Development mode - just show a message for non-API routes
  app.get('*', (req, res) => {
    res.json({ message: 'API server running. Frontend should be served separately in development.' });
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  console.error('Error details:', {
    message: err.message,
    name: err.name,
    stack: err.stack
  });
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});