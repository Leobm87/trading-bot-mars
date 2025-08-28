const { rrfFuseWeighted } = require('./rrf.cjs');

// Load config
const cfg = (()=>{ try { return require('../../config/retriever.apex.json'); } catch { return {}; } })();
const VECTOR_SKIP = new Set(cfg.vector_skip_intents || []);
const SELECTOR_TOP_K = Number(cfg.selector_top_k || 4);

const MIN_ROWS = 6;
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
  const { data, error } = await supabase.rpc('faq_retrieve_es_v2', {
    q: query, firm: firm_id, cats, k
  });
  if (error) throw error;
  return data || [];
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
  // EARLY-ACCEPT basándose en score lexical (NO RRF)
  const top1 = confidentTop1(rows);
  if (HYBRID_ONLY_WHEN_UNSURE && top1) return rows;

  // Si todas las categorías detectadas están en la lista de skip → NO vector; devolvemos lexical top-K para selector
  const allSkippable = hasCats && cats.every(c => VECTOR_SKIP.has(c));
  if (allSkippable) {
    return rows.slice(0, Math.max(SELECTOR_TOP_K, 4));
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
  if (fusedTop) return fused.slice(0, 8); // caller will see top[0] and skip selector
  
  return fused.slice(0, 8);
}

module.exports = { retrieveTopK, confidentTop1, fusedConfidentTop1 };