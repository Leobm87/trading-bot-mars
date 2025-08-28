const fs = require('fs');

function norm(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function loadPins(){
  try { return JSON.parse(fs.readFileSync('data/pins/apex.json','utf8')); }
  catch { return { firm:'apex', rules: [] }; }
}

function resolvePin(firm, q){
  const pins = loadPins();
  if (pins.firm !== firm || !Array.isArray(pins.rules)) return null;
  const text = norm(q);
  for (const r of pins.rules){
    try {
      const re = new RegExp(r.re, 'i');
      if (re.test(text)) return r.faq_id || null;
    } catch { /* regex inválido → ignora */ }
  }
  return null;
}

module.exports = { resolvePin };