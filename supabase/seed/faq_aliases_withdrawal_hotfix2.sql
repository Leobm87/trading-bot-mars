-- PRD-APEX-WITHDRAWALS-HOTFIX-2: Aliases multi-palabra específicas para withdrawals
-- Target FAQ: 385d0f21-fee7-4acb-9f69-a70051e3ad38 (apex.payout.limites-retiro)

-- Añadir las 16 frases específicas requeridas
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'importe mínimo retiro',
    'mínimo para cobrar',
    'primer pago mínimo',
    'primer pago en apex',
    'cuánto es el mínimo para retirar',
    'cuánto puedo cobrar la primera vez',
    'retiro inicial mínimo',
    'cuando puedo retirar primera vez',
    'cuanto cobrar primer payout',
    'monto minimo primer retiro',
    'minimo retiro apex',
    'primer cobro cuanto',
    'monto minimo retirar'
  ]
) WHERE id = '385d0f21-fee7-4acb-9f69-a70051e3ad38';

-- Limpiar aliases ambiguos en FAQs rivales

-- FAQ safety_net general (b8cae97b) - quitar aliases con "primer/retiro" ambiguos
UPDATE faqs SET aliases = array_remove(aliases, 'primer retiro') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';
UPDATE faqs SET aliases = array_remove(aliases, 'retiro') WHERE id = 'b8cae97b-9fa7-48cb-895b-cfbb81720724';

-- FAQ payment methods (4c484cef) - hacer aliases más específicos (métodos)
UPDATE faqs SET aliases = array_remove(aliases, 'primer payout') WHERE id = '4c484cef-5715-480f-8c16-914610866a62';
UPDATE faqs SET aliases = array_remove(aliases, 'payout') WHERE id = '4c484cef-5715-480f-8c16-914610866a62';
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'métodos de pago disponibles',
    'formas de pago aceptadas',
    'cómo pagar con paypal'
  ]
) WHERE id = '4c484cef-5715-480f-8c16-914610866a62';

-- FAQ payout frequency (4d45a7ec) - hacer específico a frecuencia
UPDATE faqs SET aliases = array_remove(aliases, 'primer retiro') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';
UPDATE faqs SET aliases = array_remove(aliases, 'primer payout') WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';
UPDATE faqs SET aliases = array_cat(aliases, ARRAY[
    'frecuencia de pagos',
    'cada cuánto pagan',
    'periodicidad retiros'
  ]
) WHERE id = '4d45a7ec-0812-48cf-b9f0-117f42158615';

SELECT 'PRD-APEX-WITHDRAWALS-HOTFIX-2 aliases applied' as status;