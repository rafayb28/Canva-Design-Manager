const http = require('http');
const https = require('https');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test_user_123';

// Helper function to make HTTP requests
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `user_id=${TEST_USER_ID}`,
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let jsonData;
        try {
          jsonData = JSON.parse(data);
        } catch (e) {
          jsonData = { raw: data };
        }
        
        console.log(`\n🔗 ${requestOptions.method} ${endpoint}`);
        console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
        
        resolve({ response: res, data: jsonData });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  await makeRequest('/health');
}

async function testUnauthenticatedRequests() {
  console.log('\n🚫 Testing Unauthenticated Requests...');
  
  // Test folder listing without auth
  await makeRequest('/api/folders/list-folders', {
    headers: { 'Cookie': '' } // No cookie
  });
  
  // Test design listing without auth
  await makeRequest('/api/designs/list-designs', {
    headers: { 'Cookie': '' } // No cookie
  });
}

async function testLegacyEndpoints() {
  console.log('\n🔄 Testing Legacy Endpoints...');
  
  // Test legacy user endpoint
  await makeRequest('/api/user');
  
  // Test legacy designs endpoint
  await makeRequest('/api/designs');
  
  // Test assets endpoint
  await makeRequest('/api/assets');
}

async function testNewEndpoints() {
  console.log('\n✨ Testing New Modular Endpoints...');
  
  // Test folder listing with pagination
  await makeRequest('/api/folders/list-folders?limit=10');
  
  // Test design listing with pagination
  await makeRequest('/api/designs/list-designs?limit=10');
  
  // Test design listing with filters
  await makeRequest('/api/designs/list-designs?limit=5&type=presentation');
  
  // Test specific folder contents (will likely return 404 if folder doesn't exist)
  await makeRequest('/api/folders/test-folder-id/contents?limit=5');
  
  // Test specific design (will likely return 404 if design doesn't exist)
  await makeRequest('/api/designs/test-design-id');
}

async function testOAuthFlow() {
  console.log('\n🔐 Testing OAuth Flow...');
  
  // Test OAuth redirect
  const redirectResponse = await makeRequest('/oauth/redirect');
  console.log(`\n🔗 GET /oauth/redirect`);
  console.log(`📊 Status: ${redirectResponse.response.statusCode} ${redirectResponse.response.statusMessage}`);
  console.log(`📍 Redirect Location: ${redirectResponse.response.headers.location}`);
}

async function runAllTests() {
  console.log('🧪 Starting Backend Endpoint Tests...');
  console.log('=' .repeat(50));
  
  try {
    await testHealthCheck();
    await testUnauthenticatedRequests();
    await testLegacyEndpoints();
    await testNewEndpoints();
    await testOAuthFlow();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('- Health check should return 200 OK');
    console.log('- Unauthenticated requests should return 401 Unauthorized');
    console.log('- Legacy endpoints should work with proper authentication');
    console.log('- New endpoints should return proper pagination structure');
    console.log('- OAuth redirect should return 302 redirect to Canva');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  makeRequest,
  testHealthCheck,
  testUnauthenticatedRequests,
  testLegacyEndpoints,
  testNewEndpoints,
  testOAuthFlow,
  runAllTests
}; 