const mongoose = require('mongoose');

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  studentId: { type: String, required: true },
  role: { type: String, enum: ['voter', 'admin'], default: 'voter' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

let User;
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
    
    if (!User) {
      User = mongoose.model('User', userSchema);
    }
    
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    // Check environment variables
    const envCheck = {
      MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };

    // Try to connect to MongoDB
    await connectDB();
    
    // Check if admin user exists
    const adminUser = await User.findOne({ email: 'admin@votingsystem.com' });
    
    // Get user count
    const userCount = await User.countDocuments();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Database connection test',
        environment: envCheck,
        database: {
          status: 'Connected successfully',
          userCount: userCount,
          adminExists: adminUser ? 'Yes' : 'No',
          adminDetails: adminUser ? {
            email: adminUser.email,
            role: adminUser.role,
            isActive: adminUser.isActive,
            isVerified: adminUser.isVerified
          } : null
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Test failed',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};