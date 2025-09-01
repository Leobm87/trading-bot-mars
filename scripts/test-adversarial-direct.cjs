#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testAdversarial() {
  const adversarialPath = path.join(__dirname, '..', 'tests', 'golden', 'apex_conflicts.adversarial.jsonl');
  const lines = fs.readFileSync(adversarialPath, 'utf8').trim().split('\n');
  
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
  
  const ApexServiceModule = await import(`../services/firms/apex/index.js?t=${Date.now()}`);
  const ApexService = ApexServiceModule.default;
  
  const apexService = new ApexService();
  await apexService.initialize();
  
  let exactMatches = 0;
  let total = 0;
  
  console.log('=== TEST ADVERSARIAL CONFLICTS ===\n');
  
  for (const line of lines) {
    const { q, expected_faq_id, intent } = JSON.parse(line);
    const result = await apexService.processQuery(q);
    
    total++;
    const success = result.ok && result.faq_id === expected_faq_id;
    
    if (success) {
      exactMatches++;
      console.log(`✅ "${q}" → ${intent} (${expected_faq_id})`);
    } else {
      console.log(`❌ "${q}" → ${intent}`);
      console.log(`   Expected: ${expected_faq_id}`);
      console.log(`   Got: ${result.ok ? result.faq_id : 'ERROR'}`);
    }
  }
  
  const adversarialExact = exactMatches / total;
  
  console.log(`\n📊 ADVERSARIAL EXACT: ${adversarialExact.toFixed(4)} (${exactMatches}/${total})`);
  
  return adversarialExact;
}

testAdversarial().catch(console.error);