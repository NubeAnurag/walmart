const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testCustomerLoginRedirect() {
  console.log('🧪 Testing Customer Login with Forced Redirect...\n');

  try {
    // Step 1: Test customer login
    console.log('1️⃣ Testing customer login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'kartik@gmail.com',
      password: '123456',
      role: 'customer'
    });

    console.log('📥 Login response:', JSON.stringify(loginResponse.data, null, 2));

    if (loginResponse.data.success) {
      console.log('✅ Customer login successful!');
      console.log('👤 User:', loginResponse.data.data.user.email);
      console.log('🎭 Role:', loginResponse.data.data.user.role);
      console.log('🔑 Token received:', loginResponse.data.data.token ? 'YES' : 'NO');
      
      // Step 2: Test if we can access customer dashboard with the token
      console.log('\n2️⃣ Testing customer dashboard access...');
      const token = loginResponse.data.data.token;
      
      try {
        const dashboardResponse = await axios.get(`${API_BASE}/customer/stores`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('✅ Dashboard access successful!');
        console.log('📊 Stores found:', dashboardResponse.data.data?.length || 0);
        
      } catch (dashboardError) {
        console.log('❌ Dashboard access failed:', dashboardError.response?.data?.message || dashboardError.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Login error:', error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testCustomerLoginRedirect(); 