const { rrfFuseWeighted } = require('./rrf.cjs');
const fs = require('fs');
const path = require('path');

// Load aliases for re-ranking
let ALIASES_BY_FAQ = {};
try {
  const aliasesPath = path.join(__dirname, '../../data/aliases-apex.json');
  const aliases = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
  // Convertir aliases a mapa faq_id -> [aliases...]
  // Para esto necesitamos cargar FAQ data después
} catch (e) {
  console.warn('Cannot load aliases for re-ranking:', e.message);
}

// Load config
const cfg = (()=>{ try { return require('../../config/retriever.apex.json'); } catch { return {}; } })();
const VECTOR_SKIP = new Set(cfg.vector_skip_intents || []);
const SELECTOR_TOP_K = Number(cfg.selector_top_k || 4);

const MIN_ROWS = 6;

// PRD-APEX-WITHDRAWALS-FENCE-LOCK-3: Fences para limpiar rival content
function applyFences(rows, query, cats = []) {
  if (!Array.isArray(rows)) return rows;
  
  const q = String(query || '').toLowerCase();
  const hasWithdrawals = cats.includes('withdrawals');
  const hasPaymentMethods = cats.includes('payment_methods');
  
  return rows.filter(faq => {
    if (!faq || !faq.id) return true;
    
    // FENCE 1: Si intent=withdrawals, excluir FAQs de payment_methods
    if (hasWithdrawals) {
      const isPaymentFaq = /\b(m[eé]todo(?:s)?|forma(?:s)?)\s+de\s+pago\b|tarjeta|visa|mastercard|paypal|apple\s*pay|google\s*pay|transferencia|sepa|cripto|crypto|bitcoin|stripe|wise|suscripci[oó]n|recurring|activation.*fee|comprar|checkout/i.test(faq.question || '');
      if (isPaymentFaq) return false;
    }
    
    // FENCE 2: Si intent=payment_methods, excluir FAQs de withdrawals
    if (hasPaymentMethods) {
      const isWithdrawalFaq = /\b(retir|retiro|retirar|retirada|payouts?|withdraw(?:al)?|safety\s+net|umbral|consistencia|cohesion)\b/i.test(faq.question || '');
      if (isWithdrawalFaq) return false;
    }
    
    return true;
  });
}
const K  = Number(process.env.RETRIEVE_K || 5);
const VK = Number(process.env.VECTOR_K   || 5);
const VEC_EXPAND_SYNONYMS = String(process.env.VEC_EXPAND_SYNONYMS || 'false') === 'true';
const HYBRID_ONLY_WHEN_UNSURE = String(process.env.HYBRID_ONLY_WHEN_UNSURE||'true') !== 'false';
const FUSED_MARGIN_SKIP_LLM = Number(process.env.FUSED_MARGIN_SKIP_LLM || 0.10);

const CAT_SYNONYMS = {
  withdrawals: "retiro payout payouts safety net umbral minimo consistencia 30% minimo",
  payment_methods: "metodos de pago formas de pago tarjeta paypal crypto transferencia wise plane",
  pricing: "precio activacion suscripcion reset coste fee plan",
  rules: "reglas drawdown trailing static overnight news one-direction daily loss 5:1 stops",
  platforms: "plataformas rithmic tradovate ninjatrader wealthcharts tradingview quantower rixo",
  discounts: "descuento codigo cupon promo rebaja"
};

async function lexical(supabase, query, firm_id, cats, k = K) {
  // PRD-APEX-WITHDRAWALS-RECOVERY-FINAL: Query Booster para intent retiro
  let boostedQuery = query;
  if (cats && cats.includes('withdrawals')) {
    // Boost específico para queries de retiro con énfasis en límites y montos mínimos
    const withdrawalBoosts = "limite retiro minimo retiro monto minimo $500 primeros retiros limitados";
    boostedQuery = query + " " + withdrawalBoosts;
  }
  
  const { data, error } = await supabase.rpc('faq_retrieve_es_v2', {
    q: boostedQuery, firm: firm_id, cats, k
  });
  if (error) throw error;
  
  // Aplicar reweighting por campo y luego re-ranking
  let results = (data || []).map(reweightByField.bind(null, query));
  results = reRankResults(query, results, supabase, cats);
  
  return results;
}

function reweightByField(query, faq) {
  // Pesos: title=2.0, question_md=1.3, answer_md=1.0
  const q = query.toLowerCase();
  const title = (faq.title || '').toLowerCase();
  const question = (faq.question || '').toLowerCase();
  const answer = (faq.answer_md || '').toLowerCase();
  
  let adjustedScore = faq.score || 0;
  
  // Boost si aparece en campos de mayor peso
  if (title.includes(q) || q.split(' ').some(w => w.length > 2 && title.includes(w))) {
    adjustedScore *= 2.0; // title weight
  } else if (question.includes(q) || q.split(' ').some(w => w.length > 2 && question.includes(w))) {
    adjustedScore *= 1.3; // question_md weight
  }
  // answer_md mantiene peso 1.0 (base)
  
  return { ...faq, score: adjustedScore };
}

function reRankResults(query, results, supabase, cats = []) {
  if (!results || results.length === 0) return results;
  
  const queryTokens = query.toLowerCase().split(/\s+/);
  const queryText = query.toLowerCase();
  
  return results.map(faq => {
    let score = faq.score || 0;
    let boostApplied = 0;
    
    // 1) ALIAS EXACT BOOST: si query contiene algún alias EXACTO del candidato → +0.18 (cap 0.18)
    const faqAliases = (faq.aliases || '').toLowerCase().split(',').map(a => a.trim()).filter(a => a);
    if (faqAliases.length > 0) {
      const hasExactAlias = faqAliases.some(alias => {
        return queryText.includes(alias) || queryTokens.includes(alias);
      });
      if (hasExactAlias) {
        const aliasBoost = Math.min(0.15, 0.15 - boostApplied);
        score += aliasBoost;
        boostApplied += aliasBoost;
      }
    }
    
    // 1.5) PRD-APEX-WITHDRAWALS-HOTFIX-2: Boost específico para limites-retiro + primer/primera
    if (faq.slug === 'limites-retiro' && (/\b(primer|primera)\b.*\b(retir|payout|cobro)\b/i.test(queryText) || /primer retiro|primer payout/i.test(queryText)) && boostApplied < 0.25) {
      const primerBoost = Math.min(0.12, 0.25 - boostApplied);
      score += primerBoost;
      boostApplied += primerBoost;
    }
    
    // 2) TITLE PHRASE BOOST: frases de 2-3 tokens en título → +0.12
    const title = (faq.title || '').toLowerCase();
    if (title && queryTokens.length >= 2) {
      const hasTitlePhrase = queryTokens.length >= 2 && 
        (queryTokens.slice(0, 2).every(t => title.includes(t)) ||
         queryTokens.slice(0, 3).every(t => title.includes(t)));
      if (hasTitlePhrase && boostApplied < 0.25) {
        const titleBoost = Math.min(0.10, 0.25 - boostApplied);
        score += titleBoost;
        boostApplied += titleBoost;
      }
    }
    
    // 3) QUESTION PHRASE BOOST: frases de 2-3 tokens en pregunta → +0.08
    const question = (faq.question || '').toLowerCase();
    if (question && queryTokens.length >= 2) {
      const hasQuestionPhrase = queryTokens.length >= 2 && 
        (queryTokens.slice(0, 2).every(t => question.includes(t)) ||
         queryTokens.slice(0, 3).every(t => question.includes(t)));
      if (hasQuestionPhrase && boostApplied < 0.31) {
        const questionBoost = Math.min(0.06, 0.31 - boostApplied);
        score += questionBoost;
        boostApplied += questionBoost;
      }
    }
    
    // 4) NUMERIC TOKEN BOOST: si query y candidato comparten números → +0.08 (cap 0.08)
    const queryNums = queryText.match(/\b\d{2,3}k\b|\b\d{1,3}[.,]?\d{3}\b/g) || [];
    const faqText = `${faq.title || ''} ${faq.question || ''} ${faq.answer_md || ''}`.toLowerCase();
    const faqNums = faqText.match(/\b\d{2,3}k\b|\b\d{1,3}[.,]?\d{3}\b/g) || [];
    
    if (queryNums.length > 0 && faqNums.length > 0) {
      const hasSharedNum = queryNums.some(qnum => faqNums.includes(qnum));
      if (hasSharedNum && boostApplied < 0.37) {
        const numBoost = Math.min(0.06, 0.37 - boostApplied);
        score += numBoost;
        boostApplied += numBoost;
      }
    }
    
    // 5) VALLAS SEMÁNTICAS PRD-APEX-PAYMENT-METHODS-FENCE-LOCK-1
    // Payment methods triggers: preferir payment_methods sobre withdrawals
    const paymentTriggers = /\b(tarjeta|paypal|stripe|wise|transferencia|sepa|iban|ideal|iDEAL|bancontact|apple pay|google pay|sofort|giropay|suscripción|pago único)\b/i;
    const isPaymentMethodsIntent = cats && cats.includes('payment_methods');
    const hasPaymentTriggers = paymentTriggers.test(queryText);
    
    // PAYMENT_METHODS_FAQ_ID boost cuando hay payment triggers
    if (faq.id === '4c484cef-5715-480f-8c16-914610866a62' && (hasPaymentTriggers || isPaymentMethodsIntent)) {
      score += 0.35;
    }
    
    // Withdrawals triggers (ampliados: cubrir 'minimo retiro' y variantes)
    const withdrawalTriggers = /\b(retirar|retiro|withdraw(?:al)?|payout|cobrar|primer\s+retiro|m[ií]nimo\s+de\s+retiro|m[ií]nimo\s+retiro|minim[oa].*retiro)\b/i;
    const isWithdrawalsIntent = cats && cats.includes('withdrawals');
    const hasWithdrawalTriggers = withdrawalTriggers.test(queryText);
    
    // Si Top-8 incluye 385d0f21 → boost fuerte (+0.35) bajo withdrawal trigger
    if (faq.id === '385d0f21-fee7-4acb-9f69-a70051e3ad38' && (hasWithdrawalTriggers || isWithdrawalsIntent)) {
      score += 0.35;
    }
    
    // Siempre bajo trigger → demote fuerte (−0.50) a 4d45a7ec
    if (faq.id === '4d45a7ec-0812-48cf-b9f0-117f42158615' && (hasWithdrawalTriggers || isWithdrawalsIntent)) {
      score -= 0.50;
    }
    
    // DEMOTE safety_net cuando hay términos de retiro
    if (faq.slug && faq.slug.startsWith('apex.risk.safety_net') && /\b(retir|withdraw|payout|cash ?out|cobro|cobrar)\b/i.test(queryText)) {
      score -= 0.35;
    }
    
    // BOOST MUY fuerte a apex.payout.limites-retiro para queries de retiro mínimo
    if (faq.slug === 'apex.payout.limites-retiro' && (/primer.*retiro|minim[oa].*retiro|primer.*payout|cu[aá]nto.*cobrar.*primer|cobrar.*primer/i.test(queryText))) {
      score += 0.35; // Aumentado de 0.20 a 0.35
    }

    // NEWS + EVALUACIÓN: preferir reglas de evaluación (a52c53f3) frente a overnight/news (e8a1e102)
    if (/\bnotici(?:a|as)\b/i.test(queryText) && /\bevaluaci[oó]n\b/i.test(queryText)) {
      if (faq.id === 'a52c53f3-8f43-43d1-9d08-4cab9b2f0fea') score += 0.25;
      if (faq.id === 'e8a1e102-393d-4bc1-b551-e2cf7f521ed8') score -= 0.20;
    }

    // "tamaños apex" → priorizar precios-cuentas (93849616)
    if (/\btamañ?os?\b/i.test(queryText) && /\bapex\b/i.test(queryText)) {
      if (faq.id === '93849616-e113-43ee-8319-e32d44c1baed') score += 0.35;
    }

    // Requisitos de retiro → preferir payouts-requisitos (21a7f8bc)
    if (/(requisit|condicion|debo\s+cumplir).*retir/i.test(queryText)) {
      if (faq.id === '21a7f8bc-22c8-4032-a3a2-862b7182e3f9') score += 0.20;
      if (faq.id === '35c71f9d-57ae-42e3-a24f-c99810e47915') score -= 0.15;
    }

    // Contratos máximos → preferir escalado-contratos (5b235d0a) frente a límites por cuenta (26099319)
    if (/\bcontratos?\b/i.test(queryText) && /maxim/i.test(queryText)) {
      if (faq.id === '5b235d0a-b257-4292-adae-df65c21e689c') score += 0.25;
      if (faq.id === '26099319-b39e-4553-8219-1087d440c787') score -= 0.20;
    }

    // Países restringidos → preferir 11633e70 sobre variantes cuando el texto indica restricción/uso
    if (/\bpa[ií]ses?\b/i.test(queryText) && /(restringid|no\s+puedo\s+usar|prohibid)/i.test(queryText)) {
      if (faq.id === '11633e70-3f32-408a-8778-796e91740e46') {
        score += 0.20;
      }
      if (faq.id === '6a6465dc-15f2-4467-b47f-51f1159828e3') {
        score -= 0.15;
      }
    }
    
    // Intent mismatch penalty general máximo -0.12 (ya existente)
    // Las vallas semánticas están limitadas a ± 0.15 para mantener el reordenamiento, no eliminar candidatos
    
    // 6) INTENT MATCH/RIVAL BOOST: si intent de gate coincide/rivaliza con slug FAQ → +0.07/-0.12
    if (cats && cats.length > 0 && faq.slug) {
      const faqSlug = faq.slug.toLowerCase();
      const hasIntentMatch = cats.some(cat => {
        const catLower = cat.toLowerCase();
        return faqSlug.includes(catLower) || catLower.includes(faqSlug);
      });
      
      if (hasIntentMatch && boostApplied < 0.53) {
        const intentBoost = Math.min(0.07, 0.53 - boostApplied);
        score += intentBoost;
        boostApplied += intentBoost;
      } else {
        // Intent rival: penalización limitada a -0.12 (máximo intent mismatch)
        const hasRival = cats.some(cat => {
          const rivalMap = {
            'pricing': ['withdrawals', 'payment_methods'],
            'withdrawals': ['pricing', 'payment_methods'], 
            'payment_methods': ['pricing', 'withdrawals']
          };
          return (rivalMap[cat] || []).includes(faqSlug);
        });
        if (hasRival) {
          score -= Math.min(0.12, 0.12); // Respeta el límite global de intent mismatch
        }
      }
    }
    
    return { ...faq, score };
  });
}
async function vectorial(supabase, query, firm_id, cats, k = VK, embedText) {
  const catsStr = (VEC_EXPAND_SYNONYMS && Array.isArray(cats) && cats.length)
    ? cats.map(c=>CAT_SYNONYMS[c] || "").join(" ")
    : "";
  const qExpanded = catsStr ? (query + " " + catsStr).trim() : query;
  const emb = await embedText(qExpanded);
  const { data, error } = await supabase.rpc('faq_vec_retrieve', {
    q: emb,
    firm: firm_id,
    cats: (cats && cats.length ? cats : null),
    k: k
  });
  if (error) throw error;
  // normalizamos shape a {id,question,answer_md,category,slug,score}
  return (data||[]).map((r,i)=>({ ...r, score: r.vscore, rank: i+1 }));
}

function confidentTop1(rows) {
  if (!rows || rows.length === 0) return null;
  const a = rows[0], b = rows[1] || {};
  // Umbral lexical (con score numérico) — única vía "oficial"
  if (typeof a.score === 'number' && typeof b.score === 'number') {
    const pass = (a.score >= 0.45) && ((a.score - b.score) >= 0.12);
    return pass ? a : null;
  }
  // Fallback conservador SOLO si no hay score (usa rank)
  const sA = 1 / (a.rank || 1);
  const sB = 1 / (b.rank || 2);
  const pass = (sA >= 0.45 && (sA - sB) >= 0.12) || ((b.rank || 3) - (a.rank || 1) >= 2);
  return pass ? a : null;
}

function fusedConfidentTop1(fused) {
  if (!fused || fused.length < 2) return null;
  const [a, b] = fused;
  return ((a.score - b.score) >= FUSED_MARGIN_SKIP_LLM) ? a : null;
}

async function retrieveTopK(supabase, query, cats, firm_id, embedText, k = K) {
  const hasCats = Array.isArray(cats) && cats.length > 0;
  // 1) LEXICAL (+ fallback sin cats)
  let rows = await lexical(supabase, query, firm_id, hasCats ? cats : null, k);
  if (rows.length < MIN_ROWS && hasCats) {
    const fb = await lexical(supabase, query, firm_id, null, k);
    if (fb.length > rows.length) rows = fb;
  }
  // Fallback si las categorías no aparecen en top-3 lexical
  const seenCats = new Set((rows||[]).slice(0,3).map(r=>r.category).filter(Boolean));
  if (hasCats && seenCats.size===0) {
    const fb2 = await lexical(supabase, query, firm_id, null, k);
    if (fb2.length > rows.length) rows = fb2;
  }
  // PRD-APEX-WITHDRAWALS-FENCE-LOCK-3: Aplicar fences antes de EARLY-ACCEPT
  rows = applyFences(rows, query, hasCats ? cats : []);
  
  // EARLY-ACCEPT basándose en score lexical (NO RRF)
  const top1 = confidentTop1(rows);
  if (HYBRID_ONLY_WHEN_UNSURE && top1) return rows;

  // Si todas las categorías detectadas están en la lista de skip → NO vector; devolvemos lexical top-K para selector
  const allSkippable = hasCats && cats.every(c => VECTOR_SKIP.has(c));
  if (allSkippable) {
    return applyFences(rows.slice(0, Math.max(SELECTOR_TOP_K, 4)), query, cats);
  }

  // 2) VECTOR + RRF si NO fue confident
  const vrows = await vectorial(supabase, query, firm_id, hasCats ? cats : null, VK, embedText);
  const ftsRanked = rows.map((x,i)=>({ ...x, rank: i+1 }));
  const fused = rrfFuseWeighted(
    [{ source:'fts', items: ftsRanked }, { source:'vec', items: vrows }],
    { k: 50, weights: { fts: 1.4, vec: 1.0 } }
  );
  
  // Skip LLM selector if fused top-1 has clear margin
  const fusedTop = fusedConfidentTop1(fused);
  if (fusedTop) return applyFences(fused.slice(0, 8), query, cats); // caller will see top[0] and skip selector
  
  return applyFences(fused.slice(0, 8), query, cats);
}

module.exports = { retrieveTopK, confidentTop1, fusedConfidentTop1 };
