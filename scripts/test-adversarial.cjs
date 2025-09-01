#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function runAdversarial() {
  console.log('=== ADVERSARIAL TEST APEX ===');
  
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
  
  // Import apex service
  const ApexServiceModule = await import('../services/firms/apex/index.js');
  const ApexService = ApexServiceModule.default;
  
  const apexService = new ApexService();
  await apexService.initialize();
  
  // Load adversarial cases
  const adversarialPath = path.join(__dirname, '..', 'tests', 'golden', 'apex_conflicts.adversarial.jsonl');
  const lines = fs.readFileSync(adversarialPath, 'utf8').trim().split('\n');
  
  console.log(`📋 Casos adversariales: ${lines.length}`);
  
  let exactMatches = 0;
  const results = [];
  
  for (let i = 0; i < lines.length; i++) {
    const testCase = JSON.parse(lines[i]);
    const { q, expected_faq_id } = testCase;
    
    console.log(`\n${i+1}. Query: "${q}"`);
    console.log(`   Expected: ${expected_faq_id}`);
    
    const result = await apexService.processQuery(q);
    
    if (result.ok && result.faq_id === expected_faq_id) {
      console.log(`   ✅ Match: ${result.faq_id}`);
      exactMatches++;
    } else {
      console.log(`   ❌ Got: ${result.ok ? result.faq_id : 'NONE'}`);
    }
    
    results.push({
      query: q,
      expected: expected_faq_id,
      actual: result.ok ? result.faq_id : 'NONE',
      match: result.ok && result.faq_id === expected_faq_id
    });
  }
  
  const exactRate = exactMatches / lines.length;
  
  console.log(`\n📊 RESULTADO ADVERSARIAL:`);
  console.log(`   Exact@1: ${exactMatches}/${lines.length} = ${exactRate.toFixed(4)}`);
  
  if (exactRate === 1.0) {
    console.log('✅ ADVERSARIAL PASS: 100% exactitud');
  } else {
    console.log('❌ ADVERSARIAL FAIL: menos del 100%');
  }
  
  return exactRate;
}

if (require.main === module) {
  runAdversarial().catch(console.error);
}

module.exports = { runAdversarial };