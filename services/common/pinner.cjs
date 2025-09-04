const fs = require('fs');

function norm(s){
  return String(s||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function loadPins(){
  try { 
    const pins = JSON.parse(fs.readFileSync('data/pins/apex.json','utf8'));
    // Convertir formato si es array directo
    if (Array.isArray(pins)) {
      return { firm: 'apex', rules: pins };
    }
    return pins;
  }
  catch { return { firm:'apex', rules: [] }; }
}

function resolvePin(firm, q){
  const pins = loadPins();
  // Si es array directo, usar directamente
  const rules = Array.isArray(pins) ? pins : (pins.rules || []);
  if (!Array.isArray(rules)) return null;
  
  const text = norm(q);
  for (const r of rules){
    try {
      // Soportar tanto 're' como 'pattern'
      const pattern = r.re || r.pattern;
      if (!pattern) continue;
      
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) return r.faq_id || null;
    } catch { /* regex inválido → ignora */ }
  }
  return null;
}

module.exports = { resolvePin };