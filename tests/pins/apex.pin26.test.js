// tests/pins/apex.pin26.test.js - Pin #26: Primer retiro/payout queries
const { resolvePin } = require('../../services/common/pinner.cjs');

describe('APEX Pin #26 - Primer retiro/payout', () => {
  const expectedFaqId = '385d0f21-fee7-4acb-9f69-a70051e3ad38';

  describe('True positives - should match primer retiro pattern', () => {
    const truePositives = [
      'primer payout minimo',
      'primer retiro limite', 
      'monto minimo primer retiro',
      'cuanto cobrar primer payout',
      'primer cobro cuanto',
      'primeros retiros limite',
      'primer pago minimo'
    ];

    test.each(truePositives)('should match: "%s"', (query) => {
      const pinId = resolvePin('apex', query);
      expect(pinId).toBe(expectedFaqId);
    });
  });

  describe('False negatives - should not match other patterns', () => {
    const falseNegatives = [
      'segundo retiro apex', // no "primer"
      'retiro normal apex', // no "primer" 
      'primer trading', // no retiro/payout
      'minimo retiro apex', // missing "primer"
      'umbral apex', // different intent
      'precio apex activacion', // different intent
      'reset apex' // different intent
    ];

    test.each(falseNegatives)('should not match: "%s"', (query) => {
      const pinId = resolvePin('apex', query);
      expect(pinId).not.toBe(expectedFaqId);
    });
  });

  test('Total pins should be 26', () => {
    const fs = require('fs');
    const pinsData = JSON.parse(fs.readFileSync('data/pins/apex.json', 'utf8'));
    expect(pinsData.rules.length).toBe(26);
  });

  test('Pin #26 should be the primer retiro pin', () => {
    const fs = require('fs');
    const pinsData = JSON.parse(fs.readFileSync('data/pins/apex.json', 'utf8'));
    const pin26 = pinsData.rules[25]; // 0-indexed
    expect(pin26.faq_id).toBe(expectedFaqId);
    expect(pin26.re).toMatch(/primer.*retiro|payout|cobr|pag/);
  });
});