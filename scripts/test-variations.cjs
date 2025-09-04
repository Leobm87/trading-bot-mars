#!/usr/bin/env node
/**
 * Test con variaciones léxicas
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Cargar funciones del bot
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { gateIntent } = require('../services/common/intent-gate.cjs');
const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
const { embedText } = require('../services/common/embeddings.cjs');
const { resolvePin } = require('../services/common/pinner.cjs');

const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2'; // APEX

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

async function testVariation(question) {
  try {
    const startTime = Date.now();
    const result = await processQuery(question);
    const responseTime = Date.now() - startTime;
    
    return {
      question,
      success: result?.ok === true,
      source: result?.source || 'unknown',
      responseTime
    };
  } catch (error) {
    return {
      question,
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

async function runVariationsTest() {
  console.log('🧪 TEST DE VARIACIONES LÉXICAS\n');
  console.log('=' .repeat(70));
  
  // Cargar variaciones generadas
  const variationsPath = path.join(__dirname, '..', 'tests', 'apex-variations.json');
  const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byCategory: {},
    failedQuestions: [],
    timestamp: new Date().toISOString()
  };
  
  // Procesar solo muestra para testing rápido
  const SAMPLE_SIZE = 50; // Probar 50 variaciones aleatorias
  let sampledQuestions = [];
  
  for (const [category, data] of Object.entries(variations.categories)) {
    const catVariations = data.variations || [];
    if (catVariations.length === 0) continue;
    
    // Tomar 2-3 preguntas aleatorias por categoría
    const sampleCount = Math.min(3, catVariations.length);
    for (let i = 0; i < sampleCount; i++) {
      const randomIdx = Math.floor(Math.random() * catVariations.length);
      const item = catVariations[randomIdx];
      if (item?.variants) {
        // Tomar 2 variantes aleatorias de cada pregunta
        const variantsSample = item.variants.slice(0, 2);
        sampledQuestions.push(...variantsSample.map(v => ({ 
          category, 
          original: item.original, 
          variant: v 
        })));
      }
    }
  }
  
  // Limitar a SAMPLE_SIZE
  sampledQuestions = sampledQuestions.slice(0, SAMPLE_SIZE);
  
  console.log(`\n📊 Probando ${sampledQuestions.length} variaciones (muestra)\n`);
  
  for (let i = 0; i < sampledQuestions.length; i++) {
    const { category, original, variant } = sampledQuestions[i];
    
    process.stdout.write(`[${i+1}/${sampledQuestions.length}] "${variant.substring(0, 50)}..." `);
    
    const result = await testVariation(variant);
    
    if (!results.byCategory[category]) {
      results.byCategory[category] = { total: 0, successful: 0, failed: 0 };
    }
    
    results.byCategory[category].total++;
    results.total++;
    
    if (result.success) {
      results.byCategory[category].successful++;
      results.successful++;
      console.log(`✅ (${result.responseTime}ms)`);
    } else {
      results.byCategory[category].failed++;
      results.failed++;
      results.failedQuestions.push({
        category,
        original,
        variant,
        error: result.error
      });
      console.log(`❌`);
    }
  }
  
  // Resumen
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN DE VARIACIONES');
  console.log('=' .repeat(70));
  
  const successRate = ((results.successful / results.total) * 100).toFixed(1);
  console.log(`\n✅ Exitosas:     ${results.successful}/${results.total} (${successRate}%)`);
  console.log(`❌ Fallidas:     ${results.failed}/${results.total}`);
  
  if (results.failed > 0) {
    console.log('\n❌ VARIACIONES FALLIDAS:');
    console.log('-'.repeat(70));
    results.failedQuestions.slice(0, 10).forEach(q => {
      console.log(`[${q.category}]`);
      console.log(`  Original: "${q.original}"`);
      console.log(`  Variante: "${q.variant}"`);
    });
    
    if (results.failedQuestions.length > 10) {
      console.log(`\n... y ${results.failedQuestions.length - 10} más`);
    }
  }
  
  // Guardar reporte
  const reportPath = path.join(__dirname, '..', 'logs', `variations-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);
  
  return results;
}

// Ejecutar
if (require.main === module) {
  runVariationsTest()
    .then(results => {
      const exitCode = results.failed > 0 ? 1 : 0;
      console.log('\n✅ Test de variaciones completado\n');
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runVariationsTest };