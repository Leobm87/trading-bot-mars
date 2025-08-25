const { spawn } = require('child_process');

console.log('Starting MARS Services...');
console.log('Environment check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING'
});

// Fix: Use correct file paths
const apex = spawn('node', ['services/firms/apex/index.js'], { 
  stdio: 'inherit',
  env: process.env 
});

const router = spawn('node', ['services/router/index.js'], { 
  stdio: 'inherit',
  env: process.env 
});

const gateway = spawn('node', ['services/gateway/gateway.js'], { 
  stdio: 'inherit',
  env: process.env 
});

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down services...');
  apex.kill();
  router.kill();
  gateway.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down services...');
  apex.kill();
  router.kill();
  gateway.kill();
  process.exit();
});

console.log('Starting MARS Trading Bot Services...');
console.log('- ApexService on port 3001');
console.log('- Router on port 3000');
console.log('- Gateway with Telegram Bot');