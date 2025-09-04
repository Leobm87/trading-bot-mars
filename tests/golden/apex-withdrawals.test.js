// tests/golden/apex-withdrawals.test.js - Test new withdrawal queries
const { processQueryFirm } = require('../../services/firms/apex/index.js');

describe('APEX Withdrawal Queries - Fix for Production Issues', () => {
  describe('Issue 1: Colloquial withdrawal queries should work', () => {
    const withdrawalQueries = [
      { q: 'como puedo sacar dinero con apex?', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' },
      { q: 'como sacar dinero de apex', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' },
      { q: 'sacar fondos apex', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' },
      { q: 'cobrar dinero apex', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' },
      { q: 'como cobrar plata en apex', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' }
    ];

    test.each(withdrawalQueries)('should find FAQ for: "$q"', async ({ q, expectedFaqId }) => {
      const result = await processQueryFirm(q);
      expect(result.ok).toBe(true);
      expect(result.source).toBe('db');
      expect(result.faq_id).toBe(expectedFaqId);
    });
  });

  describe('Issue 2: Consistency rule should return specific info', () => {
    test('should return consistency-specific FAQ for "hay regla de consistencia con apex?"', async () => {
      const result = await processQueryFirm('hay regla de consistencia con apex?');
      expect(result.ok).toBe(true);
      expect(result.source).toBe('db');
      expect(result.faq_id).toBe('b8336088-d2ad-4bc0-9141-b46d516c7a32');
      
      // With RESPONSE_STYLE=short, should get concise answer
      if (process.env.RESPONSE_STYLE === 'short') {
        expect(result.response).toContain('30%');
        expect(result.response).toContain('El día de mayor profit');
        expect(result.response.length).toBeLessThan(500); // Should be concise
      }
    });

    test('should return consistency FAQ for "regla consistencia apex"', async () => {
      const result = await processQueryFirm('regla consistencia apex');
      expect(result.ok).toBe(true);
      expect(result.faq_id).toBe('b8336088-d2ad-4bc0-9141-b46d516c7a32');
    });
  });

  describe('Previously working queries should still work', () => {
    const existingQueries = [
      { q: 'como puedo retirar dinero con apex?', expectedFaqId: '07a149b0-1866-42f0-b5ff-1320a57cb7b7' },
      { q: 'primer retiro apex', expectedFaqId: '385d0f21-fee7-4acb-9f69-a70051e3ad38' },
      { q: 'safety net apex', expectedFaqId: 'b8cae97b-9fa7-48cb-895b-cfbb81720724' }
    ];

    test.each(existingQueries)('should still find FAQ for: "$q"', async ({ q, expectedFaqId }) => {
      const result = await processQueryFirm(q);
      expect(result.ok).toBe(true);
      expect(result.source).toBe('db');
      expect(result.faq_id).toBe(expectedFaqId);
    });
  });

  describe('Performance checks', () => {
    test('PIN-matched queries should be fast (<500ms)', async () => {
      const start = Date.now();
      const result = await processQueryFirm('sacar dinero apex');
      const elapsed = Date.now() - start;
      
      expect(result.ok).toBe(true);
      expect(elapsed).toBeLessThan(500);
    });

    test('Multiple queries should maintain low latency', async () => {
      const queries = [
        'sacar dinero apex',
        'regla consistencia',
        'primer retiro',
        'safety net apex'
      ];
      
      const latencies = [];
      for (const q of queries) {
        const start = Date.now();
        await processQueryFirm(q);
        latencies.push(Date.now() - start);
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avgLatency).toBeLessThan(400); // Average should be under 400ms
    });
  });
});