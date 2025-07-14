const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testStoreProducts() {
  console.log('🧪 Testing Store Products Association...\n');

  try {
    // Step 0: Authenticate as customer
    console.log('0️⃣ Authenticating as customer...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'kartik@gmail.com',
      password: '123456',
      role: 'customer'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Authentication failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Authentication successful');

    // Step 1: Get all stores
    console.log('\n1️⃣ Getting all stores...');
    const storesResponse = await axios.get(`${API_BASE}/customer/stores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (storesResponse.data.success) {
      const stores = storesResponse.data.data;
      console.log(`✅ Found ${stores.length} stores:`);
      stores.forEach(store => {
        console.log(`   - ${store.name} (ID: ${store._id})`);
      });

      // Step 2: Test products for each store
      for (const store of stores) {
        console.log(`\n2️⃣ Testing products for store: ${store.name}`);
        
        try {
          const productsResponse = await axios.get(`${API_BASE}/customer/stores/${store._id}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (productsResponse.data.success) {
            const products = productsResponse.data.data.products;
            console.log(`   ✅ Found ${products.length} products in ${store.name}:`);
            
            if (products.length > 0) {
              products.slice(0, 3).forEach(product => {
                console.log(`      - ${product.name} ($${product.price}) - Stock: ${product.stock}`);
              });
              if (products.length > 3) {
                console.log(`      ... and ${products.length - 3} more products`);
              }
            } else {
              console.log(`   ⚠️  No products found in ${store.name}`);
            }
          } else {
            console.log(`   ❌ Failed to get products for ${store.name}:`, productsResponse.data.message);
          }
        } catch (error) {
          console.log(`   ❌ Error getting products for ${store.name}:`, error.response?.data?.message || error.message);
        }
      }

      // Step 3: Check all products in database
      console.log('\n3️⃣ Checking all products in database...');
      try {
        const allProductsResponse = await axios.get(`${API_BASE}/customer/stores/${stores[0]._id}/products?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (allProductsResponse.data.success) {
          const allProducts = allProductsResponse.data.data.products;
          console.log(`   📊 Total products in database: ${allProducts.length}`);
          
          // Group products by store
          const storeProductCounts = {};
          stores.forEach(store => {
            storeProductCounts[store.name] = 0;
          });
          
          allProducts.forEach(product => {
            if (product.storeIds && Array.isArray(product.storeIds)) {
              product.storeIds.forEach(storeId => {
                const store = stores.find(s => s._id === storeId);
                if (store) {
                  storeProductCounts[store.name]++;
                }
              });
            }
          });
          
          console.log('   📈 Products per store:');
          Object.entries(storeProductCounts).forEach(([storeName, count]) => {
            console.log(`      - ${storeName}: ${count} products`);
          });
        }
      } catch (error) {
        console.log('   ❌ Error checking all products:', error.response?.data?.message || error.message);
      }

    } else {
      console.log('❌ Failed to get stores:', storesResponse.data.message);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testStoreProducts(); 