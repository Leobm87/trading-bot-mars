/**
 * TEST DE COBERTURA SEMÁNTICA
 * Verifica que variantes coloquiales lleguen al FAQ correcto
 */

const { processQueryFirm } = require('../services/firms/apex/index.js');
const fs = require('fs');
const path = require('path');

// Cargar variantes generadas
const variantsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'test-variants', 'query-variants.json'), 'utf8')
);

// Grupos semánticos esperados (FAQ IDs correctos)
const EXPECTED_FAQ_MAPPINGS = {
  withdrawals: {
    keywords: ['retirar', 'sacar', 'cobrar', 'withdraw', 'payout', 'mínimo'],
    expected_faqs: [
      '07a149b0-1866-42f0-b5ff-1320a57cb7b7', // Retiros generales
      '1f60c8b8-7c67-4e3f-a90e-74a7f7bccf87', // Safety net
      '385d0f21-fee7-4acb-9f69-a70051e3ad38'  // Primer retiro
    ]
  },
  
  pricing: {
    keywords: ['precio', 'costo', 'cuánto cuesta', 'pagar', 'descuento'],
    expected_faqs: [
      'e2c1e76b-7c28-4f77-939e-16f646c3e9a8', // Precios
      'cf8e2d4f-9f6e-4f4e-b68c-0e3e7f2c7a28'  // Métodos de pago
    ]
  },
  
  rules: {
    keywords: ['regla', 'consistencia', 'overnight', 'drawdown'],
    expected_faqs: [
      '37e2f07f-70e9-476c-92f2-8d1c7c8e3f28', // Consistencia
      'e3c7f8e2-8c93-4e2f-b2f7-8c2f8e7c3e28'  // Overnight
    ]
  }
};

describe('Cobertura Semántica - APEX', () => {
  
  describe('Variantes de Withdrawals', () => {
    const withdrawalVariants = variantsData.all_variants
      .filter(v => v.category === 'withdrawals')
      .map(v => v.variant);
    
    test.each(withdrawalVariants.slice(0, 10))('Query: "%s"', async (query) => {
      const result = await processQueryFirm(query);
      
      // Verificar que encontró algo
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
      
      // Verificar que no es respuesta genérica
      expect(result.response).not.toContain('No encontré información');
      
      // Verificar que contiene keywords relacionados
      const hasRelevantContent = EXPECTED_FAQ_MAPPINGS.withdrawals.keywords.some(kw => 
        result.response.toLowerCase().includes(kw)
      );
      expect(hasRelevantContent).toBe(true);
      
      // Si tiene faq_id, verificar que es uno esperado
      if (result.faq_id) {
        const isExpectedFaq = EXPECTED_FAQ_MAPPINGS.withdrawals.expected_faqs.includes(result.faq_id);
        if (!isExpectedFaq) {
          console.log(`⚠️ FAQ inesperado para "${query}": ${result.faq_id}`);
        }
      }
    });
  });
  
  describe('Variantes Coloquiales Críticas', () => {
    const criticalQueries = [
      { query: 'como sacar dinero', category: 'withdrawals' },
      { query: 'como sacar plata', category: 'withdrawals' },
      { query: 'cuando puedo cobrar', category: 'withdrawals' },
      { query: 'primer payout minimo', category: 'withdrawals' },
      { query: 'safty net', category: 'withdrawals' }, // typo intencional
      { query: 'cuanto sale apex', category: 'pricing' },
      { query: 'hay consistensia?', category: 'rules' }, // typo
      { query: 'overnight permitido?', category: 'rules' }
    ];
    
    test.each(criticalQueries)('$query (categoria: $category)', async ({ query, category }) => {
      const result = await processQueryFirm(query);
      
      expect(result).toBeDefined();
      expect(result.ok).toBe(true);
      expect(result.response).not.toContain('No encontré información');
      
      // Verificar contenido relevante para la categoría
      const expectedKeywords = EXPECTED_FAQ_MAPPINGS[category].keywords;
      const hasRelevantContent = expectedKeywords.some(kw => 
        result.response.toLowerCase().includes(kw)
      );
      expect(hasRelevantContent).toBe(true);
    });
  });
  
  describe('Queries Ambiguas', () => {
    const ambiguousQueries = [
      'apex',
      'info',
      'ayuda',
      '?',
      'hola'
    ];
    
    test.each(ambiguousQueries)('Query ambigua: "%s"', async (query) => {
      const result = await processQueryFirm(query);
      
      expect(result).toBeDefined();
      
      // Para queries muy ambiguas, esperamos respuesta de "no encontrado" o clarificación
      if (result.response.includes('No encontré información')) {
        expect(result.response).toContain('específica');
      }
    });
  });
  
  describe('Análisis de Cobertura', () => {
    test('Resumen de cobertura semántica', async () => {
      const coverageResults = {
        total: 0,
        found: 0,
        not_found: 0,
        by_category: {}
      };
      
      // Probar muestra de cada categoría
      for (const category of ['withdrawals', 'pricing', 'rules']) {
        const variants = variantsData.all_variants
          .filter(v => v.category === category)
          .slice(0, 5)
          .map(v => v.variant);
        
        coverageResults.by_category[category] = {
          tested: variants.length,
          found: 0,
          not_found: 0
        };
        
        for (const query of variants) {
          coverageResults.total++;
          const result = await processQueryFirm(query);
          
          if (result && result.ok && !result.response.includes('No encontré información')) {
            coverageResults.found++;
            coverageResults.by_category[category].found++;
          } else {
            coverageResults.not_found++;
            coverageResults.by_category[category].not_found++;
          }
        }
      }
      
      // Calcular porcentajes
      coverageResults.coverage_percent = (coverageResults.found / coverageResults.total * 100).toFixed(2);
      
      // Guardar reporte
      const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'semantic-coverage-report.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(coverageResults, null, 2));
      
      console.log('\n📊 REPORTE DE COBERTURA SEMÁNTICA:');
      console.log(`Total queries testeadas: ${coverageResults.total}`);
      console.log(`Cobertura: ${coverageResults.coverage_percent}%`);
      console.log('\nPor categoría:');
      Object.entries(coverageResults.by_category).forEach(([cat, stats]) => {
        const catCoverage = (stats.found / stats.tested * 100).toFixed(2);
        console.log(`  ${cat}: ${catCoverage}% (${stats.found}/${stats.tested})`);
      });
      
      // Assertion para CI/CD
      expect(parseFloat(coverageResults.coverage_percent)).toBeGreaterThan(80);
    });
  });
});