const fs = require('fs');
const path = require('path');

describe('Anti-trampas: No .only/.skip/.todo en tests', () => {
  test('No debe haber describe.only, it.only, test.only, skip, todo', () => {
    const testFiles = [];
    
    function findTestFiles(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          findTestFiles(fullPath);
        } else if (item.endsWith('.test.js') || item.endsWith('.spec.js')) {
          testFiles.push(fullPath);
        }
      }
    }
    
    findTestFiles(process.cwd());
    
    const forbidden = [
      /\bdescribe\.only\b/,
      /\bit\.only\b/, 
      /\btest\.only\b/,
      /\.(skip|todo)\(/
    ];
    
    const violations = [];
    
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const regex of forbidden) {
          if (regex.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), file),
              line: i + 1,
              content: line.trim(),
              pattern: regex.source
            });
          }
        }
      }
    }
    
    if (violations.length > 0) {
      const msg = violations.map(v => 
        `${v.file}:${v.line} - "${v.pattern}" encontrado: ${v.content}`
      ).join('\n');
      
      throw new Error(`Tests contaminados encontrados:\n${msg}`);
    }
    
    console.log(`✓ ${testFiles.length} archivos de test verificados sin problemas`);
  });
});