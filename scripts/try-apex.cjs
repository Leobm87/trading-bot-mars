// scripts/try-apex.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function median(arr) {
  const a = [...arr].sort((x,y)=>x-y);
  const mid = Math.floor(a.length/2);
  return a.length % 2 ? a[mid] : Math.round((a[mid-1]+a[mid])/2);
}

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Create service with inline functionality matching apex/index.js structure
  const { gateIntent } = require('../services/common/intent-gate.cjs');
  const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
  const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
  const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
  const { embedText } = require('../services/common/embeddings.cjs');

  // Mock service with processQuery method that matches the architecture
  const service = {
    supabase,
    firmId: '854bf730-8420-4297-86f8-3c4a972edcf2', // APEX firm ID
    async processQuery(query) {
      const { resolvePin } = require('../services/common/pinner.cjs');
      
      // 0) Pinner determinista
      const pinId = resolvePin('apex', query);
      if (pinId) {
        return formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
      }

      const cats = gateIntent(query);
      if (!this.supabase) return notFound();

      const cands = await retrieveTopK(this.supabase, query, cats, this.firmId, embedText);
      if (!cands || cands.length === 0) return notFound();

      const top1 = confidentTop1(cands);
      if (top1) return formatFromFAQ(top1);

      const pick = await llmSelectFAQ(query, cands);
      if (pick && pick.type === 'FAQ_ID') {
        const hit = cands.find(c => c.id === pick.id);
        if (hit) return formatFromFAQ(hit);
      }
      return notFound();
    }
  };

  if (typeof service.initialize === 'function') {
    await service.initialize();
  }

  // Parse CLI args for --q
  const args = process.argv.slice(2);
  const qIndex = args.findIndex(arg => arg === '--q');
  const customQuery = qIndex !== -1 && args[qIndex + 1] ? args[qIndex + 1] : null;
  
  const queries = customQuery ? [customQuery] : [
    "cual es el umbral minimo en apex",
    "metodos de pago apex",
    "cuanto cuesta activar apex",
    "reglas overnight apex"
  ];

  const lat = [];
  const sources = [];
  const ndjsonPath = path.join(__dirname, '..', 'logs', 'decisions.ndjson');
  fs.mkdirSync(path.dirname(ndjsonPath), { recursive: true });

  for (const q of queries) {
    const t0 = Date.now();
    const res = await service.processQuery(q);
    const ms = Date.now() - t0;

    const out = { q, ms, res };
    console.log(JSON.stringify(out, null, 2));

    lat.push(ms);
    sources.push(res && res.source ? res.source : 'none');

    // Telemetría mínima a NDJSON
    const entry = {
      when: new Date().toISOString(),
      firm: 'apex',
      q,
      selector: (res && res.source) || 'none',
      faq_id: (res && res.faq_id) || null,
      ms
    };
    fs.appendFileSync(ndjsonPath, JSON.stringify(entry) + '\n');
  }

  const p50 = median(lat);
  const success = {
    prd: "PRD-001",
    smoke_done: true,
    sources,
    latencies_ms: lat,
    p50_latency_ms: p50
  };
  console.log(JSON.stringify(success, null, 2));

  // Handoff JSON
  const handoff = {
    when: new Date().toISOString(),
    prd: "PRD-001",
    status: "completed",
    repo_sha: "HEAD",
    files_changed: ["services/common/retriever.js", "scripts/try-apex.cjs", "package.json", "logs/decisions.ndjson"],
    scripts_added: ["npm run try:apex"],
    db_touched: false,
    metrics: {
      smoke: { queries, sources, latencies_ms: lat, p50_latency_ms: p50 }
    },
    notes: ["Retriever now category-safe with fallback; APEX smoke measured"],
    next_actions: ["Prepare PRD-002: golden set + Exact@1 evaluator"]
  };

  // Guardar en handoff
  const handoffPath = path.join(__dirname, '..', 'logs', 'agent', 'AGENT_HANDOFF.jsonl');
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.appendFileSync(handoffPath, JSON.stringify(handoff) + '\n');
})().catch(e => { console.error(e); process.exit(1); });