#!/usr/bin/env node

/**
 * PRD-APEX-WITHDRAWALS-FENCE-LOCK-1 — Diagnóstico pre-pin con MCP real
 * Llama Supabase RPC para cada query y registra Top-8 candidatos
 */

const fs = require('fs');
const path = require('path');

const APEX_FIRM_ID = "854bf730-8420-4297-86f8-3c4a972edcf2";
const TARGET_FAQ_ID = "385d0f21-fee7-4acb-9f69-a70051e3ad38"; // apex.payout.limites-retiro

const WITHDRAWAL_QUERIES = [
  "monto minimo primer retiro",
  "cuanto cobrar primer payout", 
  "minimo retiro apex",
  "cuando puedo retirar primera vez",
  "primer cobro cuanto",
  "monto minimo retirar",
  "importe mínimo retiro",
  "mínimo para cobrar",
  "primer pago mínimo",
  "primer pago en apex",
  "cuánto es el mínimo para retirar"
];

async function diagnoseWithdrawals() {
  console.log('🔍 PRD-APEX-WITHDRAWALS-FENCE-LOCK-1: Diagnóstico pre-pin con MCP');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const results = [];
  let summary = { total_queries: WITHDRAWAL_QUERIES.length, has_target_count: 0, avg_results: 0 };
  
  for (const query of WITHDRAWAL_QUERIES) {
    console.log(`\n📋 Query: "${query}"`);
    
    try {
      const { data, error } = await supabase.rpc('faq_retrieve_es_v3', {
        q: query,
        firm_id: APEX_FIRM_ID
      });
      
      if (error) {
        console.error(`❌ Error en query "${query}":`, error);
        results.push({
          query,
          error: error.message,
          prepin_count: 0,
          has_385d0f21: false
        });
        continue;
      }
      
      const top8 = data.slice(0, 8).map(row => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        score: row.score
      }));
      
      const hasTarget = top8.some(item => item.id === TARGET_FAQ_ID);
      
      results.push({
        query,
        prepin_count: top8.length,
        has_385d0f21: hasTarget,
        top8: top8
      });
      
      if (hasTarget) summary.has_target_count++;
      summary.avg_results += top8.length;
      
      console.log(`✓ "${query}": ${top8.length} resultados, target=${hasTarget}`);
      
    } catch (err) {
      console.error(`💥 Excepción en query "${query}":`, err.message);
      results.push({
        query,
        error: err.message,
        prepin_count: 0,
        has_385d0f21: false
      });
    }
  }
  
  summary.avg_results = Math.round(summary.avg_results / summary.total_queries);
  summary.target_hit_rate = `${summary.has_target_count}/${summary.total_queries}`;
  
  // Guardar resultados
  const outputPath = path.join(__dirname, '../logs/analysis/APEX-withdrawals.prepin.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  const output = {
    prd: "PRD-APEX-WITHDRAWALS-FENCE-LOCK-1",
    timestamp: new Date().toISOString(),
    target_faq_id: TARGET_FAQ_ID,
    firm_id: APEX_FIRM_ID,
    summary: summary,
    queries: results
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Target hit rate: ${summary.target_hit_rate}`);
  console.log(`   Promedio resultados: ${summary.avg_results}`);
  console.log(`   Output: ${outputPath}`);
  
  if (summary.has_target_count < summary.total_queries) {
    console.log(`\n⚠️  ACCIÓN REQUERIDA: aliases multi-palabra para queries sin target`);
  }
  
  return output;
}

if (require.main === module) {
  diagnoseWithdrawals().catch(console.error);
}

module.exports = { diagnoseWithdrawals };