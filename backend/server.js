const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
// const passport = require('./config/passport');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('💡 Please set these environment variables in your deployment platform');
  process.exit(1);
}

// Import database connection
const connectDB = require('./config/database');
const { initializeSocket } = require('./config/socket');

// Import routes
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const analyticsRoutes = require('./routes/analytics');
const supplierRoutes = require('./routes/suppliers');
const supplierDashboardRoutes = require('./routes/supplier');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const reportsRoutes = require('./routes/reports');
const customerInsightsRoutes = require('./routes/customerInsights');
const storeRoutes = require('./routes/stores');
const adminRoutes = require('./routes/admin');
const managerOrderRoutes = require('./routes/managerOrders');
const customerRoutes = require('./routes/customer');
const aiOptimizationRoutes = require('./routes/aiOptimization');
const productAnalyticsRoutes = require('./routes/productAnalytics');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Initialize Socket.io
const io = initializeSocket(server);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Force CORS headers for all requests (BEFORE any other middleware)
app.use((req, res, next) => {
  console.log('🌐 CORS Middleware - Origin:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', 'https://walmart7768.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// CORS configuration (backup)
app.use(cors({
  origin: 'https://walmart7768.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Log CORS configuration for debugging
console.log('🌐 CORS Configuration:', {
  nodeEnv: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
  allowedOrigin: 'https://walmart7768.vercel.app'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session middleware for passport
app.use(session({
  secret: process.env.JWT_SECRET || 'walmart-digital-revolution-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
// app.use(passport.initialize());
// app.use(passport.session());

// Apply global rate limiting
app.use(globalLimiter);

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Walmart Digital Revolution API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB',
    port: PORT
  });
});

// Simple ping endpoint for basic connectivity test
app.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/supplier', supplierDashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/customer', customerRoutes);
app.use('/api/ai-optimization', aiOptimizationRoutes);
app.use('/api/product-analytics', productAnalyticsRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Temporary test route for inventory debugging
const { testInventoryDirect, getAllProducts } = require('./controllers/inventoryController');
app.get('/api/test-inventory', testInventoryDirect);

// Test route for getAllProducts without auth
app.get('/api/test-all-products', async (req, res) => {
  try {
    // Mock user object for testing
    req.user = {
      id: '687164e2a0f1eabadaf16341',
      storeId: '6871614bc7c1418205200192',
      role: 'manager'
    };
    
    console.log('🧪 Testing getAllProducts without auth');
    await getAllProducts(req, res);
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// Test route for staff API without auth
app.get('/api/test-staff', async (req, res) => {
  try {
    const { getAllStaff } = require('./controllers/staffController');
    const mongoose = require('mongoose');
    
    // Mock user object for Manas Adhikari with ObjectId
    req.user = {
      id: new mongoose.Types.ObjectId('6871837c17bba8a7aba8d081'), // Manas's actual ID
      storeId: new mongoose.Types.ObjectId('6871614bc7c141820520018f'), // Walmart Supercenter - Uptown
      role: 'manager'
    };
    
    console.log('🧪 Testing getAllStaff without auth');
    console.log('🧪 Mock user:', req.user);
    
    await getAllStaff(req, res);
  } catch (error) {
    console.error('❌ Test staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});
app.use('/api/reports', reportsRoutes);
app.use('/api/customer-insights', customerInsightsRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager-orders', managerOrderRoutes);

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    if (dbState === 1) {
      res.json({
        success: true,
        message: 'MongoDB connection successful',
        data: {
          status: states[dbState],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MongoDB connection failed',
        data: {
          status: states[dbState]
        }
      });
    }
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large'
    });
  }

  // Handle MongoDB errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry error'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const mongoose = require('mongoose');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const mongoose = require('mongoose');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Start server with error handling
server.listen(PORT, () => {
  console.log(`🚀 Walmart Digital Revolution API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🍃 Database: MongoDB`);
  console.log(`⚡ Socket.io: Real-time features enabled`);
}).on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.log('💡 Port is already in use. Try a different port.');
  }
  process.exit(1);
});

module.exports = { app, server, io };