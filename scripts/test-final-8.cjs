#!/usr/bin/env node
/**
 * Test rápido para las 8 preguntas que fallaban
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Cargar funciones necesarias
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

// Las 8 preguntas que fallaban
const testQuestions = [
  "cual es la cuenta mas barata?",
  "que diferencia hay entre normal y static?",
  "puedo pasar solo con micros?",
  "que pasa si violo una regla?",
  "que pasa si no pago la mensualidad?",
  "pierdo la cuenta si no pago un mes?",
  "apex funciona en españa y latinoamerica?",
  "es apex bueno para principiantes?"
];

async function runTest() {
  console.log('🎯 TEST FINAL - 8 PREGUNTAS CRÍTICAS\n');
  console.log('=' .repeat(60));
  
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    process.stdout.write(`[${i+1}/8] "${question}"... `);
    
    try {
      const result = await processQuery(question);
      
      if (result?.ok === true) {
        successful++;
        console.log('✅');
      } else {
        failed++;
        console.log('❌');
      }
    } catch (error) {
      failed++;
      console.log(`❌ (${error.message})`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADO FINAL');
  console.log('=' .repeat(60));
  
  const successRate = (successful / testQuestions.length * 100).toFixed(1);
  console.log(`✅ Exitosas:     ${successful}/8`);
  console.log(`❌ Fallidas:     ${failed}/8`);
  console.log(`📈 Tasa éxito:   ${successRate}%`);
  
  if (successful === 8) {
    console.log('\n🎉 ¡100% DE ÉXITO EN PREGUNTAS CRÍTICAS!');
  }
  
  return { successful, failed, successRate };
}

// Ejecutar
if (require.main === module) {
  runTest()
    .then(result => {
      const exitCode = result.failed > 0 ? 1 : 0;
      console.log('\n✅ Test completado\n');
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runTest };