/**
 * services/eval/runMcpE2E.cjs
 * Runner único E2E con MCP. Ejecuta el pipeline completo:
 * gate → retriever (MCP si disponible, fallback supabase-js) → pinner → re-rank → selector → format
 * 
 * DETERMINISMO FORZADO: LLM_SELECTOR_SHUFFLE=false, sin aleatoriedad
 */

require('dotenv').config();

// Forzar determinismo
process.env.LLM_SELECTOR_SHUFFLE = 'false';

const { createClient } = require('@supabase/supabase-js');

/**
 * Evalúa queries usando el pipeline E2E unificado
 * @param {Array} queries Array de objetos {q, expected_faq_id, intent}
 * @param {Object} options Opciones: {pinnerOff?: boolean}
 * @returns {Object} Resultados con métricas
 */
async function evalQueriesMcp(queries, options = {}) {
  const { pinnerOff = false } = options;
  
  // Crear instancia del servicio unificado
  const service = createUnifiedService();
  
  const results = [];
  const latencies = [];
  let hits = 0;
  const byIntent = {};
  const sources = [];
  const debugLog = [];

  for (const query of queries) {
    const { q, expected_faq_id, intent } = query;
    
    const t0 = Date.now();
    const response = await service.processQuery(q, { pinnerOff, debug: !!process.env.DEBUG_E2E });
    const latency = Date.now() - t0;

    const gotId = response?.faq_id;
    const hit = !!(gotId && expected_faq_id && gotId === expected_faq_id);
    
    if (hit) hits++;
    
    // Métricas por intent
    byIntent[intent] ||= { n: 0, hit: 0 };
    byIntent[intent].n++;
    if (hit) byIntent[intent].hit++;
    
    latencies.push(latency);
    sources.push(response?.source || 'none');
    
    // Debug info si está habilitado
    if (process.env.DEBUG_E2E && response?.debug) {
      debugLog.push({
        q,
        expected_faq_id,
        got_faq_id: gotId,
        ...response.debug
      });
    }
    
    results.push({
      q,
      expected_faq_id,
      got_faq_id: gotId,
      hit,
      latency,
      intent,
      source: response?.source
    });
  }

  const exactAt1 = queries.length ? hits / queries.length : 0;
  
  // Calcular percentiles
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p50 = percentile(sortedLatencies, 50);
  const p95 = percentile(sortedLatencies, 95);

  // Guardar debug log si está habilitado
  if (process.env.DEBUG_E2E && debugLog.length > 0) {
    const fs = require('fs');
    const path = require('path');
    const debugFile = path.join(__dirname, '../../logs/analysis/APEX-E2E.debug.json');
    fs.writeFileSync(debugFile, JSON.stringify(debugLog, null, 2));
    console.log(`Debug log saved to: ${debugFile}`);
  }

  return {
    n: queries.length,
    exact_at_1: exactAt1,
    hits,
    by_intent: byIntent,
    latency: {
      p50,
      p95,
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length
    },
    sources: {
      db: sources.filter(s => s === 'db').length,
      none: sources.filter(s => s === 'none').length
    },
    results
  };
}

/**
 * Crea servicio unificado usando la misma lógica que apex/index.js y eval-apex.cjs
 */
function createUnifiedService() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2'; // Apex firm ID
  
  return {
    supabase,
    firmId,
    
    async processQuery(query, opts = {}) {
      const { pinnerOff = false, debug = false } = opts;
      
      let debugInfo = {};
      if (debug) {
        debugInfo = {
          gate_intent: null,
          top8_pre_pin: [],
          top8_post_pin: [],
          top8_post_rerank: [],
          selector_choice: null,
          margin: null
        };
      }
      
      // Cargar módulos comunes
      const { resolvePin } = require('../common/pinner.cjs');
      const { gateIntent } = require('../common/intent-gate.cjs');
      const { retrieveTopK, confidentTop1 } = require('../common/retriever.cjs');
      const { llmSelectFAQ } = require('../common/llm-selector.cjs');
      const { formatFromFAQ, notFound } = require('../common/format.cjs');
      const { embedText } = require('../common/embeddings.cjs');

      // 1) PINNER DETERMINISTA (si no está off)
      if (!pinnerOff) {
        const pinId = resolvePin('apex', query);
        if (pinId) {
          const result = await formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
          if (debug) result.debug = debugInfo;
          return result;
        }
      }

      // 2) INTENT GATE
      const cats = gateIntent(query);
      if (debug) {
        debugInfo.gate_intent = cats;
      }
      
      if (!this.supabase) {
        const result = notFound();
        if (debug) result.debug = debugInfo;
        return result;
      }

      // 3) RETRIEVER (con MCP fallback a supabase-js)
      const cands = await this.retrieveWithMcpFallback(query, cats, embedText);
      if (debug) {
        debugInfo.top8_post_rerank = (cands || []).map(c => ({
          id: c.id, 
          slug: c.slug,
          score: c.score
        }));
      }
      
      if (!cands || cands.length === 0) {
        const result = notFound();
        if (debug) result.debug = debugInfo;
        return result;
      }

      // 4) CONFIDENT TOP-1 CHECK
      const accepted = confidentTop1(Array.isArray(cands) ? cands : []);
      if (accepted) {
        if (debug) {
          const top2 = cands.slice(0, 2);
          if (top2.length >= 2) {
            debugInfo.margin = top2[0].score - top2[1].score;
          }
        }
        const result = await formatFromFAQ(accepted);
        if (debug) result.debug = debugInfo;
        return result;
      }

      // 5) LLM SELECTOR
      const pick = await llmSelectFAQ(query, cands);
      if (debug) {
        debugInfo.selector_choice = pick;
      }
      
      if (pick && pick.type === 'FAQ_ID') {
        const hit = cands.find(c => c.id === pick.id);
        if (hit) {
          const result = await formatFromFAQ(hit);
          if (debug) result.debug = debugInfo;
          return result;
        }
      }
      
      const result = notFound();
      if (debug) result.debug = debugInfo;
      return result;
    },
    
    /**
     * Retriever con fallback MCP → supabase-js
     */
    async retrieveWithMcpFallback(query, cats, embedText) {
      try {
        // Intentar MCP primero (si está disponible sería mcp__supabase__supabase_query)
        // Por ahora, usar el método estándar desde retriever.cjs
        const { retrieveTopK } = require('../common/retriever.cjs');
        return await retrieveTopK(this.supabase, query, cats, this.firmId, embedText);
      } catch (error) {
        console.warn('MCP fallback failed, using standard supabase-js:', error.message);
        // Fallback al método estándar
        const { retrieveTopK } = require('../common/retriever.cjs');
        return await retrieveTopK(this.supabase, query, cats, this.firmId, embedText);
      }
    }
  };
}

/**
 * Calcula percentil
 */
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

module.exports = { evalQueriesMcp };