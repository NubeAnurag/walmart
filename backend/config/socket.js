const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.storeId = user.storeId?.toString();
      socket.userInfo = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userInfo.email} (${socket.userRole}) - Socket ID: ${socket.id}`);

    // Join appropriate rooms based on role and store
    if (socket.storeId) {
      socket.join(`store:${socket.storeId}`);
      console.log(`User joined store room: store:${socket.storeId}`);
    }

    // Role-based room joining
    socket.join(`role:${socket.userRole}`);
    
    if (socket.userRole === 'manager') {
      socket.join(`managers:${socket.storeId}`);
    } else if (socket.userRole === 'staff') {
      socket.join(`staff:${socket.storeId}`);
    }

    // Send initial connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time updates',
      userId: socket.userId,
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });

    // Handle joining specific notification channels
    socket.on('join:notifications', (data) => {
      const { channels = [] } = data;
      
      channels.forEach(channel => {
        if (['inventory', 'staff', 'orders', 'alerts'].includes(channel)) {
          socket.join(`${channel}:${socket.storeId}`);
          console.log(`User joined channel: ${channel}:${socket.storeId}`);
        }
      });

      socket.emit('notifications:joined', {
        channels,
        timestamp: new Date().toISOString()
      });
    });

    // Handle inventory updates subscription
    socket.on('subscribe:inventory', (data) => {
      socket.join(`inventory:${socket.storeId}`);
      socket.emit('inventory:subscribed', {
        message: 'Subscribed to inventory updates',
        timestamp: new Date().toISOString()
      });
    });

    // Handle staff updates subscription
    socket.on('subscribe:staff', (data) => {
      if (socket.userRole === 'manager') {
        socket.join(`staff:updates:${socket.storeId}`);
        socket.emit('staff:subscribed', {
          message: 'Subscribed to staff updates',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle task updates subscription
    socket.on('subscribe:tasks', (data) => {
      socket.join(`tasks:${socket.storeId}`);
      socket.emit('tasks:subscribed', {
        message: 'Subscribed to task updates',
        timestamp: new Date().toISOString()
      });
    });

    // Handle analytics updates subscription
    socket.on('subscribe:analytics', (data) => {
      if (socket.userRole === 'manager') {
        socket.join(`analytics:${socket.storeId}`);
        socket.emit('analytics:subscribed', {
          message: 'Subscribed to analytics updates',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle real-time chat/messaging
    socket.on('send:message', (data) => {
      const { recipient, message, type = 'direct' } = data;
      
      if (type === 'broadcast' && socket.userRole === 'manager') {
        // Broadcast to all store staff
        socket.to(`store:${socket.storeId}`).emit('message:received', {
          from: socket.userInfo,
          message,
          type: 'broadcast',
          timestamp: new Date().toISOString()
        });
      } else if (type === 'direct' && recipient) {
        // Direct message to specific user
        socket.to(recipient).emit('message:received', {
          from: socket.userInfo,
          message,
          type: 'direct',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle ping/pong for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userInfo.email} - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userInfo.email}:`, error);
    });
  });

  return io;
};

// Helper functions for emitting events
const emitToStore = (storeId, event, data) => {
  if (io) {
    io.to(`store:${storeId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const emitToManagers = (storeId, event, data) => {
  if (io) {
    io.to(`managers:${storeId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const emitToStaff = (storeId, event, data) => {
  if (io) {
    io.to(`staff:${storeId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const emitToChannel = (channel, storeId, event, data) => {
  if (io) {
    io.to(`${channel}:${storeId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// Real-time notification functions
const notifyInventoryUpdate = (storeId, productData) => {
  emitToChannel('inventory', storeId, 'inventory:updated', {
    type: 'inventory_update',
    product: productData,
    message: `Stock updated for ${productData.name}`
  });
};

const notifyLowStock = (storeId, productData) => {
  emitToManagers(storeId, 'inventory:low_stock', {
    type: 'low_stock_alert',
    product: productData,
    message: `Low stock alert: ${productData.name} (${productData.quantity} remaining)`
  });
};

const notifyTaskAssignment = (storeId, taskData, assigneeId) => {
  emitToUser(assigneeId, 'task:assigned', {
    type: 'task_assignment',
    task: taskData,
    message: `New task assigned: ${taskData.title}`
  });

  emitToChannel('staff', storeId, 'task:created', {
    type: 'task_created',
    task: taskData,
    message: `New task created: ${taskData.title}`
  });
};

const notifyStaffUpdate = (storeId, staffData, type) => {
  emitToManagers(storeId, 'staff:updated', {
    type: `staff_${type}`,
    staff: staffData,
    message: `Staff ${type}: ${staffData.name}`
  });
};

const notifyOrderUpdate = (storeId, orderData) => {
  emitToStore(storeId, 'order:updated', {
    type: 'order_update',
    order: orderData,
    message: `Order ${orderData.orderNumber} status: ${orderData.status}`
  });
};

const notifySystemAlert = (storeId, alertData) => {
  emitToStore(storeId, 'system:alert', {
    type: 'system_alert',
    alert: alertData,
    message: alertData.message
  });
};

const getConnectedUsers = (storeId) => {
  if (!io) return [];
  
  const storeRoom = io.sockets.adapter.rooms.get(`store:${storeId}`);
  return storeRoom ? storeRoom.size : 0;
};

const getSocketInstance = () => io;

module.exports = {
  initializeSocket,
  getSocketInstance,
  emitToStore,
  emitToManagers,
  emitToStaff,
  emitToRole,
  emitToChannel,
  emitToUser,
  notifyInventoryUpdate,
  notifyLowStock,
  notifyTaskAssignment,
  notifyStaffUpdate,
  notifyOrderUpdate,
  notifySystemAlert,
  getConnectedUsers
}; 