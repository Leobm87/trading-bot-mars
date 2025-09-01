describe('APEX Withdrawals E2E Tests', () => {
  let processQueryFirm;
  
  beforeAll(async () => {
    const apexModule = await import('../../services/firms/apex/index.js');
    processQueryFirm = apexModule.processQueryFirm;
  });
  const WITHDRAWAL_QUERIES = [
    'primer retiro',
    'minimo retiro apex', 
    'payouts apex',
    'safety net para retirar',
    'monto minimo retirar'
  ];

  const EXPECTED_FAQS = [
    '385d0f21-fee7-4acb-9f69-a70051e3ad38', // primer retiro / minimos
    '4d45a7ec-0812-48cf-b9f0-117f42158615', // frecuencia payouts
    'da173bf4-8852-4ffc-847f-67486bf3ffd7'  // safety net thresholds
  ];

  test.each(WITHDRAWAL_QUERIES)('query "%s" should hit expected FAQ with margin >= 0.12', async (query) => {
    const result = await processQueryFirm(query);
    
    expect(result).toBeDefined();
    expect(result.source).toBe('db');
    expect(EXPECTED_FAQS).toContain(result.faq_id);
    
    // Verificar que la respuesta no sea "NONE" o fallback
    expect(result.faq_id).not.toBe('NONE');
    expect(result).toHaveProperty('answer_md');
    expect(result.answer_md).toContain('$'); // withdrawal amounts expected
  });

  test('withdrawal queries should have consistent selector margin', async () => {
    let totalMargin = 0;
    let queryCount = 0;

    for (const query of WITHDRAWAL_QUERIES) {
      const result = await processQueryFirm(query);
      
      if (result.source === 'db' && result.selector_margin) {
        totalMargin += result.selector_margin;
        queryCount++;
      }
    }

    const avgMargin = totalMargin / queryCount;
    expect(avgMargin).toBeGreaterThanOrEqual(0.12);
  });

  test('withdrawals_hit_rate validation', async () => {
    let hits = 0;
    
    for (const query of WITHDRAWAL_QUERIES) {
      const result = await processQueryFirm(query);
      
      if (result.source === 'db' && EXPECTED_FAQS.includes(result.faq_id)) {
        hits++;
      }
    }
    
    const hitRate = hits / WITHDRAWAL_QUERIES.length;
    
    // Log withdrawals hit rate for reporting
    console.log(`withdrawals_hit_rate: ${hits}/${WITHDRAWAL_QUERIES.length} = ${hitRate.toFixed(2)}`);
    
    expect(hitRate).toBeGreaterThanOrEqual(0.8); // At least 80% hit rate expected
  });
});