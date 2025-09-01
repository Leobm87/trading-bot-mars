const { retrieveTopK } = require('../../services/common/retriever.cjs');
const { gateIntent } = require('../../services/common/intent-gate.cjs');

// Mock supabase with known safety_net FAQs
const mockSupabase = {
  rpc: async (fn, params) => {
    if (fn === 'faq_retrieve_es_v2') {
      return {
        data: [
          {
            id: 'a0efa7bb-7219-41d7-8317-55e3fd3c9f0c',
            slug: 'apex.risk.safety_net.withdrawals',
            title: 'Safety Net para retiros',
            question: 'Umbral mínimo para retiros',
            answer_md: 'Safety net específico para poder retirar',
            score: 0.85,
            aliases: 'safety net para retirar, umbral retiro'
          },
          {
            id: 'b8cae97b-9fa7-48cb-895b-cfbb81720724', 
            slug: 'apex.risk.safety_net.general',
            title: 'Safety Net general',
            question: 'Colchón de seguridad en cuentas',
            answer_md: 'Safety net general para trading',
            score: 0.80,
            aliases: 'colchon seguridad, proteccion trading'
          },
          {
            id: '4d45a7ec-0812-48cf-b9f0-117f42158615',
            slug: 'apex.payout.min_withdrawal', 
            title: 'Mínimo retiro',
            question: 'Cuál es el mínimo para retirar',
            answer_md: '$500 mínimo para primer retiro',
            score: 0.75,
            aliases: 'minimo retiro, primer payout'
          }
        ]
      };
    }
    return { data: [] };
  }
};

const mockEmbedText = async () => [0.1, 0.2, 0.3];

describe('APEX Demotes - No ambiguedad con palabras retiro', () => {
  test('Con palabras retiro, safety_net.* NO debe quedar Top-1', async () => {
    const queries = [
      'safety net para retiro',
      'umbral para retirar dinero', 
      'colchon withdrawal',
      'threshold para payout'
    ];

    for (const query of queries) {
      const cats = gateIntent(query);
      const results = await retrieveTopK(mockSupabase, query, 'apex', cats, mockEmbedText);
      
      // El Top-1 NO debe ser ningún safety_net.*
      const top1 = results[0];
      expect(top1.slug).not.toMatch(/safety_net/);
      
      // Debe ser min_withdrawal o similar
      expect(['apex.payout.min_withdrawal', 'apex.risk.safety_net.withdrawals']).toContain(top1.slug);
    }
  });

  test('Sin palabras retiro, safety_net general puede estar Top-1', async () => {
    const queries = [
      'safety net apex',
      'colchon de seguridad',
      'proteccion cuenta'
    ];

    for (const query of queries) {
      const cats = gateIntent(query);
      const results = await retrieveTopK(mockSupabase, query, 'apex', cats, mockEmbedText);
      
      // Top-1 puede ser safety_net general
      const top1 = results[0];
      expect(top1).toBeDefined();
      // No necesariamente safety_net, pero si sale, debe ser general
      if (top1.slug.includes('safety_net')) {
        expect(top1.slug).toBe('apex.risk.safety_net.general');
      }
    }
  });
});