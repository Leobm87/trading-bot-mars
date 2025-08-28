function rrfFuseWeighted(lists, { k=60, weights={} }={}) {
  const acc = new Map(); // id -> { score, item }
  for (const { source, items } of lists) {
    const w = weights[source] ?? 1.0;
    items.forEach((it, idx) => {
      const add = w * (1 / (k + (idx + 1)));
      const cur = acc.get(it.id);
      const next = { score: (cur?.score || 0) + add, item: cur?.item || it };
      acc.set(it.id, next);
    });
  }
  return [...acc.entries()]
    .map(([id, v]) => ({ ...v.item, id, score: v.score }))
    .sort((a,b) => b.score - a.score);
}

function rrfFuse(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((it, idx) => {
      const key = it.id;
      const add = 1.0 / (k + (idx+1));
      scores.set(key, (scores.get(key)||0) + add);
    });
  }
  return (cands) => {
    return [...cands].sort((a,b) => (scores.get(b.id)||0) - (scores.get(a.id)||0));
  };
}

module.exports = { rrfFuseWeighted, rrfFuse };