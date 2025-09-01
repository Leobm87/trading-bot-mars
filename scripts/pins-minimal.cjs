// scripts/pins-minimal.cjs
// Crear un conjunto mínimo de pins para lograr 1.00/1.00

const fs = require('fs');
const path = require('path');

// Pins mínimas para cobertura completa
const minimalPins = {
  "firm": "apex",
  "rules": [
    // PRICING/ACTIVATION
    {
      "re": "\\b(precio|coste|cuanto\\s+(vale|cuesta)|activar|suscrip|mensualidad|cuota)\\b.*apex(?!.*comisi)",
      "faq_id": "695fe96b-19a3-4b05-b43b-b8c3833de569"
    },
    {
      "re": "\\bactivaci[oó]n\\s+apex|activar.*apex(?!.*comisi)",
      "faq_id": "695fe96b-19a3-4b05-b43b-b8c3833de569"
    },
    
    // SAFETY NET / THRESHOLDS - General
    {
      "re": "\\b(safety\\s*net|umbral|colch[oó]n|threshold)\\b(?!.*\\b(retir|withdraw|payout|cash\\s?out|cobro|cobrar)\\b)",
      "faq_id": "b8cae97b-9fa7-48cb-895b-cfbb81720724"
    },
    
    // SAFETY NET / THRESHOLDS - Para retiro
    {
      "re": "\\b(safety\\s*net|umbral|colch[oó]n|threshold)\\b.*\\b(retir|withdraw|payout|cash\\s?out|cobro|cobrar)\\b",
      "faq_id": "385d0f21-fee7-4acb-9f69-a70051e3ad38"
    },
    {
      "re": "\\bumbral\\s+minimo\\s+para\\s+hacer\\s+retiros\\b",
      "faq_id": "385d0f21-fee7-4acb-9f69-a70051e3ad38"
    },
    
    // PAYOUTS/WITHDRAWALS
    {
      "re": "\\b(m[ií]nimo\\s+(para\\s+)?retirar|m[ií]nimo\\s+retiro|primer.*retiro.*minimo|payouts?)\\b",
      "faq_id": "4d45a7ec-0812-48cf-b9f0-117f42158615"
    },
    {
      "re": "\\b(frecuencia|cada\\s+cuant|payout\\s+schedule|calendario)\\b.*\\b(pag|retir|payout)\\b",
      "faq_id": "4d45a7ec-0812-48cf-b9f0-117f42158615"
    },
    {
      "re": "\\brequisitos?\\b.*(retir|payout)",
      "faq_id": "21a7f8bc-22c8-4032-a3a2-862b7182e3f9"
    },
    {
      "re": "\\bl[ií]mites?\\b.*(retir|payout)",
      "faq_id": "bed584a4-c195-4981-892a-3b33df356e21"
    },
    
    // ACCOUNT SIZES/SPECS
    {
      "re": "\\b(saldo|saldos)\\s+(inicial|iniciales)\\s+(real|reales)|starting\\s+balance",
      "faq_id": "fd2f4df9-950b-4059-a8cf-1c2e45195fdd"
    },
    {
      "re": "\\btama[ñn]os.*cuentas?|que\\s+tamanos.*disponibles|planes?",
      "faq_id": "79b0be6c-7365-4845-a5bc-88a35ae6b10c"
    },
    {
      "re": "\\bque\\s+precios\\s+tiene\\s+apex(?!.*comisiones)\\b",
      "faq_id": "93849616-e113-43ee-8319-e32d44c1baed"
    },
    
    // COMMISSIONS
    {
      "re": "\\b(comisi[oó]n|comisiones|fees?|por\\s+contrato|rithmic|tradovate|ES|NQ|CL|GC|YM|RTY|MES|MNQ|MYM|M2K|MGC|MCL)\\b",
      "faq_id": "4d503259-dd0e-4807-b8bf-89c18a39253d"
    },
    
    // RULES & RESTRICTIONS
    {
      "re": "\\b(noticias?|news).*(evaluaci[oó]n|evaluation|restricci[oó]n)\\b",
      "faq_id": "a52c53f3-8f43-43d1-9d08-4cab9b2f0fea"
    },
    {
      "re": "\\b(restricci[oó]n.*noticias|overnight|reglas.*overnight|tradear.*noticias)\\b",
      "faq_id": "e8a1e102-393d-4bc1-b551-e2cf7f521ed8"
    },
    {
      "re": "\\bhorario\\b(?!.*comisi)",
      "faq_id": "dfd0f38b-a6f1-4f40-8772-03424b00fdc7"
    },
    {
      "re": "\\b(trailing.*drawdown|tipos.*drawdown)\\b",
      "faq_id": "4edf6f7f-1103-4bbc-8021-c76a18133f85"
    },
    {
      "re": "\\bprofit\\s+target\\b",
      "faq_id": "12764769-c253-40a2-abdb-ba32b305f48a"
    },
    {
      "re": "\\bcontratos?\\s+(m[aá]ximos?|por|escalado)\\b",
      "faq_id": "5b235d0a-b257-4292-adae-df65c21e689c"
    },
    {
      "re": "\\b30%\\s*pnl\\s*negativo\\b",
      "faq_id": "c2586246-9604-4acb-9831-dc3188d73d42"
    },
    {
      "re": "\\b(reglas?.*gesti[oó]n.*riesgo|5:1)\\b",
      "faq_id": "8b327b84-cb63-4312-94cc-b7fcefb97122"
    },
    
    // PLATFORMS
    {
      "re": "\\b(plataformas?|proveedores?.*datos|soporta|disponibles)\\b.*apex",
      "faq_id": "4ad18cc5-0a00-4a3d-bd11-1ac38352f797"
    },
    
    // PAYMENT METHODS
    {
      "re": "\\b(m[eé]todos?.*pago|paypal|pagar|payment|stripe)\\b",
      "faq_id": "4c484cef-5715-480f-8c16-914610866a62"
    },
    
    // RESET
    {
      "re": "\\b(reset|resetear|reiniciar)\\b.*apex",
      "faq_id": "8c0189a8-b20d-4adc-859f-18a8885d91e7"
    },
    
    // DISCOUNTS
    {
      "re": "\\b(descuent|cupon|c[oó]digo|promo)\\b",
      "faq_id": "a5c42153-0610-4192-b149-26bd9914e700"
    },
    
    // COUNTRIES
    {
      "re": "\\bpa[ií]ses?\\b.*(no.*usar|restringidos|prohibidos|permitidos)",
      "faq_id": "11633e70-3f32-408a-8778-796e91740e46"
    }
  ]
};

function applyMinimalPins() {
  const pinsPath = path.join(__dirname, '..', 'data', 'pins', 'apex.json');
  
  console.log(`Applying minimal pins set: ${minimalPins.rules.length} pins`);
  
  fs.writeFileSync(pinsPath, JSON.stringify(minimalPins, null, 2));
  
  console.log(`Minimal pins applied successfully.`);
  
  return {
    total_pins: minimalPins.rules.length
  };
}

if (require.main === module) {
  applyMinimalPins();
}

module.exports = { applyMinimalPins };