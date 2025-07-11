const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const User = require('../models/User');

// Get customer analytics overview
const getCustomerAnalytics = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30', startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start = new Date();
      start.setDate(start.getDate() - parseInt(period));
      end = new Date();
    }

    // Get customer count
    const customerCount = await User.countDocuments({ role: 'customer' });

    // Get sales data with customer information
    const customerSalesData = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $addToSet: '$customerId' },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgTransactionValue: { $avg: '$totalAmount' },
          totalItemsSold: { $sum: { $sum: '$items.quantity' } }
        }
      },
      {
        $project: {
          uniqueCustomers: { $size: '$totalCustomers' },
          totalSales: 1,
          totalRevenue: 1,
          avgTransactionValue: 1,
          totalItemsSold: 1
        }
      }
    ]);

    // Get top customers by spending
    const topCustomers = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          customerId: { $ne: null },
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$customerId',
          totalSpent: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          lastPurchase: { $max: '$saleDate' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ]);

    // Get customer purchase frequency
    const purchaseFrequency = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          customerId: { $ne: null },
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$customerId',
          purchaseCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$purchaseCount',
          customerCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get new vs returning customers
    const customerTypes = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          newCustomers: {
            $sum: {
              $cond: [{ $eq: ['$customerInfo.isNewCustomer', true] }, 1, 0]
            }
          },
          returningCustomers: {
            $sum: {
              $cond: [{ $eq: ['$customerInfo.isNewCustomer', false] }, 1, 0]
            }
          },
          unknownCustomers: {
            $sum: {
              $cond: [{ $eq: ['$customerInfo.isNewCustomer', null] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get daily customer trends
    const dailyCustomerTrends = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }
          },
          uniqueCustomers: { $addToSet: '$customerId' },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          uniqueCustomers: { $size: '$uniqueCustomers' },
          totalSales: 1,
          totalRevenue: 1,
          avgRevenuePerCustomer: {
            $cond: {
              if: { $gt: [{ $size: '$uniqueCustomers' }, 0] },
              then: { $divide: ['$totalRevenue', { $size: '$uniqueCustomers' }] },
              else: 0
            }
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    const analytics = customerSalesData[0] || {
      uniqueCustomers: 0,
      totalSales: 0,
      totalRevenue: 0,
      avgTransactionValue: 0,
      totalItemsSold: 0
    };

    res.json({
      success: true,
      data: {
        overview: {
          ...analytics,
          totalRegisteredCustomers: customerCount,
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
            days: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
          }
        },
        topCustomers,
        purchaseFrequency,
        customerTypes: customerTypes[0] || {
          newCustomers: 0,
          returningCustomers: 0,
          unknownCustomers: 0
        },
        dailyTrends: dailyCustomerTrends
      }
    });

  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving customer analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get customer segmentation data
const getCustomerSegmentation = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '90' } = req.query; // Default to 90 days for segmentation

    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    const end = new Date();

    // RFM Analysis (Recency, Frequency, Monetary)
    const rfmAnalysis = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          customerId: { $ne: null },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$customerId',
          lastPurchase: { $max: '$saleDate' },
          frequency: { $sum: 1 },
          monetary: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $addFields: {
          recency: {
            $divide: [
              { $subtract: [new Date(), '$lastPurchase'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $addFields: {
          recencyScore: {
            $cond: {
              if: { $lte: ['$recency', 30] },
              then: 5,
              else: {
                $cond: {
                  if: { $lte: ['$recency', 60] },
                  then: 4,
                  else: {
                    $cond: {
                      if: { $lte: ['$recency', 90] },
                      then: 3,
                      else: {
                        $cond: {
                          if: { $lte: ['$recency', 180] },
                          then: 2,
                          else: 1
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          frequencyScore: {
            $cond: {
              if: { $gte: ['$frequency', 10] },
              then: 5,
              else: {
                $cond: {
                  if: { $gte: ['$frequency', 7] },
                  then: 4,
                  else: {
                    $cond: {
                      if: { $gte: ['$frequency', 4] },
                      then: 3,
                      else: {
                        $cond: {
                          if: { $gte: ['$frequency', 2] },
                          then: 2,
                          else: 1
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          monetaryScore: {
            $cond: {
              if: { $gte: ['$monetary', 1000] },
              then: 5,
              else: {
                $cond: {
                  if: { $gte: ['$monetary', 500] },
                  then: 4,
                  else: {
                    $cond: {
                      if: { $gte: ['$monetary', 200] },
                      then: 3,
                      else: {
                        $cond: {
                          if: { $gte: ['$monetary', 50] },
                          then: 2,
                          else: 1
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          segment: {
            $cond: {
              if: {
                $and: [
                  { $gte: ['$recencyScore', 4] },
                  { $gte: ['$frequencyScore', 4] },
                  { $gte: ['$monetaryScore', 4] }
                ]
              },
              then: 'Champions',
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ['$recencyScore', 3] },
                      { $gte: ['$frequencyScore', 3] },
                      { $gte: ['$monetaryScore', 3] }
                    ]
                  },
                  then: 'Loyal Customers',
                  else: {
                    $cond: {
                      if: {
                        $and: [
                          { $gte: ['$recencyScore', 4] },
                          { $lte: ['$frequencyScore', 2] }
                        ]
                      },
                      then: 'Potential Loyalists',
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              { $gte: ['$recencyScore', 4] },
                              { $lte: ['$frequencyScore', 1] }
                            ]
                          },
                          then: 'New Customers',
                          else: {
                            $cond: {
                              if: {
                                $and: [
                                  { $lte: ['$recencyScore', 2] },
                                  { $gte: ['$frequencyScore', 3] }
                                ]
                              },
                              then: 'At Risk',
                              else: 'Others'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ]);

    // Segment summary
    const segmentSummary = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          customerId: { $ne: null },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$customerId',
          lastPurchase: { $max: '$saleDate' },
          frequency: { $sum: 1 },
          monetary: { $sum: '$totalAmount' }
        }
      },
      {
        $addFields: {
          recency: {
            $divide: [
              { $subtract: [new Date(), '$lastPurchase'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $addFields: {
          segment: {
            $cond: {
              if: { $and: [{ $lte: ['$recency', 30] }, { $gte: ['$frequency', 5] }, { $gte: ['$monetary', 500] }] },
              then: 'Champions',
              else: {
                $cond: {
                  if: { $and: [{ $lte: ['$recency', 60] }, { $gte: ['$frequency', 3] }, { $gte: ['$monetary', 200] }] },
                  then: 'Loyal Customers',
                  else: {
                    $cond: {
                      if: { $and: [{ $lte: ['$recency', 30] }, { $lte: ['$frequency', 2] }] },
                      then: 'Potential Loyalists',
                      else: {
                        $cond: {
                          if: { $and: [{ $lte: ['$recency', 30] }, { $eq: ['$frequency', 1] }] },
                          then: 'New Customers',
                          else: {
                            $cond: {
                              if: { $and: [{ $gt: ['$recency', 60] }, { $gte: ['$frequency', 3] }] },
                              then: 'At Risk',
                              else: 'Others'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          avgFrequency: { $avg: '$frequency' },
          avgMonetary: { $avg: '$monetary' },
          avgRecency: { $avg: '$recency' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        rfmAnalysis: rfmAnalysis.slice(0, 50), // Limit for performance
        segmentSummary,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: parseInt(period)
        }
      }
    });

  } catch (error) {
    console.error('Get customer segmentation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving customer segmentation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get customer behavior patterns
const getCustomerBehavior = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const { period = '30' } = req.query;

    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    const end = new Date();

    // Purchase patterns by time
    const timePatterns = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$saleDate' },
            dayOfWeek: { $dayOfWeek: '$saleDate' }
          },
          salesCount: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$customerId' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          hour: '$_id.hour',
          dayOfWeek: '$_id.dayOfWeek',
          salesCount: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          totalRevenue: 1
        }
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
    ]);

    // Popular product categories among customers
    const categoryPreferences = await Sale.aggregate([
      {
        $match: {
          storeId: mongoose.Types.ObjectId(storeId),
          saleDate: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          customerCount: { $addToSet: '$customerId' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' }
        }
      },
      {
        $project: {
          category: '$_id',
          uniqueCustomers: { $size: '$customerCount' },
          totalQuantity: 1,
          totalRevenue: 1,
          avgRevenuePerCustomer: {
            $divide: ['$totalRevenue', { $size: '$customerCount' }]
          }
        }
      },
      { $sort: { uniqueCustomers: -1 } }
    ]);

    // Payment method preferences
    const paymentPreferences = await Sale.aggregate([
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
          customerCount: { $addToSet: '$customerId' },
          transactionCount: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          paymentMethod: '$_id',
          uniqueCustomers: { $size: '$customerCount' },
          transactionCount: 1,
          totalAmount: 1,
          avgTransactionValue: { $divide: ['$totalAmount', '$transactionCount'] }
        }
      },
      { $sort: { uniqueCustomers: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        timePatterns,
        categoryPreferences,
        paymentPreferences,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: parseInt(period)
        }
      }
    });

  } catch (error) {
    console.error('Get customer behavior error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving customer behavior data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getCustomerAnalytics,
  getCustomerSegmentation,
  getCustomerBehavior
}; 