# MARS Trading Bot - PRD Methodology

## PROJECT GOAL
Telegram bot for 7 prop trading firms with 100% accurate FAQ responses using ALL Supabase data.

## CRITICAL RULES
- ONE task per PRD (never parallelize)
- EXACT instructions only (no exploration)
- Test BEFORE commit
- NEVER mix firms (isolation mandatory)

## ARCHITECTURE
User → Telegram → Gateway → Router → FirmService → Supabase → Response
↓
OpenAI (fallback)

## DATABASE STRUCTURE
Supabase: zkqfyyvpyecueybxoqrt

faqs (156) - Currently used ✅
account_plans (75) - NOT USED ❌ <- PRIORITY FIX
prop_firms (7) - NOT USED ❌ <- PRIORITY FIX


## SERVICE PATTERN
Each firm service MUST:
1. Load FAQs + account_plans + prop_firms
2. Check pricing queries against account_plans
3. Validate no cross-contamination
4. File: /services/firms/[name]/index.js

## FIRM IDs (Never change)
- apex: 854bf730-8420-4297-86f8-3c4a972edcf2
- bulenox: 7567df00-7cf8-4afc-990f-6f8da04e36a4
- takeprofit: [get from Supabase]
- myfunded: [get from Supabase]
- alpha: 2ff70297-718d-42b0-ba70-cde70d5627b5
- tradeify: [get from Supabase]
- vision: 7863be40-c779-48e5-8d81-f3e4f01df72c

## TEST COMMAND
```bash
npm test -- --testPathPattern=[service]
PRD TEMPLATE
Task: [ONE specific change]
File: [EXACT path]
Change: [EXACT lines/strings]
Test: npm test -- --testPathPattern=[service]
Success: [Expected output]
CURRENT PROBLEM
Bot accuracy 70% because only using FAQs.
SOLUTION: Use account_plans for pricing, prop_firms for info.
FORBIDDEN

Reading multiple files
Adding features while fixing bugs
Parallel changes
Generic improvements

Location: C:\Users\braia\Desktop\trading-bot-mars