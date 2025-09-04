-- PRD-APEX-SHORT-ANSWERS: Update 12 FAQs with answer_short_md
-- Target: 100% coverage for concise responses
-- Date: 2025-09-04

-- 1. precios-evaluacion (fc6cb870-1364-4db7-b092-c341c9aa726d)
UPDATE faqs 
SET answer_short_md = '- **25K**: $147/mes
- **50K**: $167/mes  
- **100K**: $207/mes
- **150K**: $297/mes
- **250K**: $517/mes
- **300K**: $657/mes
- **100K Static**: $137/mes

Evaluación de una fase, tiempo ilimitado.'
WHERE id = 'fc6cb870-1364-4db7-b092-c341c9aa726d';

-- 2. max-drawdown-por-cuenta (b0410c27-2dad-44c1-9031-52c4a56f2fc3)
UPDATE faqs 
SET answer_short_md = '**Trailing Drawdown (se congela en balance inicial + $100):**
- 25K: -$1,500
- 50K: -$2,500  
- 100K: -$3,000
- 150K: -$5,000
- 250K: -$6,500
- 300K: -$8,000

**Static:** 100K Static: -$625 fijo'
WHERE id = 'b0410c27-2dad-44c1-9031-52c4a56f2fc3';

-- 3. fase-live (cc3365a5-da92-45b5-b48c-8f89cd64a5ba)
UPDATE faqs 
SET answer_short_md = '- **No hay fase LIVE obligatoria** en APEX.
- Solo evaluación → cuenta PA (financiada).
- APEX puede promoverte a LIVE basado en tu consistencia, pero no hay criterios públicos fijos.'
WHERE id = 'cc3365a5-da92-45b5-b48c-8f89cd64a5ba';

-- 4. limites-por-cuenta (26099319-b39e-4553-8219-1087d440c787)
UPDATE faqs 
SET answer_short_md = '**Contratos máximos por cuenta:**
- 25K: 4 contratos
- 50K: 10 contratos
- 100K: 14 contratos  
- 150K: 17 contratos
- 250K: 27 contratos
- 300K: 35 contratos
- 100K Static: 2 contratos

**Nota:** Solo 50% disponible hasta alcanzar Safety Net.'
WHERE id = '26099319-b39e-4553-8219-1087d440c787';

-- 5. overnight-error (547a10ad-ffac-40ac-8170-240fd01244b1)
UPDATE faqs 
SET answer_short_md = '- **Overnight NO permitido** en cuenta PA (debe cerrar antes de 5PM ET).
- Si dejas posición abierta por error:
  - Primera vez: advertencia
  - Reincidencia: posible suspensión
- Usa stops estrictos y alertas para evitarlo.'
WHERE id = '547a10ad-ffac-40ac-8170-240fd01244b1';

-- 6. planes (9ea973b6-d106-4b54-9cf7-d75805c5d394)
UPDATE faqs 
SET answer_short_md = '**Cuentas disponibles:**
- $25,000 ($147/mes)
- $50,000 ($167/mes)
- $100,000 ($207/mes)
- $150,000 ($297/mes)
- $250,000 ($517/mes)
- $300,000 ($657/mes)
- $100,000 Static ($137/mes)

Una fase, tiempo ilimitado, trailing drawdown.'
WHERE id = '9ea973b6-d106-4b54-9cf7-d75805c5d394';

-- 7. safety-net (da173bf4-8852-4ffc-847f-67486bf3ffd7)
UPDATE faqs 
SET answer_short_md = '**Safety Net (umbral para retiros):**
- 25K: $26,600
- 50K: $52,600
- 100K: $103,100
- 150K: $155,100
- 250K: $256,600
- 300K: $307,600
- 100K Static: $102,600

Debes alcanzarlo para poder retirar.'
WHERE id = 'da173bf4-8852-4ffc-847f-67486bf3ffd7';

-- 8. consistencia-30 (b8336088-d2ad-4bc0-9141-b46d516c7a32)
UPDATE faqs 
SET answer_short_md = '**Regla de consistencia 30%:**
- El día de mayor profit no puede representar >30% del total acumulado.
- Se evalúa al solicitar retiro.
- NO elimina la cuenta, solo bloquea el retiro.
- Ejemplo: Si ganaste $10K total, ningún día puede tener >$3K de profit.'
WHERE id = 'b8336088-d2ad-4bc0-9141-b46d516c7a32';

-- 9. automatizacion (f125dcbc-ca2c-4e8e-8004-1fa36c7b73b2)
UPDATE faqs 
SET answer_short_md = '- **Automatización total prohibida** (bots, algos, HFT).
- **Semi-automatización permitida** con supervisión constante.
- Debes estar presente y tomar decisiones.
- Violación = eliminación inmediata de cuenta.'
WHERE id = 'f125dcbc-ca2c-4e8e-8004-1fa36c7b73b2';

-- 10. copy-trading (615ada0a-564f-4ce0-9c70-9f4918b19d0b)
UPDATE faqs 
SET answer_short_md = '- **Copy trading prohibido** entre diferentes personas.
- **Permitido**: replicar TU estrategia en TUS cuentas.
- **Prohibido**: compartir cuentas o copiar de otros.
- Máximo 20 cuentas por hogar.'
WHERE id = '615ada0a-564f-4ce0-9c70-9f4918b19d0b';

-- 11. escalado-contratos (5b235d0a-b257-4292-adae-df65c21e689c)
UPDATE faqs 
SET answer_short_md = '**Escalado de contratos:**
- Antes del Safety Net: 50% de contratos máximos.
- Después del Safety Net: 100% disponible.
- Al duplicar Safety Net: bonus adicional de contratos.

Ejemplo 50K: 5 contratos → 10 al alcanzar $52,600.'
WHERE id = '5b235d0a-b257-4292-adae-df65c21e689c';

-- 12. safety-net-tamaños (b8cae97b-9fa7-48cb-895b-cfbb81720724)
UPDATE faqs 
SET answer_short_md = '**Safety Net por tamaño:**
- $25K → $26,600 (profit $1,600)
- $50K → $52,600 (profit $2,600)
- $100K → $103,100 (profit $3,100)
- $150K → $155,100 (profit $5,100)
- $250K → $256,600 (profit $6,600)
- $300K → $307,600 (profit $7,600)
- $100K Static → $102,600 (profit $2,600)'
WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';

-- Verification query
SELECT id, slug, 
       CASE WHEN answer_short_md IS NOT NULL THEN '✓' ELSE '✗' END as has_short
FROM faqs 
WHERE firm_id = '854bf730-8420-4297-86f8-3c4a972edcf2'
  AND id IN (
    'fc6cb870-1364-4db7-b092-c341c9aa726d',
    'b0410c27-2dad-44c1-9031-52c4a56f2fc3',
    'cc3365a5-da92-45b5-b48c-8f89cd64a5ba',
    '26099319-b39e-4553-8219-1087d440c787',
    '547a10ad-ffac-40ac-8170-240fd01244b1',
    '9ea973b6-d106-4b54-9cf7-d75805c5d394',
    'da173bf4-8852-4ffc-847f-67486bf3ffd7',
    'b8336088-d2ad-4bc0-9141-b46d516c7a32',
    'f125dcbc-ca2c-4e8e-8004-1fa36c7b73b2',
    '615ada0a-564f-4ce0-9c70-9f4918b19d0b',
    '5b235d0a-b257-4292-adae-df65c21e689c',
    'b8cae97b-9fa7-48cb-895b-cfbb81720724'
  );