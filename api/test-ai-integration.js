require('dotenv').config();
const aiService = require('./services/aiService');

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration with Hugging Face API...\n');

  try {
    // Test 1: Inventory Recommendations
    console.log('📦 Test 1: Inventory Recommendations');
    const inventoryData = [
      { productName: 'Apple iPhone 14', quantity: 0, price: 999, category: 'Electronics' },
      { productName: 'Nike Running Shoes', quantity: 15, price: 120, category: 'Sports' },
      { productName: 'Coffee Maker', quantity: 2, price: 89, category: 'Home & Garden' }
    ];

    const salesData = [
      { productName: 'Apple iPhone 14', totalSold: 25, revenue: 24975 },
      { productName: 'Nike Running Shoes', totalSold: 8, revenue: 960 },
      { productName: 'Coffee Maker', totalSold: 12, revenue: 1068 }
    ];

    const marketTrends = 'Holiday season approaching; Electronics demand increasing';

    const recommendations = await aiService.generateInventoryRecommendations(
      inventoryData, 
      salesData, 
      marketTrends
    );

    console.log('✅ AI Recommendations:', recommendations);
    console.log('');

    // Test 2: Demand Forecasting
    console.log('📊 Test 2: Demand Forecasting');
    const productData = {
      name: 'Apple iPhone 14',
      category: 'Electronics',
      quantity: 5
    };

    const historicalSales = [
      { quantity: 2, date: new Date('2024-01-01') },
      { quantity: 3, date: new Date('2024-01-02') },
      { quantity: 1, date: new Date('2024-01-03') },
      { quantity: 4, date: new Date('2024-01-04') },
      { quantity: 2, date: new Date('2024-01-05') }
    ];

    const seasonalFactors = { holiday: 1.5, backToSchool: 1.0 };

    const forecast = await aiService.generateDemandForecast(
      productData,
      historicalSales,
      seasonalFactors
    );

    console.log('✅ AI Demand Forecast:', forecast);
    console.log('');

    // Test 3: Pricing Insights
    console.log('💰 Test 3: Pricing Insights');
    const pricingData = {
      name: 'Apple iPhone 14',
      price: 999
    };

    const competitorPrices = [
      { competitor: 'Best Buy', price: 999 },
      { competitor: 'Target', price: 989 },
      { competitor: 'Amazon', price: 979 }
    ];

    const marketDemand = 'High demand during holiday season';

    const pricingInsights = await aiService.generatePricingInsights(
      pricingData,
      competitorPrices,
      marketDemand
    );

    console.log('✅ AI Pricing Insights:', pricingInsights);
    console.log('');

    // Test 4: Customer Behavior Analysis
    console.log('👥 Test 4: Customer Behavior Analysis');
    const purchaseHistory = [
      { product: 'Apple iPhone 14', quantity: 1 },
      { product: 'AirPods Pro', quantity: 1 },
      { product: 'iPhone Case', quantity: 2 }
    ];

    const demographics = 'Age: 25-35, Income: $60k-80k, Tech-savvy';
    const preferences = 'Premium electronics, Apple ecosystem, Quality over price';

    const customerAnalysis = await aiService.analyzeCustomerBehavior(
      purchaseHistory,
      demographics,
      preferences
    );

    console.log('✅ AI Customer Analysis:', customerAnalysis);
    console.log('');

    console.log('🎉 All AI tests completed successfully!');
    console.log('💡 The AI integration is working with the free Hugging Face API');

  } catch (error) {
    console.error('❌ AI Test Error:', error.message);
    console.log('🔄 Falling back to basic recommendations...');
    
    // Test fallback functionality
    const fallbackRecs = aiService.generateFallbackRecommendations();
    console.log('✅ Fallback Recommendations:', fallbackRecs);
  }
}

// Run the test
testAIIntegration(); 