const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Note: Socket.io is removed for Vercel serverless compatibility

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

// Connect to MongoDB
connectDB();

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

// CORS configuration for Vercel
app.use(cors({
  origin: [
    'https://walmart-digital-revolution.vercel.app',
    'https://walmart-frontend.vercel.app',
    'https://walmart.vercel.app',
    'https://your-vercel-domain.vercel.app', // Replace with your actual Vercel domain
    'http://localhost:3000', // For local development
    'http://127.0.0.1:3000',
    'http://192.168.29.4:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

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

// Apply global rate limiting
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Walmart Digital Revolution API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB',
    platform: 'Vercel Serverless'
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/staff', staffRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/supplier', supplierDashboardRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/sales', salesRoutes);
app.use('/attendance', require('./routes/attendance'));
app.use('/customer', customerRoutes);
app.use('/ai-optimization', aiOptimizationRoutes);
app.use('/product-analytics', productAnalyticsRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/reports', reportsRoutes);
app.use('/customer-insights', customerInsightsRoutes);
app.use('/stores', storeRoutes);
app.use('/admin', adminRoutes);
app.use('/manager-orders', managerOrderRoutes);

// Test database connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      success: true,
      message: 'Database connection test',
      connectionState: states[connectionState],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Export for Vercel
module.exports = app; 