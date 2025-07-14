const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test basic customer functionality
async function testCustomerBasic() {
  try {
    console.log('🧪 Testing Basic Customer Functionality...\n');

    // Step 1: Customer Registration
    console.log('1️⃣ Customer Registration...');
    const registerData = {
      email: 'basiccustomer@example.com',
      password: 'password123',
      role: 'customer',
      firstName: 'Basic',
      lastName: 'Customer',
      phone: '1234567890'
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    const customerToken = registerResponse.data.data.token;
    console.log('🔑 Token received:', customerToken ? 'Yes' : 'No');

    // Step 2: Customer Login
    console.log('\n2️⃣ Customer Login...');
    const loginData = {
      email: 'basiccustomer@example.com',
      password: 'password123',
      role: 'customer'
    };

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', loginResponse.data.message);
    const loginToken = loginResponse.data.data.token;

    // Step 3: Get Stores (Customer Dashboard)
    console.log('\n3️⃣ Getting Stores for Customer Dashboard...');
    const storesResponse = await axios.get(`${API_BASE_URL}/customer/stores`, {
      headers: {
        'Authorization': `Bearer ${loginToken}`
      }
    });
    console.log('✅ Stores retrieved successfully:', storesResponse.data.message);
    console.log('🏪 Number of stores:', storesResponse.data.data.length);
    
    // Display all stores
    storesResponse.data.data.forEach((store, index) => {
      console.log(`🏪 Store ${index + 1}:`, {
        id: store._id,
        name: store.name,
        storeCode: store.storeCode,
        address: store.address
      });
    });

    // Step 4: Get Customer Orders (should be empty initially)
    console.log('\n4️⃣ Getting Customer Orders...');
    const ordersResponse = await axios.get(`${API_BASE_URL}/customer/orders`, {
      headers: {
        'Authorization': `Bearer ${loginToken}`
      }
    });
    console.log('✅ Orders retrieved successfully:', ordersResponse.data.message);
    console.log('📋 Number of orders:', ordersResponse.data.data.orders.length);

    console.log('\n🎉 Basic Customer Functionality Test Passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Customer registration works');
    console.log('   ✅ Customer login works');
    console.log('   ✅ Store listing works');
    console.log('   ✅ Order history works (empty initially)');
    console.log('\n🚀 Customer Dashboard is ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 This might be because the user already exists. Try with a different email.');
    }
  }
}

// Run the test
testCustomerBasic(); 