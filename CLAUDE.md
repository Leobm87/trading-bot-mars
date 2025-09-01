# MARS Trading Bot — RAG-STRICT PRD

## GOAL
100% respuestas basadas en DB para 7 prop firms. Cero alucinaciones.

## RULES (KEEP)
- ONE task per PRD. EXACT instructions. Test BEFORE commit.
- NEVER mix firms (aislamiento por servicio).
- Usa FIRM IDs fijas (apex, bulenox, etc.).
- Regex (JS): usa flags al final del patrón (`/.../i`); PROHIBIDO `(?i)` y lookbehind (`(?<=)`,`(?<!)`).

## NON-NEGOTIABLE
- El LLM NO genera contenido libre. Solo selecciona un `faq_id` de candidatos o devuelve `NONE`.
- La respuesta final sale EXCLUSIVAMENTE de DB (`faqs.answer_md`).

## PIPELINE OBLIGATORIO
1) Intent gating (regex) → categoriza consulta.
2) Retriever DB (FTS + trigram) → Top-8.
3) LLM Selector (OpenAI, JSON estricto) → {"type":"FAQ_ID","id":"..."} o {"type":"NONE"}.
4) Si FAQ_ID → render con `answer_md`. Si NONE → plantilla “no encontrado”.
5) Fallback determinista: acepta Top-1 si `score>=0.45` y margen `>=0.12`.

## DB HEALTH-CHECK OBLIGATORIO
Antes de tocar aliases/expected IDs, ejecuta `npm run health:db` para verificar conexión Supabase.

## ARCHIVOS CLAVE
- services/common/{intent-gate.js,retriever.js,llm-selector.js,format.js}
- services/firms/<firm>/index.js → processQuery() cableado al flujo
- tests/golden/<firm>.test.js (Jest)
