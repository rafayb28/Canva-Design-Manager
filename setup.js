#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎨 Canva Connect API Setup\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. This will overwrite it.\n');
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    console.log('Please provide your Canva Connect API credentials:\n');
    
    const clientId = await question('Canva Client ID: ');
    const clientSecret = await question('Canva Client Secret: ');
    
    const port = await question('Server Port (default: 3001): ') || '3001';
    const frontendUrl = await question('Frontend URL (default: http://127.0.0.1:3001): ') || 'http://127.0.0.1:3001';
    
    // Create .env content
    const envContent = `# Canva Connect API Configuration
CANVA_CLIENT_ID=${clientId}
CANVA_CLIENT_SECRET=${clientSecret}

# Canva API URLs
CANVA_API_BASE_URL=https://api.canva.com
CANVA_AUTH_BASE_URL=https://www.canva.com

# Server Configuration
PORT=${port}
FRONTEND_URL=${frontendUrl}

# Environment
NODE_ENV=development
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Configuration saved to .env file!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure your Canva integration is configured with:');
    console.log(`   - Redirect URL: ${frontendUrl.replace('3001', '3001')}/oauth/callback`);
    console.log(`   - Return URL: ${frontendUrl.replace('3001', '3001')}/return-nav`);
    console.log('2. Run: npm start');
    console.log(`3. Open: ${frontendUrl}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 