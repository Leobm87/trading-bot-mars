const fs = require('fs');

function compileAllPins() {
  const raw = fs.readFileSync('data/pins/apex.json','utf8');
  const cfg = JSON.parse(raw);
  const rules = cfg?.rules || [];
  const MAX_LEN = 120;
  for (const r of rules) {
    expect(typeof r.re).toBe('string');
    expect(r.re.length).toBeLessThanOrEqual(MAX_LEN);
    // Prohibir inline modifiers tipo (?i)
    expect(r.re.includes('(?i)')).toBe(false);
    // Compila con flag i
    // Si el patrón trae delimitadores /.../, limpia:
    const pat = r.re.replace(/^\/|\/[gimsuy]*$/g,'');
    expect(() => new RegExp(pat, 'i')).not.toThrow();
  }
}

test('all pin regexes compile and are reasonable', () => {
  compileAllPins();
});