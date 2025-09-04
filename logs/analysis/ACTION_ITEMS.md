# ACTION ITEMS - Production Health Check
Generated: 2025-09-04T14:58:34.826Z

## 🔴 CRITICAL FIXES NEEDED

### Failed Queries to Fix:
- [ ] Add alias for: "como sacar dinero"
- [ ] Add alias for: "como sacar plata"
- [ ] Add alias for: "puedo retirar ya"
- [ ] Add alias for: "cuando cobro"
- [ ] Add alias for: "minimo para sacar"
- [ ] Add alias for: "safty net"
- [ ] Add alias for: "regla consistensia"
- [ ] Add alias for: "retiro minimo"
- [ ] Add alias for: "apex"
- [ ] Add alias for: "info"
- [ ] Add alias for: "withdraw minimo"
- [ ] Add alias for: "overnight trading"

### SQL to Add Aliases:
```sql
-- Add to faq_aliases table

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('como sacar dinero', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('como sacar plata', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('puedo retirar ya', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('cuando cobro', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('minimo para sacar', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('safty net', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('regla consistensia', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('retiro minimo', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('apex', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('info', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('withdraw minimo', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));

INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('overnight trading', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));
```

### Performance Issues:


## 📋 Next Steps:
1. Review failed queries and identify correct FAQ mappings
2. Add aliases to database
3. Test with `npm run try:apex`
4. Run health check again to verify fixes
