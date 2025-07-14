const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StaffProfile = require('../models/StaffProfile');
const Task = require('../models/Task');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const ManagerOrder = require('../models/ManagerOrder');

// Get dashboard overview data
const getDashboardOverview = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30' } = req.query; // days
    
    console.log('📊 Analytics Dashboard - User:', req.user.role, 'Store:', storeId);
    console.log('📊 Period:', period, 'days');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();
    
    console.log('📊 Date range:', startDate.toISOString(), 'to', endDate.toISOString());

    // Get sales analytics - for managers, use manager orders instead of sales
    let salesAnalytics;
    
    if (req.user.role === 'manager') {
      // For managers, use manager orders data
      const managerId = req.user._id;
      
      console.log('📊 Manager Analytics - Manager ID:', managerId);
      
      // First, let's check all orders for this manager to understand the data
      const allManagerOrders = await ManagerOrder.find({
        managerId: new mongoose.Types.ObjectId(managerId),
        storeId: new mongoose.Types.ObjectId(storeId)
      }).select('orderNumber orderDate status totalAmount items');
      
      console.log('📊 All Manager Orders:', allManagerOrders.map(order => ({
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: order.items.length
      })));
      
      // Try without date filter first to see all orders
      const managerOrdersData = await ManagerOrder.aggregate([
        {
          $match: {
            managerId: new mongoose.Types.ObjectId(managerId),
            storeId: new mongoose.Types.ObjectId(storeId),
            status: { $in: ['pending', 'approved', 'delivered'] } // Include pending orders too
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalItemsSold: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]);

      console.log('📊 Manager Orders Data:', managerOrdersData);

      salesAnalytics = managerOrdersData[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalItemsSold: 0
      };
      
      console.log('📊 Final Sales Analytics:', salesAnalytics);
      
      // Calculate additional metrics
      salesAnalytics.avgTransactionValue = salesAnalytics.totalSales > 0 
        ? salesAnalytics.totalRevenue / salesAnalytics.totalSales 
        : 0;
      salesAnalytics.avgItemsPerTransaction = salesAnalytics.totalSales > 0 
        ? salesAnalytics.totalItemsSold / salesAnalytics.totalSales 
        : 0;
      salesAnalytics.totalProfit = 0; // Not calculated for manager orders
    } else {
      // For other roles, use regular sales data
      const salesData = await Sale.getSalesAnalytics(storeId, startDate, endDate);
      salesAnalytics = salesData[0] || {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalItemsSold: 0,
        avgTransactionValue: 0,
        avgItemsPerTransaction: 0
      };
    }

    // Get inventory summary - for managers, only show products from their orders
    let inventoryMatch = { storeId: new mongoose.Types.ObjectId(storeId) };
    
    // If user is a manager, filter to only show products from their orders
    if (req.user.role === 'manager') {
      const managerId = req.user._id;
      
      // Get products from manager's orders
      const allOrders = await ManagerOrder.find({
        managerId: new mongoose.Types.ObjectId(managerId),
        storeId: new mongoose.Types.ObjectId(storeId)
      }).select('items');

      // Extract unique product IDs from all orders
      const productIds = new Set();
      allOrders.forEach(order => {
        order.items.forEach(item => {
          productIds.add(item.productId.toString());
        });
      });

      // Convert to array of ObjectIds
      const productObjectIds = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));
      
      if (productObjectIds.length > 0) {
        inventoryMatch.productId = { $in: productObjectIds };
      } else {
        // No products from orders, return empty inventory
        const inventory = {
          totalProducts: 0,
          totalStock: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        };
      }
    }

    const inventoryData = await Inventory.aggregate([
      { $match: inventoryMatch },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$quantity' },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const inventory = inventoryData[0] || {
      totalProducts: 0,
      totalStock: 0,
      lowStockItems: 0,
      outOfStockItems: 0
    };
    
    console.log('📊 Final Inventory Data:', inventory);

    // Get staff summary
    const staffData = await StaffProfile.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId), isActive: true } },
      {
        $group: {
          _id: null,
          totalStaff: { $sum: 1 },
          avgPerformanceRating: { $avg: '$performance.rating' },
          totalHoursWorked: { $sum: '$attendance.totalHoursWorked' },
          totalDaysWorked: { $sum: '$attendance.totalDaysWorked' },
          totalAbsences: { $sum: '$attendance.absences' }
        }
      }
    ]);

    console.log('📊 Staff Data:', staffData);

    const staff = staffData[0] || {
      totalStaff: 0,
      avgPerformanceRating: 0,
      totalHoursWorked: 0,
      totalDaysWorked: 0,
      totalAbsences: 0
    };

    // Calculate average attendance rate
    const totalExpectedDays = staff.totalDaysWorked + staff.totalAbsences;
    const avgAttendanceRate = totalExpectedDays > 0 
      ? ((staff.totalDaysWorked / totalExpectedDays) * 100).toFixed(2)
      : 0;

    // Add attendance rate to staff object
    staff.avgAttendanceRate = parseFloat(avgAttendanceRate);
    
    console.log('📊 Final Staff Data:', staff);

    // Get task summary
    const taskData = await Task.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $not: { $in: ['$status', ['completed', 'cancelled']] } }
                  ]
                },
                1,
                0
              ]
            }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const tasks = taskData[0] || {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      pendingTasks: 0
    };

    // Get supplier summary
    const supplierData = await Supplier.aggregate([
      { $match: { isActive: true, isApproved: true } },
      {
        $group: {
          _id: null,
          totalSuppliers: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' }
        }
      }
    ]);

    const suppliers = supplierData[0] || {
      totalSuppliers: 0,
      avgRating: 0
    };

    // Get recent activities (last 10)
    const recentSales = await Sale.find({ storeId })
      .sort({ saleDate: -1 })
      .limit(5)
      .populate('staffId', 'userId employeeId')
      .select('transactionId totalAmount saleDate paymentMethod');

    const recentTasks = await Task.find({ storeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedTo', 'userId employeeId')
      .populate('assignedBy', 'firstName lastName')
      .select('title status priority dueDate createdAt');

    // Calculate growth rates (compare with previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
    const previousEndDate = new Date(startDate);

    let previousSales = 0;
    
    if (req.user.role === 'manager') {
      // For managers, use manager orders for growth calculation
      const managerId = req.user._id;
      
      const previousManagerOrdersData = await ManagerOrder.aggregate([
        {
          $match: {
            managerId: new mongoose.Types.ObjectId(managerId),
            storeId: new mongoose.Types.ObjectId(storeId),
            orderDate: { $gte: previousStartDate, $lte: previousEndDate },
            status: { $in: ['approved', 'delivered'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      previousSales = previousManagerOrdersData[0]?.totalRevenue || 0;
    } else {
      // For other roles, use regular sales data
      const previousSalesData = await Sale.getSalesAnalytics(storeId, previousStartDate, previousEndDate);
      previousSales = previousSalesData[0]?.totalRevenue || 0;
    }
    
    const revenueGrowth = previousSales > 0 
      ? ((salesAnalytics.totalRevenue - previousSales) / previousSales * 100).toFixed(2)
      : 0;

    const responseData = {
      success: true,
      data: {
        overview: {
          sales: {
            ...salesAnalytics,
            revenueGrowth: parseFloat(revenueGrowth)
          },
          inventory,
          staff,
          tasks,
          suppliers
        },
        recentActivity: {
          sales: recentSales,
          tasks: recentTasks
        },
        lastUpdated: new Date().toISOString()
      }
    };
    
    console.log('📊 Final Response Data:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);

  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard overview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get daily sales trend
    const dailySales = await Sale.getDailySalesTrend(storeId, start, end);

    // Get top selling products
    const topProducts = await Sale.findTopSellingProducts(storeId, start, end, 10);

    // Get category performance
    const categoryPerformance = await Sale.getCategoryPerformance(storeId, start, end);

    // Get sales by payment method
    const paymentMethodData = await Sale.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Get hourly sales pattern
    const hourlySales = await Sale.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { hour: { $hour: '$saleDate' } },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgTransactionValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        dailySales,
        topProducts,
        categoryPerformance,
        paymentMethodData,
        hourlySales,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving sales analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get inventory analytics
const getInventoryAnalytics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const managerId = req.user.id;
    const userRole = req.user.role;

    // If user is a manager, show only their products from orders
    let productFilter = {};
    if (userRole === 'manager') {
      // Get products from manager's orders
      const allOrders = await ManagerOrder.find({
        managerId: new mongoose.Types.ObjectId(managerId),
        storeId: new mongoose.Types.ObjectId(storeId)
      }).select('items');

      // Extract unique product IDs from all orders
      const productIds = new Set();
      allOrders.forEach(order => {
        order.items.forEach(item => {
          productIds.add(item.productId.toString());
        });
      });

      // Convert to array of ObjectIds
      const productObjectIds = Array.from(productIds).map(id => new mongoose.Types.ObjectId(id));
      
      if (productObjectIds.length > 0) {
        productFilter = { productId: { $in: productObjectIds } };
      } else {
        // No products from orders, return empty analytics
        return res.json({
          success: true,
          data: {
            overview: {
              totalProducts: 0,
              totalValue: 0,
              totalCost: 0,
              averageStock: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              overstockCount: 0
            },
            categoryBreakdown: [],
            lowStockItems: [],
            stockMovements: []
          }
        });
      }
    }

    // Get inventory overview
    const inventoryOverview = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          ...productFilter
        } 
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          totalCost: { $sum: { $multiply: ['$quantity', '$product.costPrice'] } },
          averageStock: { $avg: '$quantity' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          },
          overstockCount: {
            $sum: {
              $cond: [{ $gte: ['$quantity', '$maxStock'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get category breakdown
    const categoryBreakdown = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          ...productFilter
        } 
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          productCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          avgQuantity: { $avg: '$quantity' },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Get low stock items
    const lowStockItems = await Inventory.findLowStock(storeId);

    // Get stock movement trends
    const stockMovements = await Inventory.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          ...productFilter
        } 
      },
      { $unwind: '$stockMovements' },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$stockMovements.timestamp'
              }
            },
            type: '$stockMovements.type'
          },
          totalQuantity: { $sum: '$stockMovements.quantity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        overview: inventoryOverview[0] || {
          totalProducts: 0,
          totalValue: 0,
          totalCost: 0,
          averageStock: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          overstockCount: 0
        },
        categoryBreakdown,
        lowStockItems: lowStockItems.slice(0, 10),
        stockMovements
      }
    });

  } catch (error) {
    console.error('Get inventory analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving inventory analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get performance metrics
const getPerformanceMetrics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30' } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();

    // Get KPIs
    const kpis = await Promise.all([
      // Revenue per day
      Sale.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            saleDate: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } } }
          }
        },
        {
          $project: {
            revenuePerDay: { $divide: ['$totalRevenue', { $size: '$totalDays' }] }
          }
        }
      ]),

      // Inventory turnover
      Inventory.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: null,
            avgInventoryValue: { $avg: { $multiply: ['$quantity', '$product.costPrice'] } }
          }
        }
      ]),

      // Staff productivity
      StaffProfile.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(storeId), isActive: true } },
        {
          $group: {
            _id: null,
            avgProductivity: { $avg: '$performance.rating' },
            avgHoursPerStaff: { $avg: '$attendance.totalHoursWorked' },
            totalStaff: { $sum: 1 }
          }
        }
      ])
    ]);

    const metrics = {
      revenuePerDay: kpis[0][0]?.revenuePerDay || 0,
      inventoryTurnover: kpis[1][0]?.avgInventoryValue || 0,
      staffProductivity: kpis[2][0]?.avgProductivity || 0,
      totalStaff: kpis[2][0]?.totalStaff || 0
    };

    // Get trend data for charts
    const trendData = await Sale.getDailySalesTrend(storeId, startDate, endDate);

    res.json({
      success: true,
      data: {
        metrics,
        trends: trendData,
        period: {
          days: parseInt(period),
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get real-time alerts
const getRealTimeAlerts = async (req, res) => {
  try {
    const storeId = req.user.storeId;

    // Get various alerts
    const alerts = [];

    // Low stock alerts
    const lowStockItems = await Inventory.findLowStock(storeId);
    if (lowStockItems.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} items are running low on stock`,
        count: lowStockItems.length,
        items: lowStockItems.slice(0, 5).map(item => ({
          id: item._id,
          name: item.productId.name,
          quantity: item.quantity,
          reorderLevel: item.reorderLevel
        }))
      });
    }

    // Overdue tasks
    const overdueTasks = await Task.findOverdueTasks(storeId);
    if (overdueTasks.length > 0) {
      alerts.push({
        type: 'error',
        category: 'tasks',
        title: 'Overdue Tasks',
        message: `${overdueTasks.length} tasks are overdue`,
        count: overdueTasks.length,
        items: overdueTasks.slice(0, 5).map(task => ({
          id: task._id,
          title: task.title,
          dueDate: task.dueDate,
          assignedTo: task.assignedTo.employeeId
        }))
      });
    }

    // Staff performance issues
    const lowPerformingStaff = await StaffProfile.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      isActive: true,
      'performance.rating': { $lt: 2.5 }
    }).populate('userId', 'firstName lastName');

    if (lowPerformingStaff.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'staff',
        title: 'Performance Attention Needed',
        message: `${lowPerformingStaff.length} staff members need performance attention`,
        count: lowPerformingStaff.length,
        items: lowPerformingStaff.slice(0, 3).map(staff => ({
          id: staff._id,
          name: `${staff.userId.firstName} ${staff.userId.lastName}`,
          rating: staff.performance.rating,
          department: staff.department
        }))
      });
    }

    // Overdue purchase orders
    const overduePOs = await PurchaseOrder.findOverdueOrders(storeId);
    if (overduePOs.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'suppliers',
        title: 'Overdue Purchase Orders',
        message: `${overduePOs.length} purchase orders are overdue`,
        count: overduePOs.length,
        items: overduePOs.slice(0, 3).map(po => ({
          id: po._id,
          orderNumber: po.orderNumber,
          supplier: po.supplierId.companyName,
          expectedDate: po.expectedDeliveryDate
        }))
      });
    }

    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get real-time alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving real-time alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get supplier performance metrics
const getSupplierPerformanceMetrics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30', supplierId, startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start = new Date();
      start.setDate(start.getDate() - parseInt(period));
      end = new Date();
    }

    // Base query for orders
    const baseQuery = {
      storeId: new mongoose.Types.ObjectId(storeId),
      orderDate: { $gte: start, $lte: end },
      status: { $in: ['approved', 'delivered'] }
    };

    if (supplierId) {
      baseQuery.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    // Get overall supplier performance metrics
    const supplierMetrics = await ManagerOrder.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: 'userId',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      {
        $group: {
          _id: '$supplierId',
          supplierName: { $first: '$supplierName' },
          companyName: { $first: '$supplier.companyName' },
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalOrderValue: { $sum: '$totalAmount' },
          totalOrderedItems: { $sum: '$totalOrderedItems' },
          totalDeliveredItems: { $sum: '$totalDeliveredItems' },
          // On-time delivery calculation
          onTimeDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $lte: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Early deliveries
          earlyDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $lt: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Late deliveries
          lateDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $gt: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Average delivery time difference (in days)
          avgDeliveryTimeDiff: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                {
                  $divide: [
                    { $subtract: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] },
                    86400000 // Convert milliseconds to days
                  ]
                },
                null
              ]
            }
          },
          // Perfect deliveries (100% quantity delivered on time)
          perfectDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $eq: ['$deliveryStatus', 'complete'] },
                    { $lte: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Partial deliveries
          partialDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $eq: ['$deliveryStatus', 'partial'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          // Calculate performance percentages
          deliveryCompletionRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$deliveredOrders', '$totalOrders'] }, 100] },
              0
            ]
          },
          onTimeDeliveryRate: {
            $cond: [
              { $gt: ['$deliveredOrders', 0] },
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$deliveredOrders'] }, 100] },
              0
            ]
          },
          quantityAccuracyRate: {
            $cond: [
              { $gt: ['$totalOrderedItems', 0] },
              { $multiply: [{ $divide: ['$totalDeliveredItems', '$totalOrderedItems'] }, 100] },
              0
            ]
          },
          perfectDeliveryRate: {
            $cond: [
              { $gt: ['$deliveredOrders', 0] },
              { $multiply: [{ $divide: ['$perfectDeliveries', '$deliveredOrders'] }, 100] },
              0
            ]
          },
          partialDeliveryRate: {
            $cond: [
              { $gt: ['$deliveredOrders', 0] },
              { $multiply: [{ $divide: ['$partialDeliveries', '$deliveredOrders'] }, 100] },
              0
            ]
          },
          // Overall performance score (weighted average)
          performanceScore: {
            $avg: [
              // On-time delivery (40% weight)
              { $multiply: [
                { $cond: [
                  { $gt: ['$deliveredOrders', 0] },
                  { $divide: ['$onTimeDeliveries', '$deliveredOrders'] },
                  0
                ]}, 40
              ]},
              // Quantity accuracy (35% weight)
              { $multiply: [
                { $cond: [
                  { $gt: ['$totalOrderedItems', 0] },
                  { $divide: ['$totalDeliveredItems', '$totalOrderedItems'] },
                  0
                ]}, 35
              ]},
              // Delivery completion (25% weight)
              { $multiply: [
                { $cond: [
                  { $gt: ['$totalOrders', 0] },
                  { $divide: ['$deliveredOrders', '$totalOrders'] },
                  0
                ]}, 25
              ]}
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } }
    ]);

    // Get delivery timeline trends
    const deliveryTrends = await ManagerOrder.aggregate([
      { $match: { ...baseQuery, status: 'delivered' } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$deliveryAcceptedDate' } },
            supplierId: '$supplierId'
          },
          supplierName: { $first: '$supplierName' },
          deliveries: { $sum: 1 },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                { $lte: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] },
                1,
                0
              ]
            }
          },
          totalItems: { $sum: '$totalOrderedItems' },
          deliveredItems: { $sum: '$totalDeliveredItems' },
          avgDeliveryDelay: {
            $avg: {
              $divide: [
                { $subtract: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] },
                86400000
              ]
            }
          }
        }
      },
      {
        $addFields: {
          onTimeRate: {
            $cond: [
              { $gt: ['$deliveries', 0] },
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$deliveries'] }, 100] },
              0
            ]
          },
          accuracyRate: {
            $cond: [
              { $gt: ['$totalItems', 0] },
              { $multiply: [{ $divide: ['$deliveredItems', '$totalItems'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get top and bottom performers
    const topPerformers = supplierMetrics.slice(0, 5);
    const bottomPerformers = supplierMetrics.slice(-5).reverse();

    // Get category-wise performance
    const categoryPerformance = await ManagerOrder.aggregate([
      { $match: baseQuery },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'delivered'] },
                    { $lte: ['$deliveryAcceptedDate', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalValue: { $sum: '$items.totalPrice' },
          totalQuantityOrdered: { $sum: '$items.quantity' },
          totalQuantityDelivered: { $sum: '$items.deliveredQuantity' }
        }
      },
      {
        $addFields: {
          deliveryRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$deliveredOrders', '$totalOrders'] }, 100] },
              0
            ]
          },
          onTimeRate: {
            $cond: [
              { $gt: ['$deliveredOrders', 0] },
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$deliveredOrders'] }, 100] },
              0
            ]
          },
          accuracyRate: {
            $cond: [
              { $gt: ['$totalQuantityOrdered', 0] },
              { $multiply: [{ $divide: ['$totalQuantityDelivered', '$totalQuantityOrdered'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Calculate overall metrics
    const overallMetrics = {
      totalSuppliers: supplierMetrics.length,
      avgOnTimeDeliveryRate: supplierMetrics.length > 0 
        ? supplierMetrics.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / supplierMetrics.length 
        : 0,
      avgQuantityAccuracyRate: supplierMetrics.length > 0 
        ? supplierMetrics.reduce((sum, s) => sum + s.quantityAccuracyRate, 0) / supplierMetrics.length 
        : 0,
      avgPerformanceScore: supplierMetrics.length > 0 
        ? supplierMetrics.reduce((sum, s) => sum + s.performanceScore, 0) / supplierMetrics.length 
        : 0,
      totalOrderValue: supplierMetrics.reduce((sum, s) => sum + s.totalOrderValue, 0),
      totalOrders: supplierMetrics.reduce((sum, s) => sum + s.totalOrders, 0),
      totalDeliveredOrders: supplierMetrics.reduce((sum, s) => sum + s.deliveredOrders, 0)
    };

    // Check if there's no data
    if (supplierMetrics.length === 0) {
      return res.json({
        success: true,
        data: {
          overview: overallMetrics,
          suppliers: [],
          topPerformers: [],
          bottomPerformers: [],
          deliveryTrends: [],
          categoryPerformance: [],
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
            days: parseInt(period)
          },
          message: 'No supplier performance data available for the selected period. Performance metrics will be available after orders are delivered and accepted.'
        }
      });
    }

    res.json({
      success: true,
      data: {
        overview: overallMetrics,
        suppliers: supplierMetrics,
        topPerformers,
        bottomPerformers,
        deliveryTrends,
        categoryPerformance,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: parseInt(period)
        }
      }
    });

  } catch (error) {
    console.error('Get supplier performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving supplier performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getDashboardOverview,
  getSalesAnalytics,
  getInventoryAnalytics,
  getPerformanceMetrics,
  getRealTimeAlerts,
  getSupplierPerformanceMetrics
}; 