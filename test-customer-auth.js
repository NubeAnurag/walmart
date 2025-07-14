const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test customer registration and login
async function testCustomerAuth() {
  try {
    console.log('🧪 Testing Customer Authentication...\n');

    // Test 1: Customer Registration
    console.log('1️⃣ Testing Customer Registration...');
    const registerData = {
      email: 'newcustomer@example.com',
      password: 'password123',
      role: 'customer',
      firstName: 'New',
      lastName: 'Customer',
      phone: '1234567890'
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('👤 User created:', {
      id: registerResponse.data.data.user._id,
      email: registerResponse.data.data.user.email,
      role: registerResponse.data.data.user.role,
      firstName: registerResponse.data.data.user.firstName,
      lastName: registerResponse.data.data.user.lastName
    });

    // Test 2: Customer Login
    console.log('\n2️⃣ Testing Customer Login...');
    const loginData = {
      email: 'newcustomer@example.com',
      password: 'password123',
      role: 'customer'
    };

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('🔑 Token received:', loginResponse.data.data.token ? 'Yes' : 'No');
    console.log('👤 User logged in:', {
      id: loginResponse.data.data.user._id,
      email: loginResponse.data.data.user.email,
      role: loginResponse.data.data.user.role
    });

    // Test 3: Verify Token
    console.log('\n3️⃣ Testing Token Verification...');
    const token = loginResponse.data.data.token;
    const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Token verification successful:', verifyResponse.data.message);

    // Test 4: Test Customer Dashboard Access
    console.log('\n4️⃣ Testing Customer Dashboard Access...');
    const customerResponse = await axios.get(`${API_BASE_URL}/customer/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Customer dashboard access successful:', customerResponse.data.message);

    console.log('\n🎉 All customer authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Customer registration works');
    console.log('   ✅ Customer login works');
    console.log('   ✅ Token verification works');
    console.log('   ✅ Customer dashboard access works');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 This might be because the user already exists. Try with a different email.');
    }
  }
}

// Run the test
testCustomerAuth(); 