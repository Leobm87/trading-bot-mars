const fs = require('fs');
const path = require('path');

// Import the apex service directly (ESM)
async function importApexService() {
  const { ApexService } = await import('../../services/firms/apex/index.js');
  return ApexService;
}

describe('End-to-end real: Apex pipeline completo', () => {
  let apexService;
  
  beforeAll(async () => {
    // Cargar .env si existe
    try {
      const envPath = path.join(__dirname, '../..', '.env');
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
    
    const ApexService = await importApexService();
    apexService = new ApexService();
    await apexService.init();
  }, 30000);

  test('Golden64: todas las queries deben devolver FAQ_ID esperado con margin>=0.12', async () => {
    const goldenPath = path.join(__dirname, '../..', 'tests/golden/apex.jsonl');
    const lines = fs.readFileSync(goldenPath, 'utf8').trim().split('\n');
    
    expect(lines.length).toBe(64);
    
    const results = [];
    let exactMatches = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const testCase = JSON.parse(lines[i]);
      const { q, expected_faq_id } = testCase;
      
      const result = await apexService.processQuery(q);
      
      // Assert estructura
      expect(result).toHaveProperty('type');
      expect(['FAQ_ID', 'NONE']).toContain(result.type);
      
      if (result.type === 'FAQ_ID') {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('margin');
        
        // Assert margin >= 0.12 para casos exitosos
        expect(result.margin).toBeGreaterThanOrEqual(0.12);
        
        if (result.id === expected_faq_id) {
          exactMatches++;
        } else {
          console.log(`❌ Mismatch línea ${i+1}: esperado ${expected_faq_id}, obtuvo ${result.id}`);
          console.log(`   Query: "${q}"`);
        }
      } else {
        console.log(`❌ NONE línea ${i+1}: esperado ${expected_faq_id}, obtuvo NONE`);
        console.log(`   Query: "${q}"`);
      }
      
      results.push({
        line: i + 1,
        query: q,
        expected: expected_faq_id,
        actual: result.type === 'FAQ_ID' ? result.id : 'NONE',
        margin: result.margin || 0
      });
    }
    
    const exactAt1 = exactMatches / lines.length;
    console.log(`📊 Exact@1: ${exactMatches}/${lines.length} = ${exactAt1.toFixed(4)}`);
    
    // ASSERT CRÍTICO: Exact@1 = 1.00
    expect(exactAt1).toBe(1.0);
    
  }, 120000);
});