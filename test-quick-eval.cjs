require('dotenv').config();

async function quickEval() {
  const { processQueryFirm } = require('./services/common/main.cjs');
  
  // Test only withdrawals specific queries to confirm 19/19
  const withdrawalsQueries = [
    {q: "cual es el safety net para retirar", expected: "b8cae97b-9fa7-48cb-895b-cfbb81720724"},
    {q: "¿Cuál es el umbral mínimo (Safety Net) para poder retirar en APEX?", expected: "b8cae97b-9fa7-48cb-895b-cfbb81720724"},
    {q: "retiro apex umbral", expected: "b8cae97b-9fa7-48cb-895b-cfbb81720724"}, 
    {q: "umbral para retirar en apex", expected: "b8cae97b-9fa7-48cb-895b-cfbb81720724"},
    {q: "primer payout minimo", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "primer retiro limite", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "limites primer payout", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "primeros 5 retiros", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "minimo retiro apex", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "monto minimo retirar", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "cuando puedo retirar primera vez", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "monto minimo primer retiro", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "cuanto cobrar primer payout", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "primer cobro cuanto", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "importe mínimo retiro", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "mínimo para cobrar", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "primer pago mínimo", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "primer pago en apex", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"},
    {q: "cuánto es el mínimo para retirar", expected: "385d0f21-fee7-4acb-9f69-a70051e3ad38"}
  ];
  
  let hits = 0;
  const latencies = [];
  
  for (const {q, expected} of withdrawalsQueries) {
    const start = Date.now();
    try {
      const result = await processQueryFirm(q);
      const latency = Date.now() - start;
      latencies.push(latency);
      
      if (result.faq_id === expected) {
        hits++;
      } else {
        console.log(`❌ ${q}: got ${result.faq_id}, expected ${expected}`);
      }
    } catch (error) {
      console.log(`💥 ${q}: ${error.message}`);
    }
  }
  
  const p50 = latencies.sort((a,b) => a-b)[Math.floor(latencies.length/2)];
  
  console.log({
    withdrawals_hit_rate: `${hits}/${withdrawalsQueries.length}`,
    p50_latency_ms: p50,
    total_latency_ms: latencies.reduce((a,b) => a+b, 0)
  });
}

quickEval().catch(console.error);