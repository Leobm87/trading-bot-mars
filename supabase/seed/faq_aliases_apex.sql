-- PRD-APEX-HARDENING-10: Aliases específicos para TOP failures OFF
-- Basado en análisis de failures: b8cae97b (4x), 4d503259 (3x), 4c484cef (2x)

-- Safety Net General/Trading FAQ (b8cae97b) - NO incluye contexto retiro
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'que colchon tiene apex general',
    'colchon de seguridad en cuentas trading',
    'proteccion umbral para trading',
    'threshold de proteccion general'
  ]
) WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';

-- Platform/Fees FAQ (4d503259) - Aliases para comisiones y fees
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'fees apex',
    'comisiones por contrato apex',
    'cuales son las comisiones por contrato',
    'tengo que tener r-trader tradovate abiertos',
    'cada cuanto puedo retirar cual es minimo'
  ]
) WHERE id = '4d503259-dd0e-4807-b8bf-89c18a39253d';

-- Account sizes (93849616) - Aliases para tamaños y precios
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'tamanos apex',
    'que precios tiene apex'
  ]
) WHERE id = '93849616-e113-43ee-8319-e32d44c1baed';

-- Payment methods (4c484cef) - Aliases para métodos pago y PayPal
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'metodos pago apex',
    'puedo pagar con paypal'
  ]
) WHERE id = '4c484cef-5715-480f-8c16-914610866a62';

-- Activation cost FAQ (695fe96b) - Alias para costo activación
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'cuanto cuesta activar apex'
  ]
) WHERE id = '695fe96b-19a3-4b05-b43b-b8c3833de569';

-- Reset FAQ (8c0189a8) - Alias para reset
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'reset apex'
  ]
) WHERE id = '8c0189a8-b20d-4adc-859f-18a8885d91e7';

-- Safety Net for Withdrawals FAQ (a0efa7bb) - CON contexto retiro específico
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'safety net para retirar dinero',
    'umbral minimo para hacer retiros',
    'colchon de seguridad para payout',
    'red de seguridad minima withdrawal',
    'balance requerido para payout'
  ]
) WHERE id = 'a0efa7bb-7219-41d7-8317-55e3fd3c9f0c';

-- Min Withdrawal FAQ (4d45a7ec) - SOLO frecuencia, SIN montos mínimos
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'periodicidad de pagos apex',
    'timing retiros apex',
    'frecuencia de pagos',
    'cada cuanto pagan'
  ]
) WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';

-- Max contracts FAQ (5b235d0a) - Alias para contratos máximos
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'contratos maximos apex'
  ]
) WHERE id = '5b235d0a-b257-4292-adae-df65c21e689c';

-- Countries FAQ (11633e70) - Alias para países restringidos
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'cuales son los paises donde no puedo usar'
  ]
) WHERE id = '11633e70-3f32-408a-8778-796e91740e46';

-- News rules FAQ (a52c53f3) - Alias para restricciones noticias
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'hay restricciones de noticias evaluacion'
  ]
) WHERE id = 'a52c53f3-8f43-43d1-9d08-4cab9b2f0fea';

-- REVERT conflictive aliases para fix adversarial
UPDATE faqs SET aliases = array_remove(aliases, 'umbral apex') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';
UPDATE faqs SET aliases = array_remove(aliases, 'safety net 25k 50k 300k') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';
UPDATE faqs SET aliases = array_remove(aliases, 'cual es el umbral safety net') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';
UPDATE faqs SET aliases = array_remove(aliases, 'que colchon tiene') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';

-- Añadir aliases específicos al FAQ de withdrawal minimum (a0efa7bb)
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'safety net para retirar dinero',
    'umbral minimo para hacer retiros',
    'balance requerido para payout'
  ]
) WHERE id = 'a0efa7bb-7219-41d7-8317-55e3fd3c9f0c';

-- PRD-APEX-WITHDRAWALS-FENCE-LOCK-1: Limpiar aliases conflictivos del FAQ 4d45a7ec
UPDATE faqs SET aliases = array_remove(aliases, 'minimo para retirar en apex') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';
UPDATE faqs SET aliases = array_remove(aliases, 'primer retiro payout minimo') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';
UPDATE faqs SET aliases = array_remove(aliases, 'valor minimo retiro primera vez') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';
UPDATE faqs SET aliases = array_remove(aliases, 'cuanto retiro en mi primer payout') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';

-- PRD-APEX-WITHDRAWALS-FENCE-LOCK-1: Aliases multi-palabra para min_withdrawal (385d0f21)
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'monto minimo primer retiro',
    'monto minimo retirar', 
    'importe minimo retiro',
    'minimo para cobrar',
    'primer pago minimo',
    'primer pago en apex',
    'cuanto es el minimo para retirar',
    'cuando puedo retirar primera vez'
  ]
) WHERE id = '385d0f21-fee7-4acb-9f69-a70051e3ad38';

SELECT 'Fixed adversarial conflicts - PRD-APEX-HARDENING-10' as status;