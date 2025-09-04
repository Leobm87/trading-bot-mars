#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const q = process.argv.slice(2).join(' ') || 'tamanos apex';
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { retrieveTopK } = require('../services/common/retriever.cjs');
  const { gateIntent } = require('../services/common/intent-gate.cjs');
  const { embedText } = require('../services/common/embeddings.cjs');
  const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2';
  const cats = gateIntent(q);
  const rows = await retrieveTopK(supabase, q, cats, firmId, embedText);
  console.log('Query:', q);
  console.log('Cats:', cats);
  console.log(rows.map(r => ({ id: r.id, slug: r.slug, score: r.score })).slice(0,8));
}

main().catch(err => { console.error(err); process.exit(1); });

