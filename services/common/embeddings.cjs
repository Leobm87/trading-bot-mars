const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

// Cache LRU simple
const CACHE_MAX = Number(process.env.EMBED_CACHE_MAX || 512);
const _cache = new Map();
function _cacheGet(k){ 
  if(!_cache.has(k)) return null; 
  const v=_cache.get(k); 
  _cache.delete(k); 
  _cache.set(k,v); 
  return v; 
}
function _cacheSet(k,v){ 
  _cache.set(k,v); 
  if(_cache.size > CACHE_MAX){ 
    const first = _cache.keys().next().value; 
    _cache.delete(first);
  } 
}

async function realOpenAIEmbedCall(input) {
  const r = await client.embeddings.create({ model: MODEL, input });
  return r.data[0].embedding;
}

async function embedText(text) {
  const input = String(text||'').slice(0, 4000);
  const key = input.slice(0,256).toLowerCase();
  const hit = _cacheGet(key);
  if (hit) return hit;
  const vec = await realOpenAIEmbedCall(input);
  _cacheSet(key, vec);
  return vec;
}

module.exports = { embedText };