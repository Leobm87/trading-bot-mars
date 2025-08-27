describe('apex golden eval smoke', () => {
  it('golden file is parseable JSONL', () => {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(__dirname, 'apex.jsonl');
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const l of lines) {
      const o = JSON.parse(l);
      expect(o).toHaveProperty('q');
      expect(o).toHaveProperty('expected_faq_id');
      expect(o).toHaveProperty('intent');
    }
  });
});