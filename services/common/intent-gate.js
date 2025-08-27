const buckets = {
  withdrawals: [/umbral/i, /safety\s*net/i, /mínimo.*retirar/i, /withdraw/i, /payout/i],
  payment_methods: [/métodos?.*pago/i, /formas?.*pago/i, /paypal|tarjeta|crypto|criptom(?:o|ó)nedas|transferencia/i, /payment\s*method/i],
  pricing: [/precio|cuesta|coste|suscripci(?:ó|o)n|fee|activar|activation/i],
  rules: [/regla|norma|drawdown|consistency|trailing|daily\s*loss|overnight|news/i],
  platforms: [/plataform(as)?/i, /ninjatrader|tradovate|quantower|rixo/i],
  discounts: [/descuento|cup(?:o|ó)n|c(?:o|ó)digo|promo|rebaja/i],
};

const order = ['withdrawals','pricing','payment_methods','rules','platforms','discounts'];

function gateIntent(query) {
  const q = String(query||'').toLowerCase();
  const hits = order.filter(k => buckets[k].some(r => r.test(q)));
  return hits.length ? hits : order;
}

module.exports = { gateIntent };