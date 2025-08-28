#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { gateIntent } = require('../services/common/intent-gate.cjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  try {
    // Load golden test file
    const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
    const goldenLines = fs.readFileSync(goldenPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map((line, idx) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error(`Error parsing line ${idx + 1}:`, e.message);
          return null;
        }
      })
      .filter(item => item !== null);

    // Load coverage with aliases
    const coveragePath = path.join(__dirname, '..', 'data', 'specs', 'apex-coverage.json');
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const coverageFaqs = coverageData.faqs || [];

    // Load exported FAQs
    const exportPath = path.join(__dirname, '..', 'data', 'export', 'apex-faqs.json');
    if (!fs.existsSync(exportPath)) {
      console.error('Error: apex-faqs.json not found. Run "npm run export:faqs:apex" first.');
      process.exit(1);
    }
    
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    
    // Build lookup maps
    const faqIdBySlug = {};
    exportData.faqs.forEach(faq => {
      faqIdBySlug[faq.slug] = faq.id;
    });

    // Build alias to slug map from coverage
    const slugByAlias = {};
    coverageFaqs.forEach(faq => {
      if (faq.deprecated) return;
      
      // Add slug itself
      slugByAlias[faq.slug.toLowerCase()] = faq.slug;
      
      // Add all aliases
      if (faq.aliases && Array.isArray(faq.aliases)) {
        faq.aliases.forEach(alias => {
          slugByAlias[alias.toLowerCase()] = faq.slug;
        });
      }
    });

    let updated = 0;
    let notFound = 0;
    let byAliases = 0;
    let byRetriever = 0;
    
    console.log(`Processing ${goldenLines.length} golden test cases...`);

    // Update golden lines
    const updatedLines = [];
    
    for (const item of goldenLines) {
      if (item.expected_faq_id && item.expected_faq_id !== 'REPLACE_ME') {
        updatedLines.push(item); // Already has ID
        continue;
      }

      const query = item.q.toLowerCase();
      let matchedId = null;
      let matchMethod = null;

      // 1. Try alias matching
      for (const [alias, slug] of Object.entries(slugByAlias)) {
        if (query.includes(alias)) {
          const faqId = faqIdBySlug[slug];
          if (faqId) {
            matchedId = faqId;
            matchMethod = 'aliases';
            byAliases++;
            break;
          }
        }
      }

      // 2. If no match, use retriever
      if (!matchedId) {
        const cats = gateIntent(query);
        
        try {
          const { data, error } = await supabase.rpc('faq_retrieve_es', {
            q: query,
            cats: cats.length < 6 ? cats : null,
            k: 3
          });

          if (!error && data && data.length > 0) {
            matchedId = data[0].id;
            matchMethod = 'retriever';
            byRetriever++;
          }
        } catch (e) {
          console.error(`Retriever error for "${query}":`, e.message);
        }
      }

      if (matchedId) {
        updated++;
        const updatedItem = { ...item, expected_faq_id: matchedId };
        if (matchMethod) {
          updatedItem.auto_mapped = matchMethod;
        }
        console.log(`✓ [${matchMethod}] Matched: "${item.q.substring(0, 50)}..." → ${matchedId}`);
        updatedLines.push(updatedItem);
      } else {
        notFound++;
        console.log(`✗ No match: "${item.q.substring(0, 50)}..."`);
        updatedLines.push(item);
      }
    }

    // Write updated golden file
    const updatedContent = updatedLines
      .map(item => JSON.stringify(item))
      .join('\n') + '\n';
    
    fs.writeFileSync(goldenPath, updatedContent);

    const summary = {
      filled: updated,
      by_aliases: byAliases,
      by_retriever: byRetriever,
      unresolved: notFound
    };

    console.log('\n=== Fill Golden IDs Summary ===');
    console.log(`Total lines: ${goldenLines.length}`);
    console.log(`Filled with IDs: ${updated}`);
    console.log(`  - By aliases: ${byAliases}`);
    console.log(`  - By retriever: ${byRetriever}`);
    console.log(`Unresolved: ${notFound}`);
    console.log(`Already had IDs: ${goldenLines.length - updated - notFound}`);
    console.log('\nSummary:', JSON.stringify(summary));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}