/**
 * PRD-APEX-WITHDRAWALS-FENCE-LOCK-1: Test sanity para las 11 queries de retiro
 * Verifica que cada query tenga prepin_count > 0 y has_385d0f21 = true
 */

const fs = require('fs');
const path = require('path');

const TARGET_FAQ_ID = '385d0f21-fee7-4acb-9f69-a70051e3ad38'; // apex.payout.limites-retiro

const WITHDRAWAL_QUERIES = [
  "monto minimo primer retiro",
  "cuanto cobrar primer payout", 
  "minimo retiro apex",
  "cuando puedo retirar primera vez",
  "primer cobro cuanto",
  "monto minimo retirar",
  "importe mínimo retiro",
  "mínimo para cobrar",
  "primer pago mínimo",
  "primer pago en apex",
  "cuánto es el mínimo para retirar"
];

describe('Retriever Withdrawals Prepin Sanity', () => {
  let prepinData;

  beforeAll(() => {
    const prepinPath = path.join(__dirname, '../../logs/analysis/APEX-withdrawals.prepin.json');
    if (!fs.existsSync(prepinPath)) {
      throw new Error(`Prepin file not found: ${prepinPath}. Run withdrawals-diagnose first.`);
    }
    prepinData = JSON.parse(fs.readFileSync(prepinPath, 'utf8'));
  });

  test('should have prepin data for all 11 withdrawal queries', () => {
    expect(prepinData).toBeDefined();
    expect(prepinData.queries).toBeDefined();
    expect(prepinData.queries).toHaveLength(11);
  });

  WITHDRAWAL_QUERIES.forEach(query => {
    test(`"${query}" should have prepin_count > 0 and has_385d0f21 = true`, () => {
      const queryResult = prepinData.queries.find(q => q.query === query);
      
      expect(queryResult).toBeDefined();
      expect(queryResult.prepin_count).toBeGreaterThan(0);
      expect(queryResult.has_385d0f21).toBe(true);
    });
  });

  test('should have summary with correct target_hit_rate', () => {
    expect(prepinData.summary).toBeDefined();
    expect(prepinData.summary.target_hit_rate).toBe('11/11');
    expect(prepinData.summary.has_target_count).toBe(11);
  });
});

module.exports = { WITHDRAWAL_QUERIES, TARGET_FAQ_ID };