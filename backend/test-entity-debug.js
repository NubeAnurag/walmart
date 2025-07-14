const mongoose = require('mongoose');
const ChatMessage = require('./models/ChatMessage');

async function testEntityHandling() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://anuragmandal50:WarMart12@cluster0.od4oyep.mongodb.net/walmart_digital_revolution?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');

    // Test 1: Create entities correctly
    const testEntities = [
      { type: 'category', value: 'electronics' },
      { type: 'product', value: 'laptop' }
    ];
    
    console.log('🔍 Test entities:', testEntities);
    console.log('🔍 Is array:', Array.isArray(testEntities));
    console.log('🔍 Type:', typeof testEntities);

    // Test creating ChatMessage with correct entities
    console.log('\n📝 Testing ChatMessage creation with proper entities...');
    
    const testMessage = new ChatMessage({
      userId: new mongoose.Types.ObjectId(),
      sessionId: 'test_session_123',
      message: 'Test message',
      sender: 'bot',
      messageType: 'text',
      metadata: {
        intent: 'product_search',
        confidence: 0.9,
        entities: testEntities,
        responseTime: 100
      }
    });
    
    console.log('🔍 Before save - entities:', testMessage.metadata.entities);
    console.log('🔍 Before save - entities type:', typeof testMessage.metadata.entities);
    console.log('🔍 Before save - is array:', Array.isArray(testMessage.metadata.entities));
    
    await testMessage.save();
    console.log('✅ ChatMessage saved successfully with proper entities');
    
    // Test 2: Test with stringified entities (simulating the error)
    console.log('\n📝 Testing with stringified entities (simulating error)...');
    
    const stringifiedEntities = JSON.stringify(testEntities);
    console.log('🔍 Stringified entities:', stringifiedEntities);
    console.log('🔍 Type:', typeof stringifiedEntities);
    
    try {
      const testMessage2 = new ChatMessage({
        userId: new mongoose.Types.ObjectId(),
        sessionId: 'test_session_456',
        message: 'Test message 2',
        sender: 'bot',
        messageType: 'text',
        metadata: {
          intent: 'product_search',
          confidence: 0.9,
          entities: stringifiedEntities, // This should fail
          responseTime: 100
        }
      });
      
      await testMessage2.save();
      console.log('❌ This should not have succeeded!');
      
    } catch (error) {
      console.log('✅ Expected error with stringified entities:', error.message);
    }
    
    // Test 3: Test with array containing string (simulating the actual error)
    console.log('\n📝 Testing with array containing stringified entities...');
    
    try {
      const testMessage3 = new ChatMessage({
        userId: new mongoose.Types.ObjectId(),
        sessionId: 'test_session_789',
        message: 'Test message 3',
        sender: 'bot',
        messageType: 'text',
        metadata: {
          intent: 'product_search',
          confidence: 0.9,
          entities: [stringifiedEntities], // Array containing string - this mimics the actual error
          responseTime: 100
        }
      });
      
      console.log('🔍 Test 3 - entities:', testMessage3.metadata.entities);
      console.log('🔍 Test 3 - entities[0]:', testMessage3.metadata.entities[0]);
      console.log('🔍 Test 3 - entities[0] type:', typeof testMessage3.metadata.entities[0]);
      
      await testMessage3.save();
      console.log('❌ This should not have succeeded!');
      
    } catch (error) {
      console.log('✅ Expected error with array containing string:', error.message);
      console.log('🔍 This matches our actual error pattern!');
    }
    
    // Test 4: Test correct parsing from string
    console.log('\n📝 Testing correct parsing from stringified entities...');
    
    const parsedEntities = JSON.parse(stringifiedEntities);
    console.log('🔍 Parsed entities:', parsedEntities);
    console.log('🔍 Is array:', Array.isArray(parsedEntities));
    
    const testMessage4 = new ChatMessage({
      userId: new mongoose.Types.ObjectId(),
      sessionId: 'test_session_999',
      message: 'Test message 4',
      sender: 'bot',
      messageType: 'text',
      metadata: {
        intent: 'product_search',
        confidence: 0.9,
        entities: parsedEntities, // Properly parsed
        responseTime: 100
      }
    });
    
    await testMessage4.save();
    console.log('✅ ChatMessage saved successfully with parsed entities');
    
    console.log('\n🎉 Entity handling tests completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Proper entities array works');
    console.log('❌ Stringified entities fail (as expected)');
    console.log('❌ Array containing stringified entities fail (this is our bug!)');
    console.log('✅ Properly parsed entities work');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testEntityHandling(); 