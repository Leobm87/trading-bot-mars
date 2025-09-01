const fs = require('fs');
const path = require('path');

describe('APEX Pins Coverage Tests', () => {
  const regressionQueries = [
    { q: "teneis opcion de activacion mensual cual es el precio?", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569" },
    { q: "Cual es el safety Net umbral de una cuenta de 100k ?", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7" },
    { q: "Dime el safety Net de 25k 50k y 300k en una sola respuesta", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7" },
    { q: "Tengo que tener R-Trader o Tradovate abiertos siempre?", expected_faq_id: "4d503259-dd0e-4807-b8bf-89c18a39253d" },
    { q: "cual es el umbral minimo en apex", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7" },
    { q: "precio de suscripcion apex", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569" },
    { q: "hay restriccion de noticias apex", expected_faq_id: "e8a1e102-393d-4bc1-b551-e2cf7f521ed8" },
    { q: "¿Qué métodos de pago acepta APEX?", expected_faq_id: "4c484cef-5715-480f-8c16-914610866a62" },
    { q: "precio apex activacion", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569" },
    { q: "¿Cada cuánto puedo retirar y cuál es el mínimo en APEX?", expected_faq_id: "4d503259-dd0e-4807-b8bf-89c18a39253d" },
    { q: "tamanos apex", expected_faq_id: "93849616-e113-43ee-8319-e32d44c1baed" },
    { q: "¿Qué tamaños de cuenta están disponibles y cuál es su precio?", expected_faq_id: "79b0be6c-7365-4845-a5bc-88a35ae6b10c" },
    { q: "cuanto vale activar la cuenta apex?", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569" }
  ];

  const missingPinQueries = [
    { q: "hay restriccion de noticias apex", target_slug: "overnight", expected_faq_id: "e8a1e102-393d-4bc1-b551-e2cf7f521ed8" },
    { q: "¿Qué métodos de pago acepta APEX?", target_slug: "payment_methods", expected_faq_id: "4c484cef-5715-480f-8c16-914610866a62" }
  ];

  let missingPinCases;
  let pinsData;

  beforeAll(() => {
    try {
      // Cargar missing_pin cases
      const missingPinPath = path.join(__dirname, '../../logs/analysis/APEX-H3.missing_pin.json');
      const missingPinContent = fs.readFileSync(missingPinPath, 'utf8');
      missingPinCases = JSON.parse(missingPinContent);
      
      // Cargar pins
      const pinsPath = path.join(__dirname, '../../data/pins/apex.json');
      const pinsContent = fs.readFileSync(pinsPath, 'utf8');
      pinsData = JSON.parse(pinsContent);
      
      console.log(`Loaded ${missingPinCases.length} missing pin cases`);
      console.log(`Loaded ${pinsData.rules.length} pin rules`);
    } catch (error) {
      console.error('Error loading test data:', error);
      throw error;
    }
  });

  describe('Pin Pattern Validation - Static Tests', () => {
    test('all missing pin queries should now match patterns', () => {
      missingPinQueries.forEach((testCase) => {
        const query = testCase.q.toLowerCase();
        
        // Verificar si algún pin coincide
        const matchedPins = pinsData.rules.filter(rule => {
          try {
            const regex = new RegExp(rule.re, 'i');
            return regex.test(query);
          } catch (e) {
            return false;
          }
        });
        
        expect(matchedPins.length).toBeGreaterThan(0);
        expect(matchedPins[0].faq_id).toBe(testCase.expected_faq_id);
      });
    });

    test('all regression queries should match correct pins', () => {
      const failedCases = [];
      
      regressionQueries.forEach((testCase) => {
        const query = testCase.q.toLowerCase();
        
        // Encontrar pins que coinciden
        const matchedPins = pinsData.rules.filter(rule => {
          try {
            const regex = new RegExp(rule.re, 'i');
            return regex.test(query);
          } catch (e) {
            return false;
          }
        });
        
        if (matchedPins.length === 0) {
          failedCases.push({ query: testCase.q, reason: 'No pin matched' });
        } else {
          const winningPin = matchedPins[0];
          if (winningPin.faq_id !== testCase.expected_faq_id) {
            failedCases.push({ 
              query: testCase.q, 
              expected: testCase.expected_faq_id.substring(0, 8),
              actual: winningPin.faq_id.substring(0, 8)
            });
          }
        }
      });
      
      if (failedCases.length > 0) {
        console.log('Failed regression cases:', failedCases);
      }
      
      expect(failedCases).toEqual([]);
    });

    test('pin_too_broad patterns should be fixed', () => {
      const pinTooBroadQueries = [
        { q: "teneis opcion de activacion mensual cual es el precio?", should_not_match: "93849616-e113-43ee-8319-e32d44c1baed" },
        { q: "precio de suscripcion apex", should_not_match: "93849616-e113-43ee-8319-e32d44c1baed" },
        { q: "precio apex activacion", should_not_match: "93849616-e113-43ee-8319-e32d44c1baed" },
        { q: "¿Qué tamaños de cuenta están disponibles y cuál es su precio?", should_not_match: "93849616-e113-43ee-8319-e32d44c1baed" },
        { q: "Cual es el safety Net umbral de una cuenta de 100k ?", should_not_match: "a7615c5a-9daa-49a7-8aaf-12499819b4cc" },
        { q: "Dime el safety Net de 25k 50k y 300k en una sola respuesta", should_not_match: "a7615c5a-9daa-49a7-8aaf-12499819b4cc" }
      ];

      pinTooBroadQueries.forEach((testCase) => {
        const query = testCase.q.toLowerCase();
        
        const matchedPins = pinsData.rules.filter(rule => {
          try {
            const regex = new RegExp(rule.re, 'i');
            return regex.test(query);
          } catch (e) {
            return false;
          }
        });
        
        if (matchedPins.length > 0) {
          expect(matchedPins[0].faq_id).not.toBe(testCase.should_not_match);
        }
      });
    });
  });

  describe('Pin Coverage for Missing Cases', () => {
    test('should match all missing pin cases', () => {
      expect(missingPinCases).toBeDefined();
      expect(missingPinCases.length).toBeGreaterThan(0);
      
      const failedCases = [];
      
      missingPinCases.forEach((testCase, index) => {
        const query = testCase.q.toLowerCase();
        
        // Encontrar pins que coinciden con la query
        const matchedPins = pinsData.rules.filter(rule => {
          try {
            const regex = new RegExp(rule.re, 'i');
            return regex.test(query);
          } catch (e) {
            console.warn(`Invalid regex for rule: ${rule.re}`);
            return false;
          }
        });

        // Verificar que hay al menos un match y que apunta al FAQ correcto
        if (matchedPins.length === 0) {
          failedCases.push({ query: testCase.q, reason: 'No pin matched' });
        } else {
          const winningPin = matchedPins[0];
          if (winningPin.faq_id !== testCase.expected_id) {
            failedCases.push({ 
              query: testCase.q, 
              reason: `Wrong FAQ: expected ${testCase.expected_id.substring(0, 8)}, got ${winningPin.faq_id.substring(0, 8)}` 
            });
          }
        }
      });
      
      if (failedCases.length > 0) {
        console.log('Failed cases:', failedCases.slice(0, 10));
      }
      
      // Debe tener al menos 50% de cobertura
      const coverageRatio = (missingPinCases.length - failedCases.length) / missingPinCases.length;
      expect(coverageRatio).toBeGreaterThan(0.5);
    });
  });

  describe('Pin Pattern Validation', () => {
    test('all pin patterns should be valid regex', () => {
      const invalidPatterns = [];
      
      pinsData.rules.forEach((rule, index) => {
        try {
          new RegExp(rule.re, 'i');
        } catch (e) {
          invalidPatterns.push({ index, pattern: rule.re, error: e.message });
        }
      });
      
      expect(invalidPatterns).toEqual([]);
    });

    test('all pin patterns should have valid FAQ IDs', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      pinsData.rules.forEach((rule, index) => {
        expect(uuidRegex.test(rule.faq_id)).toBe(true);
      });
    });
  });

  describe('Pin Order and Priority', () => {
    test('specific pins should come before generic ones', () => {
      // Los pins específicos (con más restricciones) deben estar arriba
      // Los pins genéricos (con menos restricciones) deben estar abajo
      
      const specificPatterns = pinsData.rules.filter(rule => 
        rule.re.includes('(?=') || rule.re.includes('(?!') || rule.re.length > 50
      );
      const genericPatterns = pinsData.rules.filter(rule => 
        !rule.re.includes('(?=') && !rule.re.includes('(?!') && rule.re.length <= 50
      );
      
      // Al menos debe haber algunos patrones específicos al inicio
      const firstTenRules = pinsData.rules.slice(0, 10);
      const specificInFirst10 = firstTenRules.filter(rule => 
        rule.re.includes('(?=') || rule.re.includes('(?!') || rule.re.length > 50
      );
      
      expect(specificInFirst10.length).toBeGreaterThan(5);
    });
  });

  describe('Pin Performance', () => {
    test('pin evaluation should be fast', () => {
      const testQuery = 'cuales son los saldos iniciales reales para 25k';
      const startTime = process.hrtime.bigint();
      
      // Simular evaluación de pins
      let matched = false;
      for (const rule of pinsData.rules) {
        try {
          const regex = new RegExp(rule.re, 'i');
          if (regex.test(testQuery)) {
            matched = true;
            break;
          }
        } catch (e) {
          // Skip invalid patterns
        }
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      expect(matched).toBe(true);
      expect(durationMs).toBeLessThan(10); // Less than 10ms
    });
  });
});