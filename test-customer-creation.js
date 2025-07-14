const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function createTestCustomer() {
  console.log('🧪 Creating test customer account...\n');

  try {
    // Step 1: Create customer account
    console.log('1️⃣ Creating customer account...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      email: 'kartik@gmail.com',
      password: '123456',
      firstName: 'Kartik',
      lastName: 'Customer',
      role: 'customer'
    });

    console.log('📥 Register response:', JSON.stringify(registerResponse.data, null, 2));

    if (registerResponse.data.success) {
      console.log('✅ Customer account created successfully!');
      console.log('👤 User ID:', registerResponse.data.data.user._id);
      console.log('📧 Email:', registerResponse.data.data.user.email);
      console.log('🎭 Role:', registerResponse.data.data.user.role);
    } else {
      console.log('❌ Registration failed:', registerResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Registration error:', error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

createTestCustomer(); 