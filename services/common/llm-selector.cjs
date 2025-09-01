const OpenAI = require('openai');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function llmSelectFAQ(query, candidates) {
  // Lazy instantiation - solo crear client cuando se necesite
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not available for LLM selector');
  }
  
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const prompt = `
You are a STRICT FAQ selector. User query: "${query}"
Choose ONLY one of these IDs or NONE. Do NOT invent.
Candidates:
${candidates.map(c => `[${c.id}] Q: ${c.question}\nA: ${String(c.answer_md||'').slice(0,400)}`).join('\n\n')}
Rules:
- Respond ONLY in JSON: {"type":"FAQ_ID","id":"..."} OR {"type":"NONE"}.
- If uncertain, return NONE.
`;

  const r = await client.chat.completions.create({
    model: MODEL, 
    temperature: 0, 
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(r.choices[0].message.content);
}

module.exports = { llmSelectFAQ };