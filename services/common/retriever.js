async function retrieveTopK(supabase, query, cats, k = 8) {
  const { data, error } = await supabase.rpc('faq_retrieve_es', { q: query, cats: null, k });
  if (error) throw error;
  return data || [];
}

function confidentTop1(cands) {
  const [a, b] = [cands[0], cands[1] || { score: 0 }];
  return a && a.score >= 0.45 && (a.score - b.score) >= 0.12 ? a : null;
}

module.exports = { retrieveTopK, confidentTop1 };