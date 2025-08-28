#!/usr/bin/env node
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');

function run(cmd){ return execSync(cmd, { stdio: ['ignore','pipe','pipe'] }).toString().trim(); }

const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-'); // YYYY-MM-DD-HH-MM-SS
const metricsRaw = run('npm run -s eval:apex');
const tryOutRaw = run('npm run -s try:apex');
const metrics = JSON.parse(metricsRaw);
// try:apex returns multiple JSON objects, parse each line and take the final summary
const tryLines = tryOutRaw.split('\n').filter(line => line.trim());
let tryOut;
for (const line of tryLines.reverse()) {
  try {
    const parsed = JSON.parse(line);
    if (parsed.prd && parsed.smoke_done) {
      tryOut = parsed;
      break;
    }
  } catch (e) {
    // skip invalid JSON lines
  }
}

fs.mkdirSync('logs/metrics', { recursive:true });
const file = path.join('logs/metrics', `apex-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify({ metrics, tryOut, ts: new Date().toISOString() }, null, 2));

// STATUS.md
const status = [
  `# STATUS`,
  `- ts: ${new Date().toISOString()}`,
  `- exact_at_1: ${metrics.exact_at_1 ?? 'n/a'}`,
  `- p50_ms: ${metrics.latency_ms?.p50 ?? 'n/a'}`,
  `- pins: ${(JSON.parse(fs.readFileSync('data/pins/apex.json','utf8')).rules||[]).length}`
].join('\n');
fs.writeFileSync('STATUS.md', status);

console.log(JSON.stringify({ ok:true, file, status_written:true }, null, 2));