# 🛒 Walmart Digital Revolution - Phase 1

A comprehensive digital ecosystem transforming retail operations with role-based authentication, real-time inventory management, and intelligent analytics.

## 📋 Project Overview

This is **Phase 1** of the Walmart Digital Revolution system, focusing on building a robust authentication system with role-based access control for 4 user types:

- **🛍️ Customers**: Future QR code shopping and contactless payments
- **📊 Managers**: Real-time analytics and inventory management dashboards  
- **👥 Staff**: Delivery processing and customer assistance tools
- **🚚 Suppliers**: Performance tracking and business analytics

## 🚀 Features (Phase 1)

### ✅ Completed Features
- **Multi-role Authentication System** with JWT tokens
- **Responsive Home Page** with Walmart branding
- **Role-based User Registration** and Login
- **Protected Routes** with role-specific access control
- **Modern UI/UX** with Tailwind CSS and smooth animations
- **Form Validation** with real-time error handling
- **Security Middleware** with rate limiting and input validation
- **PostgreSQL Database** with optimized schema and indexes

### 🔮 Coming Soon (Future Phases)
- QR Code scanning and barcode shopping
- Real-time inventory management
- Manager analytics dashboard
- Staff geofencing and performance tracking
- Supplier performance monitoring
- AI-powered recommendations
- WhatsApp/SMS notifications

## 🛠️ Tech Stack

### Frontend
- **React 18** with functional components and hooks
- **React Router** for client-side routing
- **Tailwind CSS** for styling and responsive design
- **Lucide React** for modern icons
- **Axios** for API communication
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication and authorization
- **Bcrypt** for secure password hashing
- **Joi** for input validation
- **Helmet** and **CORS** for security

### Development Tools
- **Concurrently** for running frontend and backend together
- **Nodemon** for backend hot reloading
- **ESLint** and **Prettier** for code quality

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Internet connection (for MongoDB Atlas)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd walmart-digital-revolution
```

### 2. Install Dependencies
```bash
# Install root dependencies and all sub-project dependencies
npm run install-deps

# Or install manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Setup

#### MongoDB Atlas (Cloud Database)
The application is configured to use MongoDB Atlas cloud database. No local installation required!

- **Connection String**: Already configured in the code
- **Database Name**: `walmart_digital`
- **Cloud Provider**: MongoDB Atlas

#### Seed Database (Optional)
```bash
# Navigate to backend directory
cd backend

# Run the seed script to add sample stores
npm run seed
```

### 4. Environment Configuration

#### Backend Environment Variables
Create `backend/.env` file:
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Database Configuration
MONGODB_URI=mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital

# Security
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment Variables (Optional)
Create `frontend/.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 5. Start the Application

#### Development Mode (Recommended)
```bash
# From root directory - runs both frontend and backend
npm run dev
```

#### Or start separately:
```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend  
npm run client
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🎯 Usage Guide

### 1. Home Page
- Visit http://localhost:3000
- View the welcome section with Walmart branding
- Choose your role from the 4 user type cards

### 2. Registration
- Click on any user type card
- Fill out the registration form with:
  - Email address
  - Password (minimum 6 characters)
  - First and last name
  - Phone number (optional)
  - Role selection
- Submit to create account and auto-login

### 3. Login
- Use existing credentials to sign in
- Automatic redirection to role-specific dashboard

### 4. Role-based Dashboards
- **Customer Dashboard**: `/dashboard/customer`
- **Manager Dashboard**: `/dashboard/manager`
- **Staff Dashboard**: `/dashboard/staff`
- **Supplier Dashboard**: `/dashboard/supplier`

## 🔐 API Endpoints

### Authentication Routes
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - User login
POST /api/auth/logout       - User logout
GET  /api/auth/verify       - Verify JWT token
GET  /api/auth/profile      - Get user profile
PUT  /api/auth/profile      - Update user profile
```

### System Routes
```
GET  /health                - Health check
GET  /api/test-db          - Database connection test
```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  role: String (enum: customer, manager, staff, supplier),
  firstName: String,
  lastName: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Stores Collection
```javascript
{
  _id: ObjectId,
  name: String (indexed),
  address: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with configurable salt rounds
- **Rate Limiting** to prevent brute force attacks
- **Input Validation** using Joi schemas
- **CORS Protection** with configurable origins
- **Helmet Security Headers** for additional protection
- **NoSQL Injection Prevention** using Mongoose validation

## 🧪 Testing

### Backend API Testing
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test database connection
curl http://localhost:5000/api/test-db

# Test user registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  }'
```

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
MONGODB_URI=mongodb+srv://anuragmandal2003:dZA8neRxhgm7daVc@cluster0.od4oyep.mongodb.net/walmart_digital
```

### Build for Production
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📈 Future Roadmap

### Phase 2: Real-Time Inventory Management
- Cloud-based inventory tracking
- Real-time stock updates
- Product catalog management

### Phase 3: Manager Dashboard
- Sales analytics and reporting
- Inventory alerts and management
- Staff performance monitoring

### Phase 4: Staff Management System
- Geofencing attendance tracking
- Delivery processing interface
- Customer assistance tools

### Phase 5: Supplier Portal
- Performance tracking dashboard
- Order management system
- Competitive analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**🎉 Phase 1 Complete!** 
Ready to transform retail with digital innovation. The authentication foundation is solid - now let's build the future of shopping! 🚀 