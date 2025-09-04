#!/usr/bin/env node
/**
 * Test específico de las 56 preguntas que fallaron
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

// Las 56 preguntas que fallaron originalmente
const failedQuestions = [
  // EVALUACIÓN
  "cuantos dias minimo de trading ??",
  "profit target de cada cuenta??",
  
  // DRAWDOWN
  "cual es el eod limite de perdida vs trailing?",
  "como se calcula el limite de perdida en la static?",
  "como se resetea el balance para el drawdown?",
  "me puedes decir como se resetea el balance para drawdown?",
  "como se resetea balance para el drawdown?",
  
  // REGLAS TRADING
  "existe blacklist de estrategias prohibidas?",
  "hay blacklist de estrategias prohibidas?",
  "hay limite maximo de por dia?",
  "limite maximo de trades por dia??",
  "instrumentos estar disponible desde el dia 1??",
  "estar disponible todos los instrumentos desde el dia 1??",
  "tradear todos los instrumentos desde dia 1??",
  "rollovers de contratos??",
  
  // RETIROS
  "es el minimo para retirar??",
  "minimo para withdrawal??",
  "cada cuanto solicitar retiros??",
  "cuando solicitar withdrawal??",
  "hay limite maximo de mensual?",
  "existe limite maximo de retiro mensual?",
  "es el safety net o threshold??",
  "retirar en crypto o paypal??",
  
  // INSTRUMENTOS
  "tradear nasdaq y sp500??",
  "operar nasdaq y sp500??",
  "instrumentos??",
  "instrumentos tradear??",
  "contratos usar al inicio??",
  "tradear oro y petroleo??",
  "operar oro y petroleo??",
  "diferencia entre micros y minis??",
  "es mejor para principiantes micros o minis??",
  
  // PLATAFORMAS
  "ninjatrader tiene costo adicional?",
  "ninjatrader tiene costo adicional durante?",
  "me puedes decir ninjatrader tiene costo adicional?",
  "cuanto son las comisiones por a traves de contrato?",
  "me puedes decir cuanto son las comisiones por contrato?",
  "necesito pagar data feed aparte?",
  "es necesario pagar data feed aparte?",
  "me puedes decir necesito pagar data feed aparte?",
  "usar sierra chart o quantower??",
  
  // RESET Y PA
  "tienen reset gratis disponible?",
  "me puedes decir hay reset gratis disponible?",
  "me puedes decir tengo que pagar mensualidad despues de pasar?",
  "ofrecen descuento en la activacion pa?",
  "me puedes decir hay descuento en la activacion pa?",
  "cuanto tiempo tengo para activar despues de pasar?",
  "cuanto tiempo tengo para poder activar despues de pasar?",
  "me puedes decir cuanto tiempo tengo para activar despues de pasar?",
  "reactivar una cuenta pausada??",
  
  // PAÍSES
  "tengo que pasar kyc?",
  "aceptan paypal o crypto para pagar?",
  "aceptan paypal o crypto con el fin de pagar?",
  "me puedes decir aceptan paypal o crypto para pagar?",
  
  // SITUACIONES
  "me puedes decir hay soporte en español?",
  "puedo cambiar mi estrategia despues de empezar?",
  "podria cambiar mi estrategia despues de empezar?",
  "se puede cambiar mi estrategia despues de empezar?",
  "me puedes decir puedo cambiar mi estrategia despues de empezar?",
  "cambiar mi estrategia despues de empezar??"
];

async function test56Failures() {
  console.log('🎯 TEST DE 56 PREGUNTAS FALLIDAS POST-MEJORAS\n');
  console.log('=' .repeat(70));
  console.log('Objetivo: Verificar impacto de PINs + FAQs + Aliases\n');
  
  let successful = 0;
  let failed = 0;
  const results = {
    byCategory: {},
    failures: []
  };
  
  // Categorizar preguntas para mejor análisis
  const categories = {
    'EVALUACIÓN': failedQuestions.slice(0, 2),
    'DRAWDOWN': failedQuestions.slice(2, 7),
    'REGLAS': failedQuestions.slice(7, 15),
    'RETIROS': failedQuestions.slice(15, 23),
    'INSTRUMENTOS': failedQuestions.slice(23, 32),
    'PLATAFORMAS': failedQuestions.slice(32, 41),
    'RESET/PA': failedQuestions.slice(41, 50),
    'PAÍSES': failedQuestions.slice(50, 54),
    'SITUACIONES': failedQuestions.slice(54)
  };
  
  for (const [category, questions] of Object.entries(categories)) {
    console.log(`\n📂 ${category} (${questions.length} preguntas)`);
    console.log('-'.repeat(60));
    
    results.byCategory[category] = { total: questions.length, successful: 0, failed: 0 };
    
    for (const question of questions) {
      process.stdout.write(`"${question.substring(0, 40)}..." `);
      
      try {
        const result = await processQuery(question);
        
        if (result?.ok === true) {
          successful++;
          results.byCategory[category].successful++;
          const source = result.source === 'pin' ? '📌' : result.source === 'db' ? '🔍' : '🤖';
          console.log(`✅ ${source}`);
        } else {
          failed++;
          results.byCategory[category].failed++;
          results.failures.push({ category, question });
          console.log('❌');
        }
      } catch (error) {
        failed++;
        results.byCategory[category].failed++;
        results.failures.push({ category, question, error: error.message });
        console.log(`❌ (${error.message})`);
      }
    }
    
    const catRate = ((results.byCategory[category].successful / questions.length) * 100).toFixed(1);
    console.log(`Éxito: ${catRate}%`);
  }
  
  // Resumen
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESULTADO FINAL');
  console.log('=' .repeat(70));
  
  const successRate = ((successful / failedQuestions.length) * 100).toFixed(1);
  console.log(`\n✅ Exitosas:     ${successful}/56 (${successRate}%)`);
  console.log(`❌ Fallidas:     ${failed}/56`);
  
  console.log('\n📈 MEJORA POR CATEGORÍA:');
  for (const [cat, stats] of Object.entries(results.byCategory)) {
    const rate = ((stats.successful / stats.total) * 100).toFixed(1);
    const emoji = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
    console.log(`${emoji} ${cat}: ${rate}% (${stats.successful}/${stats.total})`);
  }
  
  // Comparación antes/después
  console.log('\n🔄 COMPARACIÓN:');
  console.log(`   Antes: 0/56 (0%)`);
  console.log(`   Ahora: ${successful}/56 (${successRate}%)`);
  console.log(`   📈 Mejora: +${successRate}%`);
  
  if (successRate >= 80) {
    console.log('\n🎉 ¡OBJETIVO ALCANZADO! Las mejoras fueron efectivas.');
  } else if (successRate >= 60) {
    console.log('\n⚠️ Mejora significativa pero aún hay trabajo pendiente.');
  } else {
    console.log('\n❌ Las mejoras no fueron suficientes. Se requiere más trabajo.');
  }
  
  // Mostrar fallas restantes
  if (results.failures.length > 0) {
    console.log('\n❌ FALLAS RESTANTES:');
    console.log('-'.repeat(70));
    results.failures.slice(0, 10).forEach(f => {
      console.log(`[${f.category}] ${f.question}`);
    });
    if (results.failures.length > 10) {
      console.log(`... y ${results.failures.length - 10} más`);
    }
  }
  
  return { successful, failed, successRate };
}

// Ejecutar
if (require.main === module) {
  test56Failures()
    .then(result => {
      console.log('\n✅ Test completado\n');
      process.exit(result.failed > 20 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { test56Failures };