const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StaffProfile = require('../models/StaffProfile');
const Task = require('../models/Task');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');

// Get dashboard overview data
const getDashboardOverview = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();

    // Get sales analytics
    const salesData = await Sale.getSalesAnalytics(storeId, startDate, endDate);
    const salesAnalytics = salesData[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalItemsSold: 0,
      avgTransactionValue: 0,
      avgItemsPerTransaction: 0
    };

    // Get inventory summary
    const inventoryData = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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

    // Get staff summary
    const staffData = await StaffProfile.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
      {
        $group: {
          _id: null,
          totalStaff: { $sum: 1 },
          avgPerformanceRating: { $avg: '$performance.rating' },
          totalHoursWorked: { $sum: '$attendance.totalHoursWorked' }
        }
      }
    ]);

    const staff = staffData[0] || {
      totalStaff: 0,
      avgPerformanceRating: 0,
      totalHoursWorked: 0
    };

    // Get task summary
    const taskData = await Task.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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
                    { $nin: ['$status', ['completed', 'cancelled']] }
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

    const previousSalesData = await Sale.getSalesAnalytics(storeId, previousStartDate, previousEndDate);
    const previousSales = previousSalesData[0]?.totalRevenue || 0;
    
    const revenueGrowth = previousSales > 0 
      ? ((salesAnalytics.totalRevenue - previousSales) / previousSales * 100).toFixed(2)
      : 0;

    res.json({
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
    });

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
          storeId: mongoose.Types.ObjectId(storeId),
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
          storeId: mongoose.Types.ObjectId(storeId),
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

    // Get inventory overview
    const inventoryOverview = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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

    // Get stock movement trends (simulated for now)
    const stockMovements = await Inventory.aggregate([
      { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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
            storeId: mongoose.Types.ObjectId(storeId),
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
        { $match: { storeId: mongoose.Types.ObjectId(storeId) } },
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
        { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
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
      storeId: mongoose.Types.ObjectId(storeId),
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

module.exports = {
  getDashboardOverview,
  getSalesAnalytics,
  getInventoryAnalytics,
  getPerformanceMetrics,
  getRealTimeAlerts
}; 