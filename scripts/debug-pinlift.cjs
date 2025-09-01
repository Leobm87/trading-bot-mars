#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function debugPinlift() {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const lines = fs.readFileSync(goldenPath, 'utf8').trim().split('\n');
  
  // Cargar .env
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n').filter(line => line.includes('='));
      envVars.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        process.env[key] = value;
      });
    }
  } catch (e) {
    console.warn('Warning: .env not loaded:', e.message);
  }
  
  // Patchear apex service para PINNER_OFF
  const apexPath = path.join(__dirname, '..', 'services', 'firms', 'apex', 'index.js');
  const content = fs.readFileSync(apexPath, 'utf8');
  const patched = content.replace(
    'const pinId = resolvePin(\'apex\', query);',
    `const pinId = null; // PINNER_OFF for debugging`
  );
  fs.writeFileSync(apexPath, patched);
  
  try {
    const ApexServiceModule = await import(`../services/firms/apex/index.js?t=${Date.now()}`);
    const ApexService = ApexServiceModule.default;
    
    const apexService = new ApexService();
    await apexService.initialize();
    
    console.log('=== QUERIES QUE FALLAN SIN PINNER ===\n');
    
    for (const line of lines) {
      const { q, expected_faq_id } = JSON.parse(line);
      const result = await apexService.processQuery(q);
      
      if (!result.ok || result.faq_id !== expected_faq_id) {
        console.log(`FAIL: "${q}"`);
        console.log(`  Expected: ${expected_faq_id}`);
        console.log(`  Got: ${result.ok ? result.faq_id : 'ERROR'}`);
        console.log();
      }
    }
    
  } finally {
    // Restaurar
    fs.writeFileSync(apexPath, content);
  }
}

debugPinlift().catch(console.error);