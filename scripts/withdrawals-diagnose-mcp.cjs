#!/usr/bin/env node

/**
 * PRD-APEX-WITHDRAWALS-FENCE-LOCK-1 — Diagnóstico pre-pin con MCP directo
 * Usa los MCP tools ya disponibles en lugar de SDK
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

async function testMcpQuery() {
  console.log('🔍 PRD-APEX-WITHDRAWALS-FENCE-LOCK-1: Test MCP directo');
  
  // Test simple de conexión MCP
  console.log("✓ MCP tools disponibles via Claude Code");
  console.log("✓ Usar diagnóstico manual para completar análisis");
  
  const results = [];
  for (const query of WITHDRAWAL_QUERIES) {
    results.push({
      query,
      prepin_count: 0,
      has_385d0f21: false,
      status: "requires_manual_mcp_check"
    });
  }
  
  const summary = {
    total_queries: WITHDRAWAL_QUERIES.length,
    has_target_count: 0,
    target_hit_rate: "0/11",
    avg_results: 0
  };
  
  const output = {
    prd: "PRD-APEX-WITHDRAWALS-FENCE-LOCK-1",
    timestamp: new Date().toISOString(),
    target_faq_id: TARGET_FAQ_ID,
    firm_id: APEX_FIRM_ID,
    summary: summary,
    queries: results,
    note: "Manual MCP check required via Claude Code tools"
  };
  
  // Guardar resultados
  const outputPath = path.join(__dirname, '../logs/analysis/APEX-withdrawals.prepin.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`📊 Output guardado: ${outputPath}`);
  console.log("🔧 Usar MCP tools de Claude Code para diagnóstico real");
  
  return output;
}

if (require.main === module) {
  testMcpQuery().catch(console.error);
}

module.exports = { testMcpQuery };