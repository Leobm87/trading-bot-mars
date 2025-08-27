// scripts/eval-apex.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.ceil((p/100)*a.length)-1;
  return a[Math.max(0, Math.min(a.length-1, idx))];
}
function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

(async () => {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = safeJSONL(goldenPath);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Create service with inline functionality matching apex/index.js structure
  const { gateIntent } = require('../services/common/intent-gate.cjs');
  const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
  const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
  const { formatFromFAQ, notFound } = require('../services/common/format.cjs');

  const service = {
    supabase,
    async processQuery(query) {
      const cats = gateIntent(query);
      if (!this.supabase) return notFound();

      const cands = await retrieveTopK(this.supabase, query, cats, 8);
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

  let hits = 0;
  const byIntent = {};
  const lat = [];
  const sources = [];

  for (const { q, expected_faq_id, intent } of golden) {
    const t0 = Date.now();
    const res = await service.processQuery(q);
    const ms = Date.now() - t0;

    const gotId = res && res.faq_id;
    const hit = !!(gotId && expected_faq_id && gotId === expected_faq_id);
    if (hit) hits += 1;

    byIntent[intent] ||= { n:0, hit:0 };
    byIntent[intent].n += 1;
    if (hit) byIntent[intent].hit += 1;

    lat.push(ms);
    sources.push(res && res.source ? res.source : 'none');
  }

  const exact_at_1 = golden.length ? +(hits / golden.length).toFixed(4) : 0;
  const srcPct = (label) => {
    const n = sources.length || 1;
    return +(sources.filter(s => s === label).length * 100 / n).toFixed(1);
  };

  const report = {
    prd: "PRD-002",
    n: golden.length,
    exact_at_1,
    by_intent: byIntent,
    sources_pct: { db: srcPct('db'), llm_select: srcPct('llm_select'), none: srcPct('none') },
    latency_ms: { p50: percentile(lat,50), p95: percentile(lat,95) }
  };
  console.log(JSON.stringify(report, null, 2));

  // Handoff append
  const handoff = {
    when: new Date().toISOString(),
    prd: "PRD-002",
    status: "completed",
    repo_sha: "HEAD",
    files_changed: ["scripts/eval-apex.cjs","tests/golden/apex.jsonl","package.json"],
    scripts_added: ["npm run eval:apex"],
    db_touched: false,
    metrics: report,
    notes: ["Golden harness ready; fill expected_faq_id with real UUIDs to compute accuracy."],
    next_actions: ["Backfill expected_faq_id; run eval; if Exact@1<0.95, plan PRD-003 aliases."]
  };
  const handoffPath = path.join(__dirname, '..', 'logs', 'agent', 'AGENT_HANDOFF.jsonl');
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.appendFileSync(handoffPath, JSON.stringify(handoff) + '\n');
})().catch(e => { console.error(e); process.exit(1); });