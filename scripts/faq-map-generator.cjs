const fs = require('fs');
const path = require('path');

// Script para generar un mapa ID -> slug para diagnóstico preciso

const faqMapping = {
  // PRECIOS Y PLANES
  "695fe96b-19a3-4b05-b43b-b8c3833de569": "cuotas-activacion", // Cuotas de activación PA
  "93849616-e113-43ee-8319-e32d44c1baed": "precios-cuentas", // Cuánto cuestan las cuentas de evaluación
  "79b0be6c-7365-4845-a5bc-88a35ae6b10c": "planes-disponibles", // Qué tamaños de cuenta están disponibles y cuál es su precio
  "9ea973b6-d106-4b54-9cf7-d75805c5d394": "planes", // Qué tamaños de cuenta ofrece APEX
  
  // COMISIONES  
  "4d503259-dd0e-4807-b8bf-89c18a39253d": "comisiones", // Cuáles son las comisiones aproximadas por mercado/plataforma
  
  // SAFETY NET / UMBRAL
  "da173bf4-8852-4ffc-847f-67486bf3ffd7": "safety-net", // Cuál es el Safety Net (umbral) por tamaño
  "a0efa7bb-7219-41d7-8317-55e3fd3c9f0c": "umbral-minimo", // Cuál es el umbral mínimo (Safety Net) para poder retirar en APEX
  "a7615c5a-9daa-49a7-8aaf-12499819b4cc": "apex-safety-net", // Cuál es el umbral mínimo (Safety Net) para poder retirar
  
  // RETIROS MÍNIMOS / PAYOUTS
  "4d45a7ec-0812-48cf-b9f0-117f42158615": "payouts-frecuencia", // Cada cuánto puedo retirar y cuál es el mínimo en APEX
  "8ed04281-8628-4787-ad5e-ed7e5938afd3": "payout-frecuencia", // Cada cuánto puedo retirar dinero
  "bed584a4-c195-4981-892a-3b33df356e21": "limits-retiro", // Cuáles son los límites de retiro en APEX
  
  // HORARIOS Y SESIÓN
  "dfd0f38b-a6f1-4f40-8772-03424b00fdc7": "horario-sesion", // Cuál es el horario de sesión de APEX
  
  // NOTICIAS Y EVALUACIÓN
  "a52c53f3-8f43-43d1-9d08-4cab9b2f0fea": "apex-evaluation-rules", // Cuáles son las reglas de la evaluación
  "e8a1e102-393d-4bc1-b551-e2cf7f521ed8": "overnight-news", // Puedo hacer overnight o tradear noticias en APEX
  
  // SALDOS INICIALES
  "fd2f4df9-950b-4059-a8cf-1c2e45195fdd": "saldos-iniciales-reales", // Cuáles son los saldos iniciales reales de las cuentas PA
  
  // MÉTODOS DE PAGO
  "4c484cef-5715-480f-8c16-914610866a62": "metodos-de-pago", // Qué métodos de pago acepta APEX
  
  // RESET
  "8c0189a8-b20d-4adc-859f-18a8885d91e7": "reset-evaluacion", // Cómo hago un reset de la evaluación de APEX
  
  // PLATAFORMAS
  "4ad18cc5-0a00-4a3d-bd11-1ac38352f797": "plataformas-disponibles", // Qué plataformas y proveedores de datos están disponibles en APEX
  
  // DESCUENTOS
  "424e35e9-9d2d-4cc0-bfb5-991f2f8c5047": "descuentos", // Descuentos (hardening golden especifica este ID no encontrado en DB)
  "a5c42153-0610-4192-b149-26bd9914e700": "descuentos", // Hay descuentos o cupones activos
  
  // PAÍSES 
  "11633e70-3f32-408a-8778-796e91740e46": "restricciones-paises", // Existen restricciones por país o por plataforma
  "6a6465dc-15f2-4467-b47f-51f1159828e3": "paises-restringidos", // En qué países no puedo usar APEX
  
  // OTROS
  "21a7f8bc-22c8-4032-a3a2-862b7182e3f9": "payouts-requisitos", // Qué requisitos debo cumplir para retirar en APEX
  "4edf6f7f-1103-4bbc-8021-c76a18133f85": "drawdown-tipos", // Qué tipos de drawdown usa APEX y cómo funciona el trailing
  "12764769-c253-40a2-abdb-ba32b305f48a": "evaluacion-objetivo-minimos", // Cuál es el profit target y días mínimos de la evaluación en APEX
  "5b235d0a-b257-4292-adae-df65c21e689c": "escalado-contratos", // Cómo funciona el escalado de contratos y el uso de contratos por tamaño
  "c2586246-9604-4acb-9831-dc3188d73d42": "regla-30-negativo", // Qué es la regla del 30% PNL negativo en APEX
  "8b327b84-cb63-4312-94cc-b7fcefb97122": "gestion-riesgo", // Qué reglas de gestión de riesgo exige APEX
};

// Identificar slugs canónicos para pins específicos
const canonicalSlugs = {
  "apex.pricing.planes": "precios-cuentas", // 93849616-e113-43ee-8319-e32d44c1baed
  "apex.pricing.activacion": "cuotas-activacion", // 695fe96b-19a3-4b05-b43b-b8c3833de569
  "apex.payout.commissions": "comisiones", // 4d503259-dd0e-4807-b8bf-89c18a39253d
  "apex.risk.safety_net": "apex-safety-net", // a7615c5a-9daa-49a7-8aaf-12499819b4cc
  "apex.payout.min_withdrawal": "payouts-frecuencia", // 4d45a7ec-0812-48cf-b9f0-117f42158615
};

console.log('\\n=== FAQ MAPPING PARA PINS DIAGNOSIS ===');
console.log('\\nCanonical slugs para PRD:');
Object.entries(canonicalSlugs).forEach(([intent, slug]) => {
  const id = Object.keys(faqMapping).find(key => faqMapping[key] === slug);
  console.log(`  ${intent} -> ${slug} (${id?.substring(0,8)})`);
});

console.log('\\nVerificar si estos IDs del golden existen en nuestra BD:');
const goldenPath = path.join(__dirname, '../tests/golden/apex.jsonl');
const goldenText = fs.readFileSync(goldenPath, 'utf8').trim();
const golden = goldenText.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));

const uniqueExpectedIds = [...new Set(golden.map(item => item.expected_faq_id))];
const missingInMap = uniqueExpectedIds.filter(id => !faqMapping[id]);

console.log(`\\nIDs del golden no mapeados: ${missingInMap.length}`);
missingInMap.forEach(id => {
  const query = golden.find(item => item.expected_faq_id === id)?.q;
  console.log(`  ${id.substring(0,8)}: "${query}"`);
});

// Crear archivo de salida
const outputPath = path.join(__dirname, '../logs/analysis/faq-mapping.json');
fs.writeFileSync(outputPath, JSON.stringify({
  canonicalSlugs,
  faqMapping,
  missingInMap
}, null, 2));

console.log(`\\nMapeo guardado en: ${outputPath}`);