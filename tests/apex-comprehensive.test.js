/**
 * Test completo para APEX basado en informacion-apex.txt
 * Verifica que el bot pueda responder todas las preguntas importantes sobre APEX
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('APEX Comprehensive Test Suite', () => {
  const testQuery = (query) => {
    try {
      const result = execSync(
        `RESPONSE_STYLE=short npm run try:apex -- --q "${query}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      const lines = result.split('\n');
      const jsonLine = lines.find(line => line.includes('"ok":'));
      if (jsonLine) {
        return JSON.parse(jsonLine);
      }
      return null;
    } catch (error) {
      console.error(`Error testing query "${query}":`, error.message);
      return null;
    }
  };

  describe('Precios y Tamaños de Cuentas', () => {
    test('debe responder sobre precios de evaluación', () => {
      const result = testQuery('cuanto cuesta la cuenta de 50k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('$167');
      expect(result.res.response).toContain('Precios de Evaluación');
    });

    test('debe responder sobre tamaños disponibles', () => {
      const result = testQuery('que tamaños de cuenta tiene apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('$25,000');
      expect(result.res.response).toContain('$300,000');
    });

    test('debe responder sobre cuenta static', () => {
      const result = testQuery('que es la cuenta static de apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Static account should be mentioned
    });
  });

  describe('Evaluación y Profit Targets', () => {
    test('debe responder sobre profit target', () => {
      const result = testQuery('cual es el profit target de la cuenta de 100k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/\$6,?000/);
    });

    test('debe responder sobre días mínimos de evaluación', () => {
      const result = testQuery('cuantos dias minimos necesito para pasar la evaluacion?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/1 día/i);
    });

    test('debe responder sobre tiempo límite', () => {
      const result = testQuery('cuanto tiempo tengo para pasar la evaluacion?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/ilimitado/i);
    });
  });

  describe('Drawdown y Gestión de Riesgo', () => {
    test('debe responder sobre trailing drawdown', () => {
      const result = testQuery('como funciona el trailing drawdown?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('congela');
      expect(result.res.response).toContain('$100');
    });

    test('debe responder sobre drawdown por cuenta', () => {
      const result = testQuery('cual es el drawdown de la cuenta de 50k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/\$2,?500/);
    });

    test('debe responder sobre ratio riesgo/beneficio', () => {
      const result = testQuery('cual es el ratio maximo de riesgo beneficio?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention 5:1 ratio
    });
  });

  describe('Reglas de Trading', () => {
    test('debe responder sobre regla de consistencia', () => {
      const result = testQuery('como funciona la regla de consistencia del 30%?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('30%');
      expect(result.res.response).toContain('retiro');
    });

    test('debe responder sobre overnight/swing', () => {
      const result = testQuery('puedo dejar posiciones abiertas overnight?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention NO overnight allowed
    });

    test('debe responder sobre news trading', () => {
      const result = testQuery('puedo hacer trading durante noticias?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention one-direction rule
    });

    test('debe responder sobre máximo de cuentas', () => {
      const result = testQuery('cuantas cuentas puedo tener en apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention 20 accounts max
    });
  });

  describe('Contratos y Escalado', () => {
    test('debe responder sobre límites de contratos', () => {
      const result = testQuery('cuantos contratos puedo usar en la cuenta de 100k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/14/);
    });

    test('debe responder sobre escalado de contratos', () => {
      const result = testQuery('cuando puedo usar el 100% de los contratos?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('Safety Net');
    });
  });

  describe('Retiros y Pagos', () => {
    test('debe responder sobre métodos de retiro', () => {
      const result = testQuery('como puedo retirar dinero de apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('WISE');
      expect(result.res.response).toContain('PLANE');
    });

    test('debe responder sobre requisitos de retiro', () => {
      const result = testQuery('que necesito para retirar dinero?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('8 días');
      expect(result.res.response).toContain('5 días');
      expect(result.res.response).toContain('$50');
    });

    test('debe responder sobre safety net', () => {
      const result = testQuery('cual es el safety net de la cuenta de 50k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/\$52,?600/);
    });

    test('debe responder sobre profit split', () => {
      const result = testQuery('como es el profit split en apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('100%');
      expect(result.res.response).toMatch(/\$25,?000/);
    });

    test('debe responder sobre límites de retiro', () => {
      const result = testQuery('cual es el maximo que puedo retirar en la cuenta de 100k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toMatch(/\$2,?500/);
      expect(result.res.response).toContain('primeros 5 retiros');
    });
  });

  describe('Activación PA y Reset', () => {
    test('debe responder sobre costos de activación PA', () => {
      const result = testQuery('cuanto cuesta activar la cuenta pa?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('$85/mes');
      expect(result.res.response).toContain('Pago Único');
    });

    test('debe responder sobre reset de evaluación', () => {
      const result = testQuery('cuanto cuesta resetear mi cuenta?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('$80');
    });
  });

  describe('Comisiones y Plataformas', () => {
    test('debe responder sobre comisiones con links', () => {
      const result = testQuery('cuales son las comisiones en apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      expect(result.res.response).toContain('https://support.apextraderfunding.com');
      expect(result.res.response).toContain('Rithmic');
      expect(result.res.response).toContain('Tradovate');
    });

    test('debe responder sobre plataformas disponibles', () => {
      const result = testQuery('que plataformas puedo usar con apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention NinjaTrader, TradingView, etc.
    });

    test('debe responder sobre diferencia Rithmic vs Tradovate', () => {
      const result = testQuery('que es mejor rithmic o tradovate?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention Tradovate is 15-25% cheaper
    });
  });

  describe('Restricciones y Países', () => {
    test('debe responder sobre países restringidos', () => {
      const result = testQuery('desde que paises no puedo operar con apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention Cuba, Venezuela, etc.
    });

    test('debe responder sobre copy trading', () => {
      const result = testQuery('puedo hacer copy trading en apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention it's prohibited
    });
  });

  describe('Reglas Específicas PA', () => {
    test('debe responder sobre regla 30% PNL negativo', () => {
      const result = testQuery('que es la regla del 30% pnl negativo?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should explain 30% open losses rule
    });

    test('debe responder sobre regla one-direction', () => {
      const result = testQuery('que es la regla one direction en noticias?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should explain only long or short during news
    });
  });

  describe('Saldos Iniciales y Detalles Técnicos', () => {
    test('debe responder sobre saldos iniciales reales', () => {
      const result = testQuery('cual es el saldo inicial real de la cuenta de 50k?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention $47,500
    });

    test('debe responder sobre horarios de trading', () => {
      const result = testQuery('cual es el horario de trading en apex?');
      expect(result).toBeTruthy();
      expect(result.res.ok).toBe(true);
      // Should mention 6PM ET to 5PM ET
    });
  });

  describe('Verificación de Respuestas con Títulos', () => {
    test('las respuestas deben incluir títulos descriptivos', () => {
      const queries = [
        'que tipos de drawdown hay?',
        'como retirar dinero?',
        'cuales son los requisitos para retirar?',
        'que comisiones cobra apex?'
      ];

      queries.forEach(query => {
        const result = testQuery(query);
        expect(result).toBeTruthy();
        expect(result.res.ok).toBe(true);
        // Check for markdown headers (###)
        expect(result.res.response).toMatch(/###/);
      });
    });
  });
});

// Run smoke test
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running APEX Comprehensive Test...\n');
  
  const criticalQueries = [
    'cuanto cuesta la cuenta de 50k?',
    'como puedo retirar mi dinero?',
    'cual es el drawdown de la cuenta de 100k?',
    'hay regla de consistencia?',
    'cuales son las comisiones?',
    'que es el safety net?',
    'cuanto cuesta activar la pa?',
    'puedo dejar posiciones overnight?',
    'cuantos contratos puedo usar?',
    'que plataformas puedo usar?'
  ];

  let passed = 0;
  let failed = 0;

  criticalQueries.forEach(query => {
    try {
      const result = execSync(
        `RESPONSE_STYLE=short npm run try:apex -- --q "${query}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      if (result.includes('"ok":true')) {
        console.log(`✅ PASS: "${query}"`);
        passed++;
      } else {
        console.log(`❌ FAIL: "${query}"`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: "${query}"`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}