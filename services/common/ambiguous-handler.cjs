/**
 * AMBIGUOUS QUERY HANDLER
 * Maneja queries muy cortas o ambiguas con respuestas de clarificación
 */

const AMBIGUOUS_PATTERNS = {
  // Queries ultra cortas
  apex: {
    response: `📊 **APEX Trading - ¿Qué necesitas saber?**

• **Precios y cuentas** - Tamaños desde $25K hasta $300K
• **Proceso de evaluación** - Reglas y requisitos
• **Retiros y pagos** - Mínimos, métodos y frecuencia
• **Reglas de trading** - Drawdown, consistencia, overnight

_Por favor, sé más específico con tu pregunta._`,
    type: 'menu',
    suggestions: ['precios apex', 'reglas apex', 'retiros apex']
  },
  
  info: {
    response: `ℹ️ **¿Qué información necesitas?**

Puedo ayudarte con:
• Tamaños y precios de cuentas
• Proceso de evaluación
• Métodos de pago
• Reglas de trading
• Proceso de retiros

_Hazme una pregunta específica._`,
    type: 'clarification',
    suggestions: ['cuanto cuesta', 'como funciona', 'requisitos']
  },
  
  ayuda: {
    response: `🤝 **¿En qué puedo ayudarte?**

Soy el asistente de APEX Trading. Pregúntame sobre:
• Costos y tarifas
• Reglas y restricciones
• Proceso de financiamiento
• Retiros y pagos

_Ejemplo: "¿Cuál es el mínimo para retirar?"_`,
    type: 'help',
    suggestions: ['precios', 'reglas', 'retiros']
  },
  
  hola: {
    response: `👋 **¡Hola! Soy el asistente de APEX Trading**

Puedo responder preguntas sobre:
• Evaluaciones y cuentas financiadas
• Precios y descuentos
• Reglas de trading
• Retiros y pagos

_¿Qué te gustaría saber?_`,
    type: 'greeting',
    suggestions: ['info general', 'precios', 'empezar']
  },
  
  '?': {
    response: `❓ **Parece que tienes una duda**

Por favor, formula tu pregunta de forma más específica.
Ejemplos:
• "¿Cuánto cuesta la cuenta de $50,000?"
• "¿Hay regla de consistencia?"
• "¿Cómo puedo retirar dinero?"`,
    type: 'clarification',
    suggestions: []
  }
};

// Patterns para detectar queries demasiado cortas
const TOO_SHORT_THRESHOLD = 2; // palabras

function isAmbiguous(query) {
  const normalized = query.toLowerCase().trim();
  
  // Check exact matches
  if (AMBIGUOUS_PATTERNS[normalized]) {
    return true;
  }
  
  // Check if too short
  const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount <= TOO_SHORT_THRESHOLD) {
    // Excepciones: queries cortas pero válidas
    const validShortQueries = [
      /safety\s*net/i,
      /primer\s*(pago|retiro|payout)/i,
      /regla\s*consistencia/i,
      /overnight/i,
      /drawdown/i
    ];
    
    const isValidShort = validShortQueries.some(pattern => pattern.test(normalized));
    if (!isValidShort) {
      return true;
    }
  }
  
  return false;
}

function handleAmbiguous(query) {
  const normalized = query.toLowerCase().trim();
  
  // Direct match
  if (AMBIGUOUS_PATTERNS[normalized]) {
    return {
      handled: true,
      response: AMBIGUOUS_PATTERNS[normalized].response,
      type: AMBIGUOUS_PATTERNS[normalized].type,
      suggestions: AMBIGUOUS_PATTERNS[normalized].suggestions,
      requires_clarification: true
    };
  }
  
  // Generic handler for other short queries
  if (isAmbiguous(query)) {
    return {
      handled: true,
      response: `🔍 **Tu consulta "${query}" es muy general**

Por favor, sé más específico. Puedo ayudarte con:
• Precios y tarifas
• Reglas de trading
• Proceso de evaluación
• Métodos de pago y retiro

_Ejemplo: "¿Cuánto cuesta la evaluación de APEX?"_`,
      type: 'too_short',
      suggestions: ['precios apex', 'reglas apex', 'como empezar'],
      requires_clarification: true
    };
  }
  
  return {
    handled: false
  };
}

module.exports = {
  isAmbiguous,
  handleAmbiguous,
  AMBIGUOUS_PATTERNS
};