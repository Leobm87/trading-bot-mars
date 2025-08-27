// services/common/retriever.js
const MIN_ROWS = 3;

async function retrieveTopK(supabase, query, cats, k = Number(process.env.RETRIEVE_K || 8)) {
  const call = async (catsArg) => {
    const { data, error } = await supabase.rpc('faq_retrieve_es', { q: query, cats: catsArg, k });
    if (error) throw error;
    return data || [];
  };

  const hasCats = Array.isArray(cats) && cats.length > 0;
  let rows = await call(hasCats ? cats : null);

  if (rows.length < MIN_ROWS && hasCats) {
    const fb = await call(null);
    if (fb.length > rows.length) rows = fb;
  }
  return rows;
}

function confidentTop1(cands) {
  const [a, b] = [cands[0], cands[1] || { score: 0 }];
  return a && a.score >= 0.45 && (a.score - b.score) >= 0.12 ? a : null;
}

module.exports = { retrieveTopK, confidentTop1 };