#!/usr/bin/env node
/**
 * Test por lotes de variaciones - más rápido
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { gateIntent } = require('../services/common/intent-gate.cjs');
const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
const { embedText } = require('../services/common/embeddings.cjs');
const { resolvePin } = require('../services/common/pinner.cjs');

const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2';

async function processQuery(query) {
  const pinId = resolvePin('apex', query);
  if (pinId) {
    return formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
  }

  const cats = gateIntent(query);
  if (!supabase) return notFound();

  const cands = await retrieveTopK(supabase, query, cats, firmId, embedText);
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

async function testBatch(questions) {
  const results = await Promise.all(
    questions.map(async (q) => {
      try {
        const start = Date.now();
        const result = await processQuery(q.variant);
        return {
          ...q,
          success: result?.ok === true,
          time: Date.now() - start,
          source: result?.source
        };
      } catch (error) {
        return {
          ...q,
          success: false,
          error: error.message
        };
      }
    })
  );
  return results;
}

async function runBatchTest() {
  console.log('⚡ TEST RÁPIDO POR LOTES\n');
  console.log('=' .repeat(70));
  
  const variationsPath = path.join(__dirname, '..', 'tests', 'apex-variations.json');
  const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));
  
  let allVariations = [];
  
  // Recopilar todas las variaciones
  for (const [category, data] of Object.entries(variations.categories)) {
    const catVariations = data.variations || [];
    for (const item of catVariations) {
      if (item?.variants) {
        for (const variant of item.variants) {
          allVariations.push({ 
            category, 
            original: item.original, 
            variant 
          });
        }
      }
    }
  }
  
  console.log(`📊 Total: ${allVariations.length} variaciones\n`);
  
  const BATCH_SIZE = 10; // Procesar 10 en paralelo
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byCategory: {},
    failures: []
  };
  
  for (let i = 0; i < allVariations.length; i += BATCH_SIZE) {
    const batch = allVariations.slice(i, Math.min(i + BATCH_SIZE, allVariations.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allVariations.length / BATCH_SIZE);
    
    process.stdout.write(`Lote ${batchNum}/${totalBatches}... `);
    
    const batchResults = await testBatch(batch);
    
    for (const res of batchResults) {
      results.total++;
      
      if (!results.byCategory[res.category]) {
        results.byCategory[res.category] = { total: 0, successful: 0, failed: 0 };
      }
      results.byCategory[res.category].total++;
      
      if (res.success) {
        results.successful++;
        results.byCategory[res.category].successful++;
      } else {
        results.failed++;
        results.byCategory[res.category].failed++;
        results.failures.push(res);
      }
    }
    
    const successCount = batchResults.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${batch.length}`);
  }
  
  // Resumen
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN');
  console.log('=' .repeat(70));
  
  const rate = ((results.successful / results.total) * 100).toFixed(1);
  console.log(`\n✅ Exitosas: ${results.successful}/${results.total} (${rate}%)`);
  console.log(`❌ Fallidas: ${results.failed}/${results.total}`);
  
  console.log('\n📂 POR CATEGORÍA:');
  for (const [cat, stats] of Object.entries(results.byCategory)) {
    const catRate = ((stats.successful / stats.total) * 100).toFixed(1);
    console.log(`${cat}: ${catRate}% (${stats.successful}/${stats.total})`);
  }
  
  // Patrones de falla únicos
  const uniqueOriginals = new Set(results.failures.map(f => f.original));
  console.log(`\n🔍 Preguntas originales con fallas: ${uniqueOriginals.size}`);
  
  if (uniqueOriginals.size > 0) {
    console.log('\nTop 10 preguntas problemáticas:');
    let count = 0;
    for (const orig of uniqueOriginals) {
      if (++count > 10) break;
      console.log(`- ${orig}`);
    }
  }
  
  // Guardar reporte
  const timestamp = Date.now();
  const reportPath = path.join(__dirname, '..', 'logs', `batch-test-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte: logs/batch-test-${timestamp}.json`);
  
  return results;
}

if (require.main === module) {
  runBatchTest()
    .then(() => {
      console.log('\n✅ Test completado\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runBatchTest };