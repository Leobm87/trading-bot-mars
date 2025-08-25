# MARS - TRADING BOT ARCHITECTURE

## STATUS
- ✅ ApexService (30 FAQs, 11 tests passing)
- ✅ Router (7 firms detection, 30 tests passing)
- ✅ Gateway (Telegram + Express API, 24 tests passing)
- Building in C:\Users\braia\Desktop\trading-bot-mars
- Legacy bot active at Railway (telegram-bot-production-299b.up.railway.app)
- Full docs: /docs/claude-full.md (only if needed)

## CURRENT TASK
✅ Phase 4 Complete - Gateway Service Built
Next: Phase 5 - Build BulenoxService or start Shadow Testing

## DATABASE
SUPABASE_URL=https://zkqfyyvpyecueybxoqrt.supabase.co
firm_id for Apex = 'Apex Trader Funding'
Tables: faqs (156), prop_firms (7), account_plans (75)

## FIRMS (ISOLATED)
- ✅ Apex (30 FAQs) - ApexService complete
- Bulenox (15 FAQs) - Pending
- TakeProfit (20 FAQs) - Pending
- MyFundedFutures (14 FAQs) - Pending
- Alpha (28 FAQs) - Pending
- Tradeify (36 FAQs) - Pending
- Vision (13 FAQs) - Pending

## VALIDATION RULES
Response MUST NOT contain: bulenox|takeprofit|vision|tradeify|alpha|myfunded

## TEST COMMANDS
```bash
cd C:\Users\braia\Desktop\trading-bot-mars
npm test
```

## COMPLETED PHASES
- ✅ Phase 2: ApexService (isolated firm service)
- ✅ Phase 3: Router (firm detection + context management)
- ✅ Phase 4: Gateway (Telegram + Express API + Mock mode)

## ARCHITECTURE PROGRESS
User → ✅Gateway → ✅Router → ✅ApexService (isolated) → Response

## PHASE: 5/7 - Ready for BulenoxService or Shadow Testing

## RAILWAY DEPLOYMENT
- Project: Telegram bot (af7d80f6-c938-4a82-ae59-2f57d72df559)
- Service: Telegram-bot (5511f807-c09e-4287-adaa-05d2acca9468)
- Environment: production (75ae6e77-301d-4f3c-8186-e38263b3808d)
- Domain: telegram-bot-production-299b.up.railway.app
- Status: Running legacy bot v4.3 (needs MARS code deployment)

## TESTS STATUS
- ApexService: 11/11 ✅
- Router: 30/30 ✅
- Gateway: 24/24 ✅
- Total: 65 tests passing