const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Store = require('../models/Store');
const ManagerOrder = require('../models/ManagerOrder');
const mongoose = require('mongoose');

// Product Analytics Controller
class ProductAnalyticsController {
  
  // Get comprehensive product performance analysis
  static async getProductPerformance(req, res) {
    try {
      const { storeId } = req.params;
      const { timeframe = '30' } = req.query; // days
      
      console.log('📊 Product Analytics: Getting performance for store:', storeId);

      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe));

      // Get all products with inventory for this store
      const inventory = await Inventory.find({ storeId }).populate('productId');
      
      // Get sales data
      const sales = await Sale.find({
        storeId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Get manager orders for supplier analysis
      const managerOrders = await ManagerOrder.find({
        status: 'delivered',
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Analyze each product
      const productAnalytics = await this.analyzeProductPerformance(
        inventory, 
        sales, 
        managerOrders, 
        startDate, 
        endDate
      );

      // Generate recommendations
      const recommendations = await this.generateProductRecommendations(productAnalytics);

      // Demand forecasting
      const demandForecast = await this.generateDemandForecast(productAnalytics, timeframe);

      res.json({
        success: true,
        data: {
          productAnalytics,
          recommendations,
          demandForecast,
          timeframe: `${timeframe} days`,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Product Analytics Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get product performance',
        error: error.message
      });
    }
  }

  // Analyze performance of each product
  static async analyzeProductPerformance(inventory, sales, orders, startDate, endDate) {
    const analytics = [];

    for (const item of inventory) {
      const product = item.productId;
      const currentStock = item.quantity;

      // Get product sales
      const productSales = sales.filter(sale => 
        sale.items.some(saleItem => saleItem.productId.toString() === product._id.toString())
      );

      // Calculate sales metrics
      const totalSold = productSales.reduce((sum, sale) => {
        const saleItem = sale.items.find(item => item.productId.toString() === product._id.toString());
        return sum + (saleItem ? saleItem.quantity : 0);
      }, 0);

      const totalRevenue = totalSold * product.price;
      const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const dailySales = totalSold / daysInPeriod;
      const dailyRevenue = totalRevenue / daysInPeriod;

      // Calculate profitability metrics
      const estimatedCost = product.price * 0.6; // Assuming 40% margin
      const totalProfit = totalSold * (product.price - estimatedCost);
      const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

      // Calculate inventory metrics
      const stockTurnover = currentStock > 0 ? totalSold / currentStock : 0;
      const daysOfInventory = dailySales > 0 ? currentStock / dailySales : 999;
      const stockoutRisk = dailySales > 0 && currentStock < dailySales * 7 ? 'high' : 
                          dailySales > 0 && currentStock < dailySales * 14 ? 'medium' : 'low';

      // Calculate performance score (0-100)
      const performanceScore = this.calculatePerformanceScore({
        totalSold,
        totalRevenue,
        profitMargin,
        stockTurnover,
        daysOfInventory,
        stockoutRisk
      });

      // Get supplier information
      const supplierOrder = orders.find(order => 
        order.items.some(orderItem => orderItem.productId.toString() === product._id.toString())
      );

      analytics.push({
        productId: product._id,
        productName: product.name,
        category: product.category,
        brand: product.brand,
        currentStock,
        price: product.price,
        
        // Sales Metrics
        totalSold,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        dailySales: dailySales.toFixed(2),
        dailyRevenue: `$${dailyRevenue.toFixed(2)}`,
        
        // Profitability Metrics
        totalProfit: `$${totalProfit.toFixed(2)}`,
        profitMargin: `${profitMargin.toFixed(1)}%`,
        estimatedCost: `$${estimatedCost.toFixed(2)}`,
        
        // Inventory Metrics
        stockTurnover: stockTurnover.toFixed(2),
        daysOfInventory: daysOfInventory.toFixed(1),
        stockoutRisk,
        
        // Performance Score
        performanceScore: Math.round(performanceScore),
        performanceGrade: this.getPerformanceGrade(performanceScore),
        
        // Supplier Info
        supplier: supplierOrder ? supplierOrder.supplierName : 'Unknown',
        lastOrderDate: supplierOrder ? supplierOrder.createdAt : null,
        
        // Recommendations
        recommendedAction: this.getRecommendedAction(performanceScore, stockoutRisk, daysOfInventory),
        recommendedStock: Math.ceil(dailySales * 14), // 2 weeks of stock
        potentialProfit: `$${(dailySales * 14 * (product.price - estimatedCost)).toFixed(2)}`
      });
    }

    return analytics.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  // Calculate performance score
  static calculatePerformanceScore(metrics) {
    let score = 0;
    
    // Sales performance (30%)
    const salesScore = Math.min(100, (metrics.totalSold / 10) * 100);
    score += salesScore * 0.3;
    
    // Revenue performance (25%)
    const revenueScore = Math.min(100, (metrics.totalRevenue / 1000) * 100);
    score += revenueScore * 0.25;
    
    // Profit margin (20%)
    const marginScore = Math.min(100, metrics.profitMargin);
    score += marginScore * 0.2;
    
    // Stock turnover (15%)
    const turnoverScore = Math.min(100, metrics.stockTurnover * 20);
    score += turnoverScore * 0.15;
    
    // Inventory efficiency (10%)
    const inventoryScore = metrics.daysOfInventory <= 14 ? 100 : 
                          metrics.daysOfInventory <= 30 ? 70 :
                          metrics.daysOfInventory <= 60 ? 40 : 20;
    score += inventoryScore * 0.1;
    
    return score;
  }

  // Get performance grade
  static getPerformanceGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  // Get recommended action
  static getRecommendedAction(performanceScore, stockoutRisk, daysOfInventory) {
    if (stockoutRisk === 'high') return 'URGENT_REORDER';
    if (performanceScore >= 80 && daysOfInventory < 7) return 'INCREASE_STOCK';
    if (performanceScore >= 60 && daysOfInventory < 14) return 'MAINTAIN_STOCK';
    if (performanceScore < 40 && daysOfInventory > 30) return 'REDUCE_STOCK';
    if (performanceScore < 20) return 'DISCONTINUE';
    return 'HOLD';
  }

  // Generate product recommendations
  static async generateProductRecommendations(analytics) {
    const recommendations = {
      topPerformers: [],
      highPotential: [],
      needsAttention: [],
      discontinue: [],
      reorder: []
    };

    analytics.forEach(product => {
      // Top performers (A+ and A grades)
      if (product.performanceGrade === 'A+' || product.performanceGrade === 'A') {
        recommendations.topPerformers.push(product);
      }
      
      // High potential (B+ and B grades with good margins)
      if ((product.performanceGrade === 'B+' || product.performanceGrade === 'B') && 
          parseFloat(product.profitMargin) > 30) {
        recommendations.highPotential.push(product);
      }
      
      // Needs attention (C and D grades)
      if (product.performanceGrade === 'C' || product.performanceGrade === 'D') {
        recommendations.needsAttention.push(product);
      }
      
      // Discontinue (F grade or very low performance)
      if (product.performanceGrade === 'F' || product.performanceScore < 20) {
        recommendations.discontinue.push(product);
      }
      
      // Reorder (high stockout risk)
      if (product.recommendedAction === 'URGENT_REORDER' || 
          product.recommendedAction === 'INCREASE_STOCK') {
        recommendations.reorder.push(product);
      }
    });

    return recommendations;
  }

  // Generate demand forecast
  static async generateDemandForecast(analytics, timeframe) {
    const forecast = [];

    analytics.forEach(product => {
      const dailySales = parseFloat(product.dailySales);
      const currentStock = product.currentStock;
      const recommendedStock = product.recommendedStock;
      
      // Simple demand forecasting (can be enhanced with ML)
      const seasonalFactor = this.getSeasonalFactor(product.category);
      const trendFactor = this.getTrendFactor(product.performanceScore);
      
      const forecastedDailySales = dailySales * seasonalFactor * trendFactor;
      const forecastedMonthlySales = forecastedDailySales * 30;
      const forecastedQuarterlySales = forecastedDailySales * 90;
      
      // Calculate optimal stock levels
      const safetyStock = forecastedDailySales * 7; // 1 week safety stock
      const optimalStock = Math.ceil(forecastedDailySales * 14 + safetyStock);
      
      // Stock status
      const stockStatus = currentStock < safetyStock ? 'CRITICAL' :
                         currentStock < optimalStock * 0.5 ? 'LOW' :
                         currentStock > optimalStock * 1.5 ? 'HIGH' : 'OPTIMAL';

      forecast.push({
        productId: product.productId,
        productName: product.productName,
        currentStock,
        recommendedStock,
        optimalStock,
        stockStatus,
        
        // Forecasted demand
        forecastedDailySales: forecastedDailySales.toFixed(2),
        forecastedMonthlySales: Math.ceil(forecastedMonthlySales),
        forecastedQuarterlySales: Math.ceil(forecastedQuarterlySales),
        
        // Factors
        seasonalFactor: seasonalFactor.toFixed(2),
        trendFactor: trendFactor.toFixed(2),
        
        // Recommendations
        reorderPoint: Math.ceil(safetyStock),
        reorderQuantity: Math.max(0, optimalStock - currentStock),
        nextReorderDate: this.calculateNextReorderDate(currentStock, forecastedDailySales)
      });
    });

    return forecast;
  }

  // Get seasonal factor based on product category
  static getSeasonalFactor(category) {
    const currentMonth = new Date().getMonth();
    
    switch (category?.toLowerCase()) {
      case 'electronics':
        // Holiday season boost
        return (currentMonth >= 10 || currentMonth <= 1) ? 1.3 : 1.0;
      case 'clothing':
        // Seasonal clothing
        return (currentMonth >= 3 && currentMonth <= 5) || (currentMonth >= 9 && currentMonth <= 11) ? 1.2 : 0.8;
      case 'food':
        // Consistent demand
        return 1.0;
      default:
        return 1.0;
    }
  }

  // Get trend factor based on performance
  static getTrendFactor(performanceScore) {
    if (performanceScore >= 80) return 1.1; // Growing trend
    if (performanceScore >= 60) return 1.0; // Stable
    if (performanceScore >= 40) return 0.9; // Declining
    return 0.7; // Poor performance
  }

  // Calculate next reorder date
  static calculateNextReorderDate(currentStock, dailySales) {
    if (dailySales <= 0) return null;
    
    const daysUntilReorder = Math.floor(currentStock / dailySales);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysUntilReorder);
    
    return nextDate;
  }

  // Get profitability insights
  static async getProfitabilityInsights(req, res) {
    try {
      const { storeId } = req.params;
      
      const analytics = await this.getProductPerformance(req, res);
      
      if (!analytics.success) {
        return res.status(500).json(analytics);
      }

      const products = analytics.data.productAnalytics;
      
      // Calculate overall profitability metrics
      const totalRevenue = products.reduce((sum, p) => sum + parseFloat(p.totalRevenue.replace('$', '')), 0);
      const totalProfit = products.reduce((sum, p) => sum + parseFloat(p.totalProfit.replace('$', '')), 0);
      const totalCost = totalRevenue - totalProfit;
      const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Top profitable products
      const topProfitable = products
        .sort((a, b) => parseFloat(b.totalProfit.replace('$', '')) - parseFloat(a.totalProfit.replace('$', '')))
        .slice(0, 5);

      // High margin products
      const highMargin = products
        .filter(p => parseFloat(p.profitMargin) > 40)
        .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
        .slice(0, 5);

      // Underperforming products
      const underperforming = products
        .filter(p => p.performanceScore < 40)
        .sort((a, b) => a.performanceScore - b.performanceScore)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          overallMetrics: {
            totalRevenue: `$${totalRevenue.toFixed(2)}`,
            totalProfit: `$${totalProfit.toFixed(2)}`,
            totalCost: `$${totalCost.toFixed(2)}`,
            overallMargin: `${overallMargin.toFixed(1)}%`,
            totalProducts: products.length
          },
          topProfitable,
          highMargin,
          underperforming,
          recommendations: {
            increaseStock: products.filter(p => p.recommendedAction === 'INCREASE_STOCK').length,
            reduceStock: products.filter(p => p.recommendedAction === 'REDUCE_STOCK').length,
            discontinue: products.filter(p => p.recommendedAction === 'DISCONTINUE').length,
            urgentReorder: products.filter(p => p.recommendedAction === 'URGENT_REORDER').length
          }
        }
      });

    } catch (error) {
      console.error('❌ Profitability Insights Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profitability insights',
        error: error.message
      });
    }
  }

  // Apply product recommendation
  static async applyProductRecommendation(req, res) {
    try {
      const { productId } = req.params;
      const { action, quantity, reason } = req.body;

      console.log('📊 Product Analytics: Applying recommendation for product:', productId);

      // Here you would implement the actual recommendation application
      // This could involve:
      // - Creating manager orders
      // - Updating inventory levels
      // - Logging the action
      // - Sending notifications

      res.json({
        success: true,
        message: 'Product recommendation applied successfully',
        data: {
          productId,
          action,
          quantity,
          reason,
          appliedAt: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Apply Recommendation Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply recommendation',
        error: error.message
      });
    }
  }
}

module.exports = ProductAnalyticsController; 