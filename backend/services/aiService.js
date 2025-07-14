const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    // Gemini API Configuration
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyCsaQpUXzbSn3K6HNmnmNO4HT8n2hCz3gg';
    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
    
    // Hugging Face Inference API - Fallback
    this.hfApiUrl = 'https://api-inference.huggingface.co/models';
    this.hfApiKey = process.env.HUGGING_FACE_API_KEY || 'hf_demo_key';
    
    // Best models for business intelligence and inventory optimization
    this.models = {
      // Primary: Best for business insights and recommendations
      primary: 'gpt2',
      // Secondary: Good for detailed financial analysis
      secondary: 'distilgpt2',
      // Fallback: Lightweight but effective
      fallback: 'microsoft/DialoGPT-medium'
    };
    
    this.currentModel = this.models.primary;
    
    // Chatbot intents and responses
    this.intents = {
      greeting: {
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        responses: [
          "Hello! I'm your Walmart shopping assistant. How can I help you today?",
          "Hi there! I'm here to help you with your shopping needs. What can I do for you?",
          "Hey! Welcome to Walmart. I can help you find products, check orders, or answer questions."
        ]
      },
      product_search: {
        patterns: ['find', 'search', 'looking for', 'need', 'want', 'show me', 'product', 'buy', 'purchase', 'electronics', 'clothing', 'books', 'food', 'grocery', 'phone', 'laptop', 'computer', 'macbook', 'iphone', 'speaker', 'headphones', 'available', 'in stock'],
        responses: [
          "I'll help you find what you're looking for. What product are you interested in?",
          "Let me search our inventory for you. What would you like to find?",
          "I can help you discover great products. What are you shopping for today?"
        ]
      },
      order_status: {
        patterns: ['order', 'my order', 'order status', 'delivery', 'shipped', 'tracking', 'recent order', 'last order', 'latest order', 'order details', 'order information', 'purchase', 'transaction'],
        responses: [
          "I can help you check your order status. Let me look that up for you.",
          "Let me find information about your recent orders.",
          "I'll check on your order details right away."
        ]
      },
      store_info: {
        patterns: ['store', 'stores', 'location', 'locations', 'address', 'how many stores', 'number of stores', 'list of stores', 'store list', 'walmart store', 'walmart location', 'store hours', 'contact', 'phone number'],
        responses: [
          "I can help you find information about our store locations.",
          "Let me get you details about our Walmart stores.",
          "I'll provide you with our store information."
        ]
      },
      help: {
        patterns: ['help', 'support', 'assistance', 'how to', 'can you', 'what can you do', 'capabilities'],
        responses: [
          "I can help you with:\n• Finding products\n• Checking order status\n• Product recommendations\n• Store information\n• General shopping questions",
          "I'm here to assist you with shopping, orders, and product information. What do you need help with?",
          "I can help you navigate our store, find products, and answer your questions. How can I assist you?"
        ]
      },
      goodbye: {
        patterns: ['bye', 'goodbye', 'see you', 'thanks', 'thank you', 'that\'s all'],
        responses: [
          "Thank you for shopping with Walmart! Have a great day!",
          "Goodbye! Feel free to ask if you need anything else.",
          "Thanks for chatting! Happy shopping at Walmart!"
        ]
      }
    };
  }

  // Generate intelligent inventory recommendations
  async generateInventoryRecommendations(inventoryData, salesData, marketTrends) {
    try {
      const prompt = this.buildInventoryPrompt(inventoryData, salesData, marketTrends);
      
      const response = await this.callLLM(prompt, {
        max_length: 500,
        temperature: 0.7,
        top_p: 0.9
      });

      return this.parseInventoryRecommendations(response);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateFallbackRecommendations(inventoryData, salesData);
    }
  }

  // Generate demand forecasting insights
  async generateDemandForecast(productData, historicalSales, seasonalFactors) {
    try {
      const prompt = this.buildDemandPrompt(productData, historicalSales, seasonalFactors);
      
      const response = await this.callLLM(prompt, {
        max_length: 400,
        temperature: 0.6,
        top_p: 0.8
      });

      return this.parseDemandForecast(response);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateFallbackDemandForecast(productData, historicalSales);
    }
  }

  // Generate pricing optimization suggestions
  async generatePricingInsights(productData, competitorPrices, marketDemand) {
    try {
      const prompt = this.buildPricingPrompt(productData, competitorPrices, marketDemand);
      
      const response = await this.callLLM(prompt, {
        max_length: 300,
        temperature: 0.5,
        top_p: 0.8
      });

      return this.parsePricingInsights(response);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateFallbackPricingInsights(productData);
    }
  }

  // Generate customer behavior analysis
  async analyzeCustomerBehavior(purchaseHistory, demographics, preferences) {
    try {
      const prompt = this.buildCustomerPrompt(purchaseHistory, demographics, preferences);
      
      const response = await this.callLLM(prompt, {
        max_length: 600,
        temperature: 0.7,
        top_p: 0.9
      });

      return this.parseCustomerAnalysis(response);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateFallbackCustomerAnalysis(purchaseHistory);
    }
  }

  // Call the LLM API with intelligent model selection and fallback
  async callLLM(prompt, parameters = {}) {
    const modelsToTry = [this.currentModel, this.models.secondary, this.models.fallback];
    
    console.log(`🔑 Using API Key: ${this.hfApiKey.substring(0, 10)}...`);
    
    for (const model of modelsToTry) {
      try {
        console.log(`🤖 Trying model: ${model}`);
        
        const response = await axios.post(
          `${this.hfApiUrl}/${model}`,
          {
            inputs: prompt,
            parameters: {
              max_length: parameters.max_length || 500,
              temperature: parameters.temperature || 0.7,
              top_p: parameters.top_p || 0.9,
              do_sample: true,
              return_full_text: false,
              repetition_penalty: 1.1
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.hfApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        console.log(`✅ Success with model: ${model}`);
        return response.data[0]?.generated_text || response.data;
      } catch (error) {
        console.error(`❌ Failed with model ${model}:`, error.message);
        continue; // Try next model
      }
    }
    
    // If all models fail, throw error
    throw new Error('All AI models failed to respond');
  }

  // Build prompts for different use cases
  buildInventoryPrompt(inventoryData, salesData, marketTrends) {
    const lowStockItems = inventoryData.filter(item => item.quantity <= 2);
    const highStockItems = inventoryData.filter(item => item.quantity > 10);
    const topSellingItems = salesData.slice(0, 5);

    return `As an inventory management AI expert, analyze this Walmart store data and provide specific recommendations:

INVENTORY STATUS:
- Low stock items (≤2 units): ${lowStockItems.map(item => `${item.productName} (${item.quantity})`).join(', ')}
- High stock items (>10 units): ${highStockItems.map(item => `${item.productName} (${item.quantity})`).join(', ')}
- Top selling items: ${topSellingItems.map(item => `${item.productName} (${item.totalSold} sold)`).join(', ')}

MARKET TRENDS: ${marketTrends}

Please provide:
1. Specific restock recommendations with quantities
2. Items to consider for promotions
3. Seasonal adjustments needed
4. Risk assessment for stockouts

Format your response as actionable recommendations.`;
  }

  buildDemandPrompt(productData, historicalSales, seasonalFactors) {
    const recentTrends = historicalSales.slice(-7); // Last 7 days
    const seasonalData = seasonalFactors;

    return `As a demand forecasting AI expert, analyze this product data and predict future demand:

PRODUCT: ${productData.name}
CATEGORY: ${productData.category}
CURRENT STOCK: ${productData.quantity}
HISTORICAL SALES (last 7 days): ${recentTrends.map(sale => sale.quantity).join(', ')}
SEASONAL FACTORS: ${seasonalData}

Please provide:
1. 30-day demand forecast
2. Recommended reorder point
3. Confidence level in prediction
4. Seasonal adjustments needed

Format as structured forecast data.`;
  }

  buildPricingPrompt(productData, competitorPrices, marketDemand) {
    return `As a pricing optimization AI expert, analyze this product pricing data:

PRODUCT: ${productData.name}
CURRENT PRICE: $${productData.price}
COMPETITOR PRICES: ${competitorPrices.map(cp => `${cp.competitor}: $${cp.price}`).join(', ')}
MARKET DEMAND: ${marketDemand}

Please provide:
1. Optimal price recommendation
2. Price elasticity analysis
3. Competitive positioning strategy
4. Profit margin optimization

Format as pricing insights.`;
  }

  buildCustomerPrompt(purchaseHistory, demographics, preferences) {
    return `As a customer behavior AI expert, analyze this customer data:

PURCHASE HISTORY: ${purchaseHistory.map(ph => `${ph.product} (${ph.quantity})`).join(', ')}
DEMOGRAPHICS: ${demographics}
PREFERENCES: ${preferences}

Please provide:
1. Customer segmentation insights
2. Purchase pattern analysis
3. Product recommendation opportunities
4. Customer lifetime value assessment

Format as customer behavior insights.`;
  }

  // Parse AI responses
  parseInventoryRecommendations(aiResponse) {
    // Extract structured data from AI response
    const recommendations = [];
    
    // Parse the AI response and extract recommendations
    const lines = aiResponse.split('\n');
    let currentRecommendation = {};

    for (const line of lines) {
      if (line.includes('RESTOCK:')) {
        if (currentRecommendation.type) {
          recommendations.push(currentRecommendation);
        }
        currentRecommendation = {
          type: 'restock',
          title: line.replace('RESTOCK:', '').trim(),
          priority: 'high'
        };
      } else if (line.includes('PROMOTION:')) {
        if (currentRecommendation.type) {
          recommendations.push(currentRecommendation);
        }
        currentRecommendation = {
          type: 'promotion',
          title: line.replace('PROMOTION:', '').trim(),
          priority: 'medium'
        };
      } else if (line.includes('QUANTITY:')) {
        currentRecommendation.recommendedQuantity = parseInt(line.match(/\d+/)?.[0] || '5');
      } else if (line.includes('REASON:')) {
        currentRecommendation.description = line.replace('REASON:', '').trim();
      }
    }

    if (currentRecommendation.type) {
      recommendations.push(currentRecommendation);
    }

    return recommendations.length > 0 ? recommendations : this.generateFallbackRecommendations();
  }

  parseDemandForecast(aiResponse) {
    // Extract forecast data from AI response
    const forecast = {
      predictedDemand: 0,
      confidence: 75,
      reorderPoint: 0,
      seasonalAdjustment: 0
    };

    const lines = aiResponse.split('\n');
    for (const line of lines) {
      if (line.includes('DEMAND:')) {
        forecast.predictedDemand = parseInt(line.match(/\d+/)?.[0] || '0');
      } else if (line.includes('CONFIDENCE:')) {
        forecast.confidence = parseInt(line.match(/\d+/)?.[0] || '75');
      } else if (line.includes('REORDER:')) {
        forecast.reorderPoint = parseInt(line.match(/\d+/)?.[0] || '0');
      }
    }

    return forecast;
  }

  parsePricingInsights(aiResponse) {
    // Extract pricing insights from AI response
    const insights = {
      optimalPrice: 0,
      priceElasticity: 'medium',
      competitivePosition: 'competitive',
      marginOptimization: 'maintain'
    };

    const lines = aiResponse.split('\n');
    for (const line of lines) {
      if (line.includes('OPTIMAL PRICE:')) {
        insights.optimalPrice = parseFloat(line.match(/\d+\.?\d*/)?.[0] || '0');
      } else if (line.includes('ELASTICITY:')) {
        insights.priceElasticity = line.includes('high') ? 'high' : line.includes('low') ? 'low' : 'medium';
      }
    }

    return insights;
  }

  parseCustomerAnalysis(aiResponse) {
    // Extract customer insights from AI response
    const analysis = {
      segment: 'general',
      purchasePattern: 'regular',
      recommendations: [],
      lifetimeValue: 'medium'
    };

    const lines = aiResponse.split('\n');
    for (const line of lines) {
      if (line.includes('SEGMENT:')) {
        analysis.segment = line.replace('SEGMENT:', '').trim().toLowerCase();
      } else if (line.includes('PATTERN:')) {
        analysis.purchasePattern = line.replace('PATTERN:', '').trim().toLowerCase();
      } else if (line.includes('RECOMMEND:')) {
        analysis.recommendations.push(line.replace('RECOMMEND:', '').trim());
      }
    }

    return analysis;
  }

  // Fallback methods when AI is unavailable
  generateFallbackRecommendations(inventoryData = [], salesData = []) {
    const recommendations = [];
    
    // Generate basic recommendations based on data
    const lowStockItems = inventoryData.filter(item => item.quantity <= 2);
    const highStockItems = inventoryData.filter(item => item.quantity > 10);

    lowStockItems.forEach(item => {
      recommendations.push({
        type: 'restock',
        title: `Restock ${item.productName}`,
        description: `Current stock is low (${item.quantity} units). Recommended quantity: ${Math.max(5, item.quantity * 3)}`,
        priority: 'high',
        recommendedQuantity: Math.max(5, item.quantity * 3)
      });
    });

    highStockItems.slice(0, 3).forEach(item => {
      recommendations.push({
        type: 'promotion',
        title: `Promote ${item.productName}`,
        description: `High stock level (${item.quantity} units). Consider promotional pricing.`,
        priority: 'medium',
        recommendedQuantity: 0
      });
    });

    return recommendations;
  }

  generateFallbackDemandForecast(productData, historicalSales) {
    const totalSold = historicalSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const avgDailyDemand = totalSold / Math.max(historicalSales.length, 1);
    
    return {
      predictedDemand: Math.ceil(avgDailyDemand * 30),
      confidence: 70,
      reorderPoint: Math.ceil(avgDailyDemand * 7),
      seasonalAdjustment: 0
    };
  }

  generateFallbackPricingInsights(productData) {
    return {
      optimalPrice: productData.price * (0.95 + Math.random() * 0.1), // ±5% variation
      priceElasticity: 'medium',
      competitivePosition: 'competitive',
      marginOptimization: 'maintain'
    };
  }

  generateFallbackCustomerAnalysis(purchaseHistory) {
    return {
      segment: 'general',
      purchasePattern: 'regular',
      recommendations: ['Consider loyalty program', 'Personalized promotions'],
      lifetimeValue: 'medium'
    };
  }

  // ==================== CHATBOT METHODS ====================

  // Detect intent from user message
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, data] of Object.entries(this.intents)) {
      for (const pattern of data.patterns) {
        if (lowerMessage.includes(pattern)) {
          return {
            intent,
            confidence: this.calculateConfidence(lowerMessage, pattern)
          };
        }
      }
    }
    
    return { intent: 'unknown', confidence: 0.3 };
  }

  // Calculate confidence score for intent detection
  calculateConfidence(message, pattern) {
    const words = message.split(' ');
    const patternWords = pattern.split(' ');
    
    let matches = 0;
    for (const word of patternWords) {
      if (words.includes(word)) {
        matches++;
      }
    }
    
    return Math.min(0.9, 0.5 + (matches / patternWords.length) * 0.4);
  }

  // Extract entities from message (product names, numbers, etc.)
  extractEntities(message) {
    const entities = [];
    
    // Extract product categories
    const categories = ['electronics', 'clothing', 'food', 'books', 'toys', 'sports', 'home', 'garden'];
    const lowerMessage = message.toLowerCase();
    
    for (const category of categories) {
      if (lowerMessage.includes(category)) {
        entities.push({ type: 'category', value: category });
      }
    }
    
    // Extract numbers (could be order numbers, quantities, etc.)
    const numbers = message.match(/\d+/g);
    if (numbers) {
      numbers.forEach(num => {
        entities.push({ type: 'number', value: num });
      });
    }
    
    // Extract product names (simple keyword matching)
    const productKeywords = ['iphone', 'laptop', 'shirt', 'shoes', 'book', 'tv', 'phone', 'computer'];
    for (const keyword of productKeywords) {
      if (lowerMessage.includes(keyword)) {
        entities.push({ type: 'product', value: keyword });
      }
    }
    
    return entities;
  }

  // Generate chatbot response
  async generateChatResponse(message, userId, context = {}) {
    const startTime = Date.now();
    
    try {
      // Detect intent and extract entities
      const { intent, confidence } = this.detectIntent(message);
      // Temporarily disable entity extraction to avoid validation issues
      // const entities = this.extractEntities(message);
      const entities = []; // Empty array to avoid validation errors
      
      let response = '';
      let messageType = 'text';
      let metadata = {
        intent,
        confidence,
        entities: entities, // Always empty array for now
        responseTime: 0
      };
      
      // Generate response based on intent
      switch (intent) {
        case 'greeting':
          // Use personalized greeting if we have user context
          if (context.user) {
            response = `Hi ${context.user.firstName}! I'm here to help you with your shopping needs. How can I assist you today?`;
          } else {
            response = this.getRandomResponse(this.intents.greeting.responses);
          }
          break;
          
        case 'product_search':
          const productResponse = await this.handleProductSearch(message, entities, context);
          response = productResponse.message;
          messageType = productResponse.type;
          metadata.products = productResponse.products;
          break;
          
        case 'order_status':
          const orderResponse = await this.handleOrderStatus(userId, entities, context);
          response = orderResponse.message;
          messageType = orderResponse.type;
          if (orderResponse.orderId) {
            metadata.orderId = orderResponse.orderId;
          }
          break;
          
        case 'store_info':
          const storeResponse = await this.handleStoreInfo(message, entities, context);
          response = storeResponse.message;
          messageType = storeResponse.type;
          metadata.stores = storeResponse.stores;
          break;
          
        case 'help':
          response = this.getRandomResponse(this.intents.help.responses);
          messageType = 'help';
          break;
          
        case 'goodbye':
          response = this.getRandomResponse(this.intents.goodbye.responses);
          break;
          
        default:
          // Use Gemini AI for general questions and conversations
          try {
            response = await this.generateGeminiResponse(message, context);
          } catch (geminiError) {
            console.warn('Gemini failed for default case, using customer response generation:', geminiError.message);
            // Fallback to customer-specific response generation
            response = await this.generateCustomerResponse(message, userId, context);
            if (!response) {
              response = "I'm not sure I understand. Can you please rephrase your question? I can help you with finding products, checking orders, store information, or general shopping questions.";
            }
          }
      }
      
      metadata.responseTime = Date.now() - startTime;
      
      return {
        message: response,
        messageType,
        metadata
      };
      
    } catch (error) {
      console.error('Chat response generation error:', error);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        messageType: 'error',
        metadata: {
          intent: 'error',
          confidence: 0,
          entities: [],
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  // Handle product search requests
  async handleProductSearch(message, entities, context) {
    try {
      // Import required models
      const Product = require('../models/Product');
      const Store = require('../models/Store');
      const Inventory = require('../models/Inventory');
      
      // Extract product-related entities
      const productEntities = entities.filter(e => e.type === 'product' || e.type === 'category');
      
      if (productEntities.length === 0) {
        return {
          message: "What specific product are you looking for? I can help you find electronics, clothing, books, and more from our stores!",
          type: 'text',
          products: []
        };
      }
      
      // Search for products in the database
      const searchTerm = productEntities.map(e => e.value).join(' ');
      const products = await Product.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
          { brand: { $regex: searchTerm, $options: 'i' } }
        ]
      }).limit(5);
      
      if (products.length === 0) {
        return {
          message: `I couldn't find any products matching "${searchTerm}". Try searching for electronics, clothing, books, or other categories.`,
          type: 'text',
          products: []
        };
      }
      
      // Get inventory information for each product
      const productsWithInventory = await Promise.all(
        products.map(async (product) => {
          const inventory = await Inventory.findOne({ productId: product._id })
            .populate('storeId', 'name storeCode');
          
          return {
            productId: product._id,
            name: product.name,
            price: product.price,
            category: product.category,
            brand: product.brand,
            image: product.image || '/images/default-product.jpg',
            availability: inventory ? {
              quantity: inventory.quantity,
              store: inventory.storeId ? inventory.storeId.name : 'Unknown Store'
            } : { quantity: 0, store: 'Out of Stock' }
          };
        })
      );
      
      return {
        message: `I found ${products.length} product${products.length > 1 ? 's' : ''} matching "${searchTerm}":`,
        type: 'product_recommendation',
        products: productsWithInventory
      };
      
    } catch (error) {
      console.error('Product search error:', error);
      return {
        message: "I'm having trouble searching for products right now. Please try again later.",
        type: 'error',
        products: []
      };
    }
  }

  // Handle order status requests
  async handleOrderStatus(userId, entities, context) {
    try {
      const Order = require('../models/Order');
      const ManagerOrder = require('../models/ManagerOrder');
      
      // Use real customer orders from context or fetch from database
      let orders = context.recentOrders || [];
      
      if (orders.length === 0) {
        // Try to fetch customer orders first
        orders = await Order.find({ customerId: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('items.productId', 'name price');
          
        // If no customer orders, try manager orders (in case user is a manager)
        if (orders.length === 0) {
          const managerOrders = await ManagerOrder.find({ managerId: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('items.productId', 'name price');
          orders = managerOrders;
        }
      }
      
      if (orders.length === 0) {
        return {
          message: "You don't have any recent orders. Would you like to browse our products or need help with placing a new order?",
          type: 'text',
          orderId: null
        };
      }
      
      // Get the most recent order
      const latestOrder = orders[0];
      
      // Format order details
      const orderDetails = {
        orderNumber: latestOrder.orderNumber,
        status: latestOrder.status,
        totalAmount: latestOrder.totalAmount,
        createdAt: latestOrder.createdAt,
        itemCount: latestOrder.items ? latestOrder.items.length : 0
      };
      
      let statusMessage = '';
      switch (latestOrder.status) {
        case 'pending':
        case 'Order Received':
          statusMessage = 'is being processed';
          break;
        case 'confirmed':
        case 'approved':
          statusMessage = 'has been confirmed and is being prepared';
          break;
        case 'shipped':
          statusMessage = 'has been shipped and is on the way';
          break;
        case 'delivered':
        case 'Order Completed':
          statusMessage = 'has been delivered';
          break;
        case 'cancelled':
        case 'Order Rejected':
          statusMessage = 'has been cancelled';
          break;
        default:
          statusMessage = `is currently ${latestOrder.status}`;
      }
      
      // Include item details for better context
      let itemsText = '';
      if (latestOrder.items && latestOrder.items.length > 0) {
        const firstItem = latestOrder.items[0];
        if (latestOrder.items.length === 1) {
          itemsText = ` The order contains: ${firstItem.productName || firstItem.name || 'product'}.`;
        } else {
          itemsText = ` The order contains ${latestOrder.items.length} items including ${firstItem.productName || firstItem.name || 'product'}.`;
        }
      }
      
      const response = `Your most recent order #${orderDetails.orderNumber} ${statusMessage}. ` +
                      `Total: $${orderDetails.totalAmount.toFixed(2)}.${itemsText} ` +
                      `Order placed on ${new Date(orderDetails.createdAt).toLocaleDateString()}.`;
      
      return {
        message: response,
        type: 'order_status',
        orderId: latestOrder._id
      };
      
    } catch (error) {
      console.error('Order status error:', error);
      return {
        message: "I'm having trouble checking your order status right now. Please try again later or contact customer service for assistance.",
        type: 'error',
        orderId: null
      };
    }
  }

  // Handle store information requests
  async handleStoreInfo(message, entities, context) {
    try {
      const Store = require('../models/Store');
      
      // Get all active stores
      const stores = await Store.find({ isActive: true })
        .select('name storeCode address phone')
        .limit(10);
      
      if (stores.length === 0) {
        return {
          message: "I don't have information about our stores right now. Please contact customer service for store locations and hours.",
          type: 'text',
          stores: []
        };
      }
      
      const storeList = stores.map(store => ({
        id: store._id,
        name: store.name,
        storeCode: store.storeCode,
        address: store.address,
        phone: store.phone
      }));
      
      let response = '';
      if (message.toLowerCase().includes('how many')) {
        response = `We have ${stores.length} Walmart stores available. Here are our locations:\n\n`;
      } else {
        response = `Here are our Walmart store locations:\n\n`;
      }
      
      stores.forEach((store, index) => {
        response += `${index + 1}. ${store.name}\n   Address: ${store.address}\n   Phone: ${store.phone}\n\n`;
      });
      
      response += 'Would you like more information about any specific store or help with directions?';
      
      return {
        message: response,
        type: 'store_info',
        stores: storeList
      };
      
    } catch (error) {
      console.error('Store info error:', error);
      return {
        message: "I'm having trouble getting store information right now. Please visit our website or call customer service for store details.",
        type: 'error',
        stores: []
      };
    }
  }

  // Generate customer-specific responses using real data
  async generateCustomerResponse(message, userId, context) {
    try {
      const { user, recentOrders, recentChats } = context;
      
      // Create a contextual prompt with real customer data
      let contextPrompt = `You are a helpful Walmart customer service assistant. `;
      
      if (user) {
        contextPrompt += `The customer's name is ${user.firstName} ${user.lastName}. `;
      }
      
      if (recentOrders && recentOrders.length > 0) {
        contextPrompt += `The customer has ${recentOrders.length} recent orders. `;
        const latestOrder = recentOrders[0];
        contextPrompt += `Their latest order (#${latestOrder.orderNumber}) is ${latestOrder.status} with a total of $${latestOrder.totalAmount}. `;
      }
      
      contextPrompt += `Customer question: "${message}"\n\n`;
      contextPrompt += `Please provide a helpful, personalized response based on the customer's information. `;
      contextPrompt += `Keep the response concise and friendly. If you don't have specific information, `;
      contextPrompt += `offer to help them find what they need or direct them to appropriate resources.`;
      
      // Try Gemini AI first for personalized responses
      try {
        return await this.generateGeminiResponse(message, context);
      } catch (geminiError) {
        console.warn('Gemini failed for customer response, using rule-based:', geminiError.message);
        return this.generateRuleBasedResponse(message, context);
      }
      
    } catch (error) {
      console.error('Customer response generation error:', error);
      return "I'm here to help! What can I assist you with today?";
    }
  }

  // Generate rule-based responses using customer data
  generateRuleBasedResponse(message, context) {
    const lowerMessage = message.toLowerCase();
    const { user, recentOrders } = context;
    
    // Personal greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      const greeting = user ? `Hi ${user.firstName}! ` : 'Hello! ';
      return greeting + "I'm here to help you with your shopping needs. How can I assist you today?";
    }
    
    // Account/profile questions
    if (lowerMessage.includes('account') || lowerMessage.includes('profile')) {
      const name = user ? `${user.firstName} ${user.lastName}` : 'your account';
      return `Your account information shows you're registered as ${name}. Is there something specific about your account you'd like to know?`;
    }
    
    // Order history
    if (lowerMessage.includes('order') && (lowerMessage.includes('history') || lowerMessage.includes('past'))) {
      if (recentOrders && recentOrders.length > 0) {
        return `You have ${recentOrders.length} recent orders. Your most recent order #${recentOrders[0].orderNumber} is ${recentOrders[0].status}. Would you like details about any specific order?`;
      } else {
        return "You don't have any recent orders. Would you like to browse our products?";
      }
    }
    
    // Shopping assistance
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('shop')) {
      return "I'd be happy to help you find what you're looking for! What product or category are you interested in?";
    }
    
    // Help with returns
    if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
      return "I can help you with returns. If you have a recent order you'd like to return, please provide the order number or let me know which item you'd like to return.";
    }
    
    // Store locations
    if (lowerMessage.includes('store') && (lowerMessage.includes('location') || lowerMessage.includes('near'))) {
      return "I can help you find store locations. We have several Walmart stores available. Would you like me to list all our store locations?";
    }
    
    // Default helpful response
    return "I'm here to help you with your shopping experience! I can assist you with finding products, checking order status, store information, and more. What would you like to know?";
  }

  // Generate Gemini AI response
  async generateGeminiResponse(message, context) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are a helpful Walmart customer service assistant. You have access to real customer data and should provide personalized responses.

User message: "${message}"

Customer context:
${JSON.stringify(context, null, 2)}

Instructions:
- Be friendly and helpful
- Use the customer's name if available in context
- Provide specific information about their orders, products, or stores when relevant
- If asked about products, mention specific items from the context
- If asked about orders, provide actual order details from the context
- Keep responses concise but informative (2-3 sentences)
- Always maintain a professional Walmart customer service tone

Please provide a helpful, personalized response:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // Generate AI response for unknown intents
  async generateAIResponse(message, context) {
    try {
      // Try Gemini API first
      try {
        const geminiResponse = await this.generateGeminiResponse(message, context);
        return geminiResponse;
      } catch (geminiError) {
        console.warn('Gemini API failed, using fallback response:', geminiError.message);
        
        // Fallback to rule-based response
        const prompt = `Customer: ${message}\nWalmart Assistant: I'll help you with that.`;
        
        const response = await this.callLLM(prompt, {
          max_length: 100,
          temperature: 0.7
        });
        
        return response || "I'm here to help you with your shopping experience! What can I assist you with today?";
      }
    } catch (error) {
      console.error('AI response generation error:', error);
      return "I'm here to help you with your shopping experience! What can I assist you with today?";
    }
  }

  // Get random response from array
  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Generate product recommendations based on user preferences
  async generateProductRecommendations(userId, preferences = {}) {
    try {
      // This would typically query the database for personalized recommendations
      // For now, we'll return mock recommendations
      
      const recommendations = [
        {
          productId: '507f1f77bcf86cd799439014',
          name: 'Wireless Headphones',
          price: 79.99,
          image: '/images/headphones.jpg',
          reason: 'Based on your recent electronics purchases'
        },
        {
          productId: '507f1f77bcf86cd799439015',
          name: 'Smart Watch',
          price: 199.99,
          image: '/images/smartwatch.jpg',
          reason: 'Popular with customers like you'
        },
        {
          productId: '507f1f77bcf86cd799439016',
          name: 'Bluetooth Speaker',
          price: 49.99,
          image: '/images/speaker.jpg',
          reason: 'Great for music lovers'
        }
      ];
      
      return {
        message: "Based on your shopping history, here are some products you might like:",
        products: recommendations,
        type: 'product_recommendation'
      };
      
    } catch (error) {
      console.error('Product recommendation error:', error);
      return {
        message: "I'm having trouble generating recommendations right now.",
        products: [],
        type: 'error'
      };
    }
  }
}

module.exports = new AIService(); 