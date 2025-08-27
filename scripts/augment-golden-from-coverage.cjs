#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Load coverage data
    const coveragePath = path.join(__dirname, '..', 'data', 'specs', 'apex-coverage.json');
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const coverageFaqs = coverageData.faqs || [];

    // Load exported FAQs to get IDs
    const exportPath = path.join(__dirname, '..', 'data', 'export', 'apex-faqs.json');
    if (!fs.existsSync(exportPath)) {
      console.error('Error: apex-faqs.json not found. Run "npm run export:faqs:apex" first.');
      process.exit(1);
    }
    
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const faqIdBySlug = {};
    exportData.faqs.forEach(faq => {
      faqIdBySlug[faq.slug] = faq.id;
    });

    // Load existing golden test cases
    const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
    let existingLines = [];
    const existingQueries = new Set();
    
    if (fs.existsSync(goldenPath)) {
      existingLines = fs.readFileSync(goldenPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const item = JSON.parse(line);
            existingQueries.add(item.q.toLowerCase());
            return item;
          } catch (e) {
            return null;
          }
        })
        .filter(item => item !== null);
    }

    const newEntries = [];
    
    // Generate new queries from coverage
    coverageFaqs.forEach(faq => {
      if (faq.deprecated) return;
      
      const faqId = faqIdBySlug[faq.slug];
      if (!faqId) {
        console.warn(`No ID found for slug: ${faq.slug}`);
        return;
      }

      // 1. Add the original question if not exists
      const originalQuestion = faq.question;
      if (!existingQueries.has(originalQuestion.toLowerCase())) {
        newEntries.push({
          q: originalQuestion,
          expected_faq_id: faqId,
          source: 'coverage_question'
        });
        existingQueries.add(originalQuestion.toLowerCase());
      }

      // 2. Add a short alias variant
      if (faq.aliases && faq.aliases.length > 0) {
        const shortAlias = faq.aliases[0];
        const aliasQuery = `${shortAlias} apex`;
        
        if (!existingQueries.has(aliasQuery.toLowerCase())) {
          newEntries.push({
            q: aliasQuery,
            expected_faq_id: faqId,
            source: 'coverage_alias'
          });
          existingQueries.add(aliasQuery.toLowerCase());
        }
      }

      // 3. Add category-specific variant (optional)
      if (faq.category && Math.random() < 0.3) { // Only 30% to avoid too many
        let categoryQuery = '';
        
        switch (faq.category) {
          case 'payment_methods':
            categoryQuery = `forma de pago apex`;
            break;
          case 'withdrawals':
            categoryQuery = `retiro apex ${faq.aliases?.[0] || ''}`.trim();
            break;
          case 'pricing':
            categoryQuery = `precio apex ${faq.aliases?.[0] || ''}`.trim();
            break;
          case 'rules':
            categoryQuery = `regla apex ${faq.aliases?.[0] || ''}`.trim();
            break;
          case 'platforms':
            categoryQuery = `plataforma apex ${faq.aliases?.[0] || ''}`.trim();
            break;
        }
        
        if (categoryQuery && !existingQueries.has(categoryQuery.toLowerCase())) {
          newEntries.push({
            q: categoryQuery,
            expected_faq_id: faqId,
            source: 'coverage_category'
          });
          existingQueries.add(categoryQuery.toLowerCase());
        }
      }
    });

    // Limit to reasonable number of new entries
    const maxNewEntries = Math.max(0, 50 - existingLines.length);
    const selectedNewEntries = newEntries.slice(0, maxNewEntries);

    // Append new entries to golden file
    if (selectedNewEntries.length > 0) {
      const newContent = selectedNewEntries
        .map(item => JSON.stringify(item))
        .join('\n') + '\n';
      
      fs.appendFileSync(goldenPath, newContent);
    }

    const summary = {
      added: selectedNewEntries.length,
      total: existingLines.length + selectedNewEntries.length
    };

    console.log('\n=== Augment Golden Summary ===');
    console.log(`Existing entries: ${existingLines.length}`);
    console.log(`New entries added: ${selectedNewEntries.length}`);
    console.log(`Total entries: ${existingLines.length + selectedNewEntries.length}`);
    console.log('\nNew entries by source:');
    
    const bySource = {};
    selectedNewEntries.forEach(e => {
      bySource[e.source] = (bySource[e.source] || 0) + 1;
    });
    
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
    
    console.log('\nSummary:', JSON.stringify(summary));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}