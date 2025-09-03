/* PRD-APEX-WITHDRAWALS-HOTFIX-2 semantic fences */
const buckets = {
  withdrawals: [
    // PRD-APEX-WITHDRAWALS-MCP-FINAL: withdrawals_lock con prioridad
    /\b(primer|primera)\s+(retiro|payout|cobro)\b/i,
    /\b(min(?:imo|imum)?|mínimo)\s+(retiro|withdraw(al)?|payout)\b/i,
    /\b(cu[aá]ndo|cuando)\s+(cobro|retiro|me\s+pagan|pago|payout)\b/i,
    /\b(retiro|retirar|withdraw(al)?|payout|cobro)\b.*\b(l[ií]mite|l[íi]mites|min(?:imo|imum)?|mínimo|primero)\b/i,
    // RETIRO (precedencia máxima) - PRD-APEX-WITHDRAWALS-HOTFIX-2
    /\b(min|minimo|min\.)\b.*\b(retir|withdraw|payout|cash ?out|cobro|cobrar)\b|\b(primer|primera|first)\b.*\b(retir|payout|cobro)\b/i,
    /payout mínimo/i, /mínimo de retiro/i, /primer retiro/i, /first payout/i, /min cashout/i, /primer cobro/i,
    /valor minimo retiro/i, /cuanto retiro.*primer/i, /monto.*minimo.*retir/i, /minimo.*retir/i,
    /importe.*minimo.*retir/i, /retiro.*inicial/i, /primer.*pago/i,
    // Safety net CON contexto retiro específico
    /safety net para retir/i, /umbral.*retir/i, /threshold.*retir/i, /balance requerido.*payout/i,
    // Frequency y otros retiros  
    /frecuencia de pagos/i, /cada cuánto pagan/i, /periodicidad retiros/i, /timing retiros/i,
    /requisitos retiro/i, /limite retiro/i, /maximo retiro/i
  ],
  pricing: [/cuotas-activacion/i, /activacion/i, /activation fee/i, /cuota de activacion/i, /pago unico/i, /suscripcion mensual/i, /reset-evaluacion/i, /reset/i, /reinicio/i, /restart/i, /pago inmediato/i, /renovacion/i, /planes-disponibles/i, /tamanos/i, /precios/i, /planes/i, /1-step/i, /static/i],
  payment_methods: [/\b(forma[s]?\s+de\s+pago|metodo[s]?\s+de\s+pago|pago|pagar|tarjeta|cr[eé]dito|d[eé]bito|paypal|stripe|wise|transferencia|sepa|iban|i[\W_]*deal|bancontact|apple\s*pay|google\s*pay|sofort|giropay|suscripci[óo]n|pago\s*u[níi]co)\b/i],
  rules: [
    // SAFETY_NET (después de withdrawals) - solo si NO tiene contexto retiro
    /\b(safety\s*net|colchon|red de seguridad|umbral)\b(?!.*\b(retir|withdraw|payout|cash ?out|cobro|cobrar)\b)/i,
    /safety net por tamaño/i, /colchon de seguridad en cuentas/i, /umbral de protección/i, /protección de cuenta/i, 
    /dime safety net/i, /que colchon tiene apex/i, /proteccion umbral para trading/i, /threshold de proteccion general/i,
    /colchon seguridad no retiro/i, /umbral trading/i,
    // Resto reglas
    /drawdown-tipos/i, /trailing drawdown/i, /static drawdown/i, /congelacion drawdown/i, /evaluacion-objetivo-minimos/i, /profit target/i, /dias minimos/i, /tiempo limite/i, /overnight-news/i, /overnight/i, /swing/i, /news/i, /one-direction/i, /horario-sesion/i, /horario/i, /sesion/i, /6pm et a 4:59pm et/i, /escalado-contratos/i, /contratos maximos/i, /escalado/i, /porcentaje 50%/i, /micros/i, /regla-30-negativo/i, /30% pnl negativo/i, /perdidas abiertas 30%/i, /safety net 30%/i, /gestion-riesgo/i, /5:1/i, /stops/i, /no usar todo drawdown/i, /comisiones/i, /fees/i, /rithmic/i, /tradovate/i, /round trip/i, /comisiones/i, /pagos-requisitos-auditoria/i, /auditoria/i, /zoom/i, /logs 30 dias/i, /probation/i, /copy trading prohibido/i, /automatizacion/i
  ],
  platforms: [/plataformas-disponibles/i, /plataformas disponibles/i, /ninjatrader/i, /tradovate/i, /rithmic/i, /wealthcharts/i, /tradingview/i, /r-trader abierto/i, /tradovate abierto/i, /plataformas abiertas requeridas/i],
  discounts: []
};

const order = ["withdrawals", "payment_methods", "rules", "pricing", "platforms", "discounts"];

function gateIntent(query) {
  const q = String(query || '').toLowerCase();
  
  // PRD-APEX-WITHDRAWALS-HOTFIX-2: precedencia y exclusiones
  
  // 1) WITHDRAWALS tiene precedencia sobre PAYMENT_METHODS (PRD-APEX-WITHDRAWALS-FENCE-LOCK-3)
  if (/\b(retir|retiro|retirar|retirada|withdraw|payout|cash ?out|cobro|cobrar)\b/i.test(q)) {
    return ["withdrawals"];
  }
  
  // 2) PAYMENT_METHODS solo si NO hay contexto retiro
  if (/\b(tarjeta|paypal|stripe|wise|transferencia|sepa|iban|ideal|iDEAL|bancontact|apple pay|google pay|sofort|giropay|suscripción|pago único)\b/i.test(q) && !/\b(retir|retiro|retirar|retirada|withdraw|payout|cash ?out|cobro|cobrar)\b/i.test(q)) {
    return ["payment_methods"];
  }
  
  // 3) SAFETY_NET solo si NO hay contexto retiro
  if (/\b(safety\s*net|colchon|umbral)\b/i.test(q) && !/\b(retir|retiro|retirar|retirada|withdraw|payout|cash ?out|cobro|cobrar)\b/i.test(q)) {
    return ["rules"];
  }
  
  // 4) PAYMENT_METHODS con exclusión de retiro (legacy, ya cubierto arriba)
  if (/\b(metod|forma|paypal|tarjeta|visa|mastercard)\b/i.test(q) && !/\b(retir|retiro|retirar|retirada|withdraw|payout|cash ?out|cobro|cobrar)\b/i.test(q)) {
    return ["payment_methods"];
  }
  
  // Default: procesar orden normal
  const hits = order.filter(k => buckets[k].some(r => r.test(q)));
  return hits.length ? hits : order;
}

module.exports = { gateIntent };
