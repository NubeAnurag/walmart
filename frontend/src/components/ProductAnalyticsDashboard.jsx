import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { managerAPI } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Star,
  Award,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';

const ProductAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [profitability, setProfitability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.storeId?._id) {
      fetchAnalytics();
      fetchProfitability();
    }
  }, [user?.storeId?._id, timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await managerAPI.getProductPerformance(user.storeId._id, timeframe);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitability = async () => {
    try {
      const response = await managerAPI.getProfitabilityInsights(user.storeId._id);
      if (response.success) {
        setProfitability(response.data);
      }
    } catch (error) {
      console.error('Error fetching profitability:', error);
    }
  };

  const applyRecommendation = async (productId, action, quantity, reason) => {
    try {
      await managerAPI.applyProductRecommendation(productId, action, quantity, reason);
      await fetchAnalytics(); // Refresh data
    } catch (error) {
      console.error('Error applying recommendation:', error);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'INCREASE_STOCK': return 'text-green-600 bg-green-50';
      case 'MAINTAIN_STOCK': return 'text-blue-600 bg-blue-50';
      case 'REDUCE_STOCK': return 'text-yellow-600 bg-yellow-50';
      case 'URGENT_REORDER': return 'text-red-600 bg-red-50';
      case 'DISCONTINUE': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'profitability', label: 'Profitability', icon: DollarSign },
    { id: 'forecast', label: 'Demand Forecast', icon: Target },
    { id: 'recommendations', label: 'Recommendations', icon: Award }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading product analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Performance & Profitability</h2>
          <p className="text-gray-600">Comprehensive analysis of product performance and profitability insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="btn btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} profitability={profitability} />}
        {activeTab === 'performance' && <PerformanceTab analytics={analytics} getPerformanceColor={getPerformanceColor} getActionColor={getActionColor} />}
        {activeTab === 'profitability' && <ProfitabilityTab profitability={profitability} />}
        {activeTab === 'forecast' && <ForecastTab analytics={analytics} />}
        {activeTab === 'recommendations' && <RecommendationsTab analytics={analytics} onApply={applyRecommendation} />}
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ analytics, profitability }) => {
  if (!analytics || !profitability) return <div>Loading...</div>;

  const { productAnalytics, recommendations } = analytics;
  const { overallMetrics } = profitability;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{overallMetrics.totalRevenue}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">{overallMetrics.totalProfit}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900">{overallMetrics.overallMargin}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{overallMetrics.totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {recommendations.topPerformers.slice(0, 5).map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-600">Score: {product.performanceScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-medium">{product.totalProfit}</p>
                  <p className="text-sm text-gray-500">{product.profitMargin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Needs Attention</h3>
          <div className="space-y-3">
            {recommendations.needsAttention.slice(0, 5).map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-600">Score: {product.performanceScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-600 font-medium">{product.totalProfit}</p>
                  <p className="text-sm text-gray-500">{product.profitMargin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Performance Tab
const PerformanceTab = ({ analytics, getPerformanceColor, getActionColor }) => {
  if (!analytics) return <div>Loading...</div>;

  const { productAnalytics } = analytics;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Product Performance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productAnalytics.map((product) => (
                <tr key={product.productId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                      <div className="text-sm text-gray-500">{product.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceColor(product.performanceScore)}`}>
                      {product.performanceGrade} ({product.performanceScore})
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{product.totalSold}</div>
                    <div className="text-sm text-gray-500">{product.dailySales}/day</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{product.totalRevenue}</div>
                    <div className="text-sm text-gray-500">{product.dailyRevenue}/day</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{product.totalProfit}</div>
                    <div className="text-sm text-gray-500">{product.profitMargin}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{product.currentStock}</div>
                    <div className="text-sm text-gray-500">{product.daysOfInventory} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(product.recommendedAction)}`}>
                      {product.recommendedAction.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Profitability Tab
const ProfitabilityTab = ({ profitability }) => {
  if (!profitability) return <div>Loading...</div>;

  const { topProfitable, highMargin, underperforming } = profitability;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Top Profitable Products
          </h3>
          <div className="space-y-3">
            {topProfitable.map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-600">{product.totalSold} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-medium">{product.totalProfit}</p>
                  <p className="text-sm text-gray-500">{product.profitMargin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="w-5 h-5 text-blue-500 mr-2" />
            High Margin Products
          </h3>
          <div className="space-y-3">
            {highMargin.map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-600">${product.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 font-medium">{product.profitMargin}</p>
                  <p className="text-sm text-gray-500">{product.totalProfit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            Underperforming Products
          </h3>
          <div className="space-y-3">
            {underperforming.map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-600">Score: {product.performanceScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-medium">{product.totalProfit}</p>
                  <p className="text-sm text-gray-500">{product.profitMargin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Forecast Tab
const ForecastTab = ({ analytics }) => {
  if (!analytics) return <div>Loading...</div>;

  const { demandForecast } = analytics;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Demand Forecasting</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Demand</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Optimal Stock</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Next Reorder</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {demandForecast.map((forecast) => (
                <tr key={forecast.productId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{forecast.productName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">{forecast.currentStock}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{forecast.forecastedDailySales}/day</div>
                    <div className="text-sm text-gray-500">{forecast.forecastedMonthlySales}/month</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">{forecast.optimalStock}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      forecast.stockStatus === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      forecast.stockStatus === 'LOW' ? 'bg-yellow-100 text-yellow-800' :
                      forecast.stockStatus === 'HIGH' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {forecast.stockStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">{forecast.reorderPoint}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-500">
                      {forecast.nextReorderDate ? new Date(forecast.nextReorderDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Recommendations Tab
const RecommendationsTab = ({ analytics, onApply }) => {
  if (!analytics) return <div>Loading...</div>;

  const { recommendations } = analytics;

  const handleApply = (productId, action, quantity) => {
    const reason = `Applied ${action.toLowerCase().replace('_', ' ')} recommendation`;
    onApply(productId, action, quantity, reason);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUpIcon className="w-5 h-5 text-green-500 mr-2" />
            Increase Stock ({recommendations.reorder.length})
          </h3>
          <div className="space-y-3">
            {recommendations.reorder.map((product) => (
              <div key={product.productId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{product.productName}</h4>
                  <span className="text-sm text-gray-500">{product.recommendedAction}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Current: {product.currentStock} | Recommended: {product.recommendedStock}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApply(product.productId, 'INCREASE_STOCK', product.recommendedStock - product.currentStock)}
                    className="btn btn-sm btn-primary"
                  >
                    Apply
                  </button>
                  <button className="btn btn-sm btn-outline">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingDownIcon className="w-5 h-5 text-red-500 mr-2" />
            Reduce Stock ({recommendations.discontinue.length})
          </h3>
          <div className="space-y-3">
            {recommendations.discontinue.map((product) => (
              <div key={product.productId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{product.productName}</h4>
                  <span className="text-sm text-gray-500">{product.recommendedAction}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Performance Score: {product.performanceScore} | Profit: {product.totalProfit}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApply(product.productId, 'DISCONTINUE', 0)}
                    className="btn btn-sm btn-secondary"
                  >
                    Discontinue
                  </button>
                  <button className="btn btn-sm btn-outline">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalyticsDashboard; 