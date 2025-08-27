function formatFromFAQ(faq) {
  return { ok: true, source: "db", faq_id: faq.id, text: faq.answer_md };
}

function notFound() {
  return { ok: false, source: "none", text: "No encuentro esa info exacta en la base. Reformula o especifica la firma/tamaño." };
}

module.exports = { formatFromFAQ, notFound };