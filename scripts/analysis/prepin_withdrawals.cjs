#!/usr/bin/env node

// PRD-APEX-WITHDRAWALS-MCP-FINAL: Prepin analysis for withdrawal queries

const { readFile, writeFile } = require('fs/promises');
const { createClient } = require('@supabase/supabase-js');

const FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2'; // APEX
const OUTPUT_PATH = 'logs/analysis/APEX-withdrawals.prepin.json';

// Target FAQ
const TARGET_FAQ = '385d0f21-fee7-4acb-9f69-a70051e3ad38'; // limites-retiro
const RIVAL_FAQ = '4d45a7ec-0812-48cf-b9f0-117f42158615'; // payouts-frecuencia

// Test queries de withdrawals del golden=82
const WITHDRAWAL_QUERIES = [
  'primer retiro',
  'primer payout', 
  '¿cuál es el mínimo para retirar?',
  'cuando cobro',
  'payout minimo',
  'retiro minimo',
  'cuanto cobrar primer payout',
  'minimo para retirar',
  'monto minimo primer retiro',
  'primer cobro cuanto',
  'minimo retiro apex',
  'safety net para retirar dinero',
  'umbral minimo para hacer retiros',
  'colchon de seguridad en cuentas',
  'threshold de proteccion general',
  'cual es el umbral minimo en apex',
  'cual es el safety net para retirar',
  'primer payout minimo',
  'monto minimo primer retiro'
];

async function runPrepinAnalysis() {
  console.log('=== PRD-APEX-WITHDRAWALS-MCP-FINAL: PREPIN ANALYSIS ===');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNx5zPRJi1zJuVXS5cN2WjGb7Gbo'
  );

  const results = [];
  
  for (const q of WITHDRAWAL_QUERIES) {
    try {
      const { data, error } = await supabase.rpc('faq_retrieve_es_v3', {
        q: q,
        firm_id: FIRM_ID,
        k: 8
      });
      
      if (error) throw error;
      
      const top8 = data || [];
      const prepin_count = top8.length;
      const has_385d0f21 = top8.some(r => r.id === TARGET_FAQ);
      const chosen_id = top8[0]?.id || null;
      
      // Stage derail si no se elige 385d0f21 como #1
      const stage_derail = chosen_id !== TARGET_FAQ ? 'WRONG_TOP1' : '';
      
      results.push({
        q,
        prepin_count,
        has_385d0f21,
        chosen_id,
        stage_derail,
        top8_ids: top8.map(r => r.id).slice(0, 8)
      });
      
      console.log(`✓ ${q}: ${prepin_count} results, target=${has_385d0f21}, top1=${chosen_id === TARGET_FAQ ? 'OK' : 'FAIL'}`);
      
    } catch (err) {
      console.error(`✗ ${q}:`, err.message);
      results.push({
        q,
        error: err.message,
        stage_derail: 'RPC_ERROR'
      });
    }
  }
  
  // Write analysis
  await writeFile(OUTPUT_PATH, JSON.stringify({
    timestamp: new Date().toISOString(),
    firm_id: FIRM_ID,
    target_faq: TARGET_FAQ,
    rival_faq: RIVAL_FAQ,
    total_queries: WITHDRAWAL_QUERIES.length,
    results
  }, null, 2));
  
  console.log(`\n=== PREPIN ANALYSIS COMPLETE ===`);
  console.log(`Results written to: ${OUTPUT_PATH}`);
  
  const failures = results.filter(r => r.stage_derail);
  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length} failures detected:`);
    failures.forEach(f => console.log(`  - ${f.q}: ${f.stage_derail}`));
  } else {
    console.log(`\n✅ All ${results.length} queries passed prepin check`);
  }
}

if (require.main === module) {
  runPrepinAnalysis().catch(console.error);
}

module.exports = { runPrepinAnalysis };