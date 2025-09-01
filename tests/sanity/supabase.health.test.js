const { execSync } = require('child_process');
const path = require('path');

describe('Supabase Health Check', () => {
  test('database connection and RPC probes should be healthy', () => {
    let result, stdout, stderr;
    
    try {
      stdout = execSync('node scripts/db-health.cjs', {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 10000
      });
      
      result = JSON.parse(stdout);
    } catch (error) {
      if (error.stdout) {
        try {
          result = JSON.parse(error.stdout);
        } catch (parseError) {
          throw new Error(`Health check failed with non-JSON output: ${error.stdout}`);
        }
      } else {
        throw new Error(`Health check script execution failed: ${error.message}`);
      }
    }

    // Verificar estructura básica del resultado
    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('env_ok');
    expect(result).toHaveProperty('probes');
    expect(result).toHaveProperty('latency_ms');
    expect(result).toHaveProperty('details');

    // Si falta configuración de env, dar mensaje claro
    if (!result.env_ok) {
      throw new Error(`Missing or invalid environment variables: ${result.details}`);
    }

    // Verificar que todas las probes tengan resultados válidos
    expect(result.probes).toHaveLength(3);
    result.probes.forEach((probe, index) => {
      expect(probe).toHaveProperty('q');
      expect(probe).toHaveProperty('count');
      expect(probe).toHaveProperty('latency_ms');
      
      if (probe.count === 0) {
        throw new Error(`Probe "${probe.q}" returned 0 results. DB may be empty or RPC not working.`);
      }
      
      expect(probe.count).toBeGreaterThan(0);
    });

    // El resultado general debe ser OK
    if (!result.ok) {
      throw new Error(`Health check failed: ${result.details}`);
    }

    expect(result.ok).toBe(true);
  });
});