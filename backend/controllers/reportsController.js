const mongoose = require('mongoose');
const Report = require('../models/Report');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StaffProfile = require('../models/StaffProfile');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');

// Get all reports
const getAllReports = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { reportType, category, status, search, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { storeId };
    
    if (reportType) query.reportType = reportType;
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reports = await Report.find(query)
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: reports.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving reports',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const report = await Report.findOne({ _id: id, storeId })
      .populate('generatedBy', 'firstName lastName')
      .populate('sharing.sharedWith.userId', 'firstName lastName email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Generate sales report
const generateSalesReport = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const generatedBy = req.user.id;
    const {
      title,
      description,
      startDate,
      endDate,
      groupBy = 'day',
      includeCharts = true,
      includeDetails = false,
      format = 'pdf'
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Create report record
    const newReport = new Report({
      title: title || `Sales Report - ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      reportType: 'sales',
      category: 'custom_period',
      generatedBy,
      storeId,
      description,
      parameters: {
        dateRange: { startDate: start, endDate: end },
        groupBy: [groupBy],
        metrics: ['revenue', 'transactions', 'profit']
      },
      format,
      status: 'generating'
    });

    await newReport.save();

    // Generate report data in background (simplified for demo)
    try {
      const startTime = Date.now();

      // Get sales analytics
      const salesData = await Sale.getSalesAnalytics(storeId, start, end);
      const salesAnalytics = salesData[0] || {};

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

      const reportData = {
        summary: {
          period: { start: start.toISOString(), end: end.toISOString() },
          totalSales: salesAnalytics.totalSales || 0,
          totalRevenue: salesAnalytics.totalRevenue || 0,
          totalProfit: salesAnalytics.totalProfit || 0,
          avgTransactionValue: salesAnalytics.avgTransactionValue || 0,
          totalItemsSold: salesAnalytics.totalItemsSold || 0
        },
        details: includeDetails ? {
          dailySales,
          topProducts,
          categoryPerformance,
          paymentMethodData
        } : null,
        charts: includeCharts ? [
          {
            type: 'line',
            title: 'Daily Sales Trend',
            data: dailySales,
            config: { xField: 'date', yField: 'totalRevenue' }
          },
          {
            type: 'pie',
            title: 'Sales by Category',
            data: categoryPerformance,
            config: { angleField: 'totalRevenue', colorField: '_id' }
          },
          {
            type: 'bar',
            title: 'Payment Methods',
            data: paymentMethodData,
            config: { xField: '_id', yField: 'totalAmount' }
          }
        ] : []
      };

      const endTime = Date.now();

      // Mark report as completed
      await newReport.markCompleted(
        {
          filename: `sales-report-${newReport._id}.${format}`,
          path: `/reports/sales-report-${newReport._id}.${format}`,
          size: JSON.stringify(reportData).length,
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/json'
        },
        {
          generationTime: endTime - startTime,
          dataSize: JSON.stringify(reportData).length,
          recordsProcessed: salesAnalytics.totalSales || 0
        }
      );

      // Update report data
      newReport.data = reportData;
      await newReport.save();

      res.status(201).json({
        success: true,
        message: 'Sales report generated successfully',
        data: newReport
      });

    } catch (dataError) {
      await newReport.markFailed(dataError);
      throw dataError;
    }

  } catch (error) {
    console.error('Generate sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Generate inventory report
const generateInventoryReport = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const generatedBy = req.user.id;
    const {
      title,
      description,
      category,
      includeMovements = false,
      format = 'pdf'
    } = req.body;

    // Create report record
    const newReport = new Report({
      title: title || 'Inventory Report',
      reportType: 'inventory',
      category: 'real_time',
      generatedBy,
      storeId,
      description,
      parameters: {
        filters: { categories: category ? [category] : [] },
        metrics: ['stock_levels', 'values', 'alerts']
      },
      format,
      status: 'generating'
    });

    await newReport.save();

    try {
      const startTime = Date.now();

      // Get inventory overview
      const overview = await Inventory.aggregate([
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
        ...(category ? [{ $match: { 'product.category': category } }] : []),
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } },
            totalCost: { $sum: { $multiply: ['$quantity', '$product.costPrice'] } },
            lowStockCount: {
              $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] }
            },
            outOfStockCount: {
              $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
            }
          }
        }
      ]);

      // Get low stock items
      const lowStockItems = await Inventory.findLowStock(storeId);

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
        ...(category ? [{ $match: { 'product.category': category } }] : []),
        {
          $group: {
            _id: '$product.category',
            productCount: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$product.price'] } }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      const reportData = {
        summary: {
          generatedAt: new Date().toISOString(),
          totalProducts: overview[0]?.totalProducts || 0,
          totalValue: overview[0]?.totalValue || 0,
          totalCost: overview[0]?.totalCost || 0,
          lowStockCount: overview[0]?.lowStockCount || 0,
          outOfStockCount: overview[0]?.outOfStockCount || 0
        },
        details: {
          categoryBreakdown,
          lowStockItems: lowStockItems.slice(0, 20) // Limit for report
        },
        charts: [
          {
            type: 'pie',
            title: 'Inventory Value by Category',
            data: categoryBreakdown,
            config: { angleField: 'totalValue', colorField: '_id' }
          },
          {
            type: 'bar',
            title: 'Stock Quantities by Category',
            data: categoryBreakdown,
            config: { xField: '_id', yField: 'totalQuantity' }
          }
        ]
      };

      const endTime = Date.now();

      // Mark report as completed
      await newReport.markCompleted(
        {
          filename: `inventory-report-${newReport._id}.${format}`,
          path: `/reports/inventory-report-${newReport._id}.${format}`,
          size: JSON.stringify(reportData).length,
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/json'
        },
        {
          generationTime: endTime - startTime,
          dataSize: JSON.stringify(reportData).length,
          recordsProcessed: overview[0]?.totalProducts || 0
        }
      );

      // Update report data
      newReport.data = reportData;
      await newReport.save();

      res.status(201).json({
        success: true,
        message: 'Inventory report generated successfully',
        data: newReport
      });

    } catch (dataError) {
      await newReport.markFailed(dataError);
      throw dataError;
    }

  } catch (error) {
    console.error('Generate inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inventory report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Generate staff performance report
const generateStaffReport = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const generatedBy = req.user.id;
    const {
      title,
      description,
      department,
      startDate,
      endDate,
      format = 'pdf'
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Create report record
    const newReport = new Report({
      title: title || 'Staff Performance Report',
      reportType: 'staff',
      category: 'custom_period',
      generatedBy,
      storeId,
      description,
      parameters: {
        dateRange: { startDate: start, endDate: end },
        filters: { departments: department ? [department] : [] }
      },
      format,
      status: 'generating'
    });

    await newReport.save();

    try {
      const startTime = Date.now();

      // Build match conditions
      let matchConditions = { storeId: mongoose.Types.ObjectId(storeId), isActive: true };
      if (department) matchConditions.department = department;

      // Get staff overview
      const staffOverview = await StaffProfile.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalStaff: { $sum: 1 },
            avgRating: { $avg: '$performance.rating' },
            avgHourlyRate: { $avg: '$hourlyRate' },
            totalHoursWorked: { $sum: '$attendance.totalHoursWorked' },
            avgAttendanceRate: {
              $avg: {
                $cond: {
                  if: { $eq: [{ $add: ['$attendance.totalDaysWorked', '$attendance.absences'] }, 0] },
                  then: 100,
                  else: {
                    $multiply: [
                      { $divide: ['$attendance.totalDaysWorked', { $add: ['$attendance.totalDaysWorked', '$attendance.absences'] }] },
                      100
                    ]
                  }
                }
              }
            }
          }
        }
      ]);

      // Get department breakdown
      const departmentBreakdown = await StaffProfile.aggregate([
        { $match: { storeId: mongoose.Types.ObjectId(storeId), isActive: true } },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            avgRating: { $avg: '$performance.rating' },
            avgHourlyRate: { $avg: '$hourlyRate' },
            totalHoursWorked: { $sum: '$attendance.totalHoursWorked' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Get top performers
      const topPerformers = await StaffProfile.find(matchConditions)
        .populate('userId', 'firstName lastName')
        .sort({ 'performance.rating': -1 })
        .limit(10)
        .select('userId employeeId position department performance attendance');

      const reportData = {
        summary: {
          period: { start: start.toISOString(), end: end.toISOString() },
          totalStaff: staffOverview[0]?.totalStaff || 0,
          avgRating: staffOverview[0]?.avgRating || 0,
          avgHourlyRate: staffOverview[0]?.avgHourlyRate || 0,
          totalHoursWorked: staffOverview[0]?.totalHoursWorked || 0,
          avgAttendanceRate: staffOverview[0]?.avgAttendanceRate || 0
        },
        details: {
          departmentBreakdown,
          topPerformers
        },
        charts: [
          {
            type: 'bar',
            title: 'Staff Count by Department',
            data: departmentBreakdown,
            config: { xField: '_id', yField: 'count' }
          },
          {
            type: 'bar',
            title: 'Average Rating by Department',
            data: departmentBreakdown,
            config: { xField: '_id', yField: 'avgRating' }
          }
        ]
      };

      const endTime = Date.now();

      // Mark report as completed
      await newReport.markCompleted(
        {
          filename: `staff-report-${newReport._id}.${format}`,
          path: `/reports/staff-report-${newReport._id}.${format}`,
          size: JSON.stringify(reportData).length,
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/json'
        },
        {
          generationTime: endTime - startTime,
          dataSize: JSON.stringify(reportData).length,
          recordsProcessed: staffOverview[0]?.totalStaff || 0
        }
      );

      // Update report data
      newReport.data = reportData;
      await newReport.save();

      res.status(201).json({
        success: true,
        message: 'Staff report generated successfully',
        data: newReport
      });

    } catch (dataError) {
      await newReport.markFailed(dataError);
      throw dataError;
    }

  } catch (error) {
    console.error('Generate staff report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating staff report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download report
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const report = await Report.findOne({ _id: id, storeId });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Report is not ready for download'
      });
    }

    // Record download
    await report.recordDownload();

    // For demo purposes, return JSON data
    // In production, you would return the actual file
    res.json({
      success: true,
      message: 'Report download initiated',
      data: {
        report: report.data,
        metadata: {
          title: report.title,
          generatedAt: report.createdAt,
          format: report.format,
          size: report.file.size,
          downloadCount: report.file.downloadCount
        }
      }
    });

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete report
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user.storeId;

    const report = await Report.findOneAndDelete({ _id: id, storeId });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get report templates
const getReportTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'daily_sales',
        name: 'Daily Sales Report',
        type: 'sales',
        description: 'Daily sales summary with key metrics',
        parameters: ['date'],
        estimatedTime: '30 seconds'
      },
      {
        id: 'weekly_inventory',
        name: 'Weekly Inventory Report',
        type: 'inventory',
        description: 'Weekly inventory status and alerts',
        parameters: ['week'],
        estimatedTime: '1 minute'
      },
      {
        id: 'monthly_staff',
        name: 'Monthly Staff Performance',
        type: 'staff',
        description: 'Monthly staff performance analysis',
        parameters: ['month', 'department'],
        estimatedTime: '2 minutes'
      },
      {
        id: 'supplier_analysis',
        name: 'Supplier Performance Analysis',
        type: 'supplier',
        description: 'Comprehensive supplier performance review',
        parameters: ['startDate', 'endDate', 'category'],
        estimatedTime: '1 minute'
      }
    ];

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving report templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllReports,
  getReportById,
  generateSalesReport,
  generateInventoryReport,
  generateStaffReport,
  downloadReport,
  deleteReport,
  getReportTemplates
}; 