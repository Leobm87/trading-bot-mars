🚀 ELTRADER FINANCIADO - 7-FIRM TELEGRAM BOT

## 📊 PROJECT STATUS (AUG 2025)

Revenue Target: €25K/month → €200K/month  
Business Model: Affiliate marketing for prop trading firms  
Bot Purpose: Convert visitors to customers via intelligent Q&A  

### 🏢 7 FIRMS COVERAGE
| Firm | Status | Bot Accuracy | Info Source |
|------|--------|--------------|-------------|
| 🟠 Apex | ✅ Production | 99.5% | informacion-apex.txt |
| 🔵 Bulenox | ✅ Production | 95%+ | informacion-bulenox.txt |
| 🟢 TakeProfit | ✅ Production | 99.5% | informacion-takeprofit.txt |
| 🟡 MyFundedFutures | ✅ Production | 95%+ | informacion-myfundedfutures.txt |
| 🔴 Alpha Futures | ✅ Production | 99.5% | informacion-alpha-futures.txt |
| ⚪ Tradeify | ✅ Production | 99.5% | informacion-tradeify.txt |
| 🟣 Vision Trade | ✅ Production | 99.5% | informacion-vision.txt |

Current Status: ✅ All 7 firms integrated with 151+ FAQs in database

---

## ⚡ QUICK START COMMANDS

### 1. Database Verification
```javascript
// Verify tables exist
mcpsupabasesupabase_list_tables()

// Check firms in database
mcpsupabasesupabase_query("prop_firms", "id, name")

// Count FAQs by firm
mcpsupabasesupabase_query("faqs", "COUNT(*) as total")
```

### 2. Bot Testing (Interactive System)
```bash
# 🎯 INTERACTIVE TESTING (Real-time conversation with Claude Code visibility)
cd /mnt/c/Users/braia/Desktop/Eltraderfinanciado_Proyecto/railway-deployment
node interactive-bot-tester.js

# 🎭 AUTOMATED DEMO (4-turn conversation showcase)
node test-interactive-demo.js

# 📊 OFFLINE TESTING (Single questions)
node test-bot-offline.js
```

### 3. Git Safety Check
bash
# ALWAYS check before any changes
git branch                  # Confirm you're on correct branch
git status                 # Check for uncommitted changes
pwd                        # Verify correct directory

---

## 🏗️ ARCHITECTURE

### Single Source Bot
- Production File: railway-deployment/multiFirmProductionBot.js
- All 7 firms in one unified bot
- OpenAI Model: GPT-4o-mini (temperature 0.1)
- Database: Direct Supabase connection with 5-minute cache

### Git Branching Strategy
```bash
# Create testing branch for any changes
git checkout main
git checkout -b test-feature-name

# Make changes and test
# Edit railway-deployment/multiFirmProductionBot.js
# Test with: node test-bot-offline.js

# If successful, merge to main
git checkout main
git merge test-feature-name
git branch -d test-feature-name

# If problems, abandon safely
git checkout main           # Instant safety!
```

### Project Structure (Active Only)
```
railway-deployment/         # 🚂 PRODUCTION DEPLOYMENT
├── multiFirmProductionBot.js   # ⭐ MAIN BOT FILE
├── server.js                   # Express server for Railway
├── interactive-bot-tester.js   # Interactive testing
├── test-bot-offline.js         # Offline testing
└── package.json                # Production dependencies

projects/DataBase/Informacion/  # 📊 DATA SOURCE
├── informacion-apex.txt        # Apex information
├── informacion-bulenox.txt     # Bulenox information
└── ... (all 7 firms)          # Single source of truth
```

---

## 🧪 DEVELOPMENT WORKFLOW

### Testing Workflow
1. Interactive Testing (Preferred - Claude Code sees responses):
   bash
   cd railway-deployment
   node interactive-bot-tester.js
   # Commands: /help, /test, /firms, /debug, /exit
   

Offline Testing (Quick validation):
bash
node test-bot-offline.js

Live Testing (Production simulation):
bash
TELEGRAM_BOT_TOKEN="..." node multiFirmProductionBot.js

### Common Development Tasks

Fix Bug Example:
bash
git checkout -b fix-apex-detection
# Edit railway-deployment/multiFirmProductionBot.js
node test-bot-offline.js          # Verify fix works
git add . && git commit -m "Fix: Apex detection logic"
git checkout main && git merge fix-apex-detection

Add New Feature Example:
bash
git checkout -b add-new-feature
# Develop feature (NO discount system - blocked until further notice)
node interactive-bot-tester.js    # Test extensively
git add . && git commit -m "Feature: New functionality"
git checkout main && git merge add-new-feature

---

## 🚂 DEPLOYMENT & INFRASTRUCTURE

### Environment Variables
```env
# Supabase Database
SUPABASE_URL=https://zkqfyyvpyecueybxoqrt.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API
OPENAI_API_KEY=sk-proj-n6udjkSMK9JMoBXO5UgksrEDHw8iBsvDFez9jwqDk...

# Telegram Bot
TELEGRAM_BOT_TOKEN=7643319636:AAE-HSHkDKFVKgj855HNwOcHmx6jP4thGFk
MODERATOR_CHAT_ID=8197351501

# Railway Integration
RAILWAY_API_TOKEN=27917a14-2b81-447f-b266-4f247b3e2237
```

### Railway MCP Commands
bash
# Deploy to Railway via Claude Code
"List all my Railway projects"
"Create service from GitHub repository in project [PROJECT_ID]"
"Set TELEGRAM_BOT_TOKEN in service [service_id]"
"Trigger deployment for service [service_id]"
"Get deployment logs for service [service_id]"

### Database Tables (Verified Existing)
sql
✅ prop_firms              -- Basic firm information
✅ account_plans           -- Account plans with pricing
✅ trading_rules           -- Trading rules by firm
✅ payout_policies         -- Payout policies
✅ faqs                    -- Frequently asked questions
✅ platforms               -- Trading platforms
✅ discounts               -- Discount codes
✅ restrictions            -- Country restrictions

❌ Don't Query These (Don't Exist):
- prop_firm_faqs → Use faqs
- prop_firm_reglas → Use trading_rules
- prop_firm_planes → Use account_plans

---

## 🔒 CRITICAL RULES

### Data Source Policy - SINGLE SOURCE OF TRUTH
ALL bot content MUST come exclusively from:

/projects/DataBase/Informacion/informacion-{firma}.txt

❌ PROHIBITED:
- Adding information NOT in source files
- Using external websites or knowledge
- Making comparisons not explicit in sources
- "Improving" or "clarifying" information
- Hallucinations or assumptions

✅ REQUIRED PROCESS:
1. Find exact line in source file
2. Copy ONLY information present
3. Cite line number in FAQ/response
4. If not in source file = DON'T CREATE

### Bot Implementation Rules
- One Unified Bot: All 7 firms in railway-deployment/multiFirmProductionBot.js
- Git Safety: NEVER work directly on main branch
- Testing First: Always test before merging to main
- Minimal Changes: Change only what's necessary for the specific issue
- ⚠️ NO DISCOUNT SYSTEM: Do NOT implement discount functionality until explicit authorization

---

## 🚨 TROUBLESHOOTING

### Common Errors & Solutions

MCP Connection Error:
bash
# Error: "No such tool available: mcp__supabase__supabase_list_tables"
# Solution: Use alternative
mcp__postgres__query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")

Database Connection Error:
bash
# Error: "connect ECONNREFUSED 127.0.0.1:5432"
# Solution: Always use full Supabase environment variables
SUPABASE_URL="https://zkqfyyvpyecueybxoqrt.supabase.co" SUPABASE_SERVICE_KEY="..." node script.js

Path Not Found Error:
bash
# Error: "No such file or directory"
# Solution: Always use absolute paths
cd /mnt/c/Users/braia/Desktop/Eltraderfinanciado_Proyecto/railway-deployment

### Emergency Recovery
bash
# If anything goes wrong, immediately return to safety:
git checkout main           # Return to stable version
git status                 # Check what changed
git branch -D problematic-branch  # Delete problem branch if needed

### Pre-approved MCP Tools
```bash
# Supabase tools (frequently needed)
mcpsupabasesupabase_list_tables
mcpsupabasesupabase_query
mcpsupabasesupabase_insert
mcppostgresquery

# Railway tools (deployment)
mcprailwayproject_list
mcprailwayservice_list
mcprailwaydeployment_trigger
mcprailwayvariable_set
```

---

## 🎯 NEXT STEPS

### Short Term (Current Sprint)
- [x] All 7 firms integrated ✅
- [x] Interactive testing system ✅ 
- [x] Railway production deployment ✅
- [x] Context optimization fixes ✅
- [x] Conciseness improvements ✅
- [x] Overnight trading prohibition ✅
- [ ] Multi-language support (ES, EN, FR, PT)

### ⚠️ BLOCKED UNTIL FURTHER NOTICE
- ❌ Discount system integration - DO NOT IMPLEMENT until explicit authorization
- ❌ External integrations - Focus only on core bot functionality

### Medium Term
- [ ] Website integration with bot backend
- [ ] Advanced analytics and reporting
- [ ] Performance optimization

---

## 🔧 ESSENTIAL COMMANDS REFERENCE

### Daily Operations
```bash
# Start development session
git branch && git status && pwd

# Test bot quickly
cd railway-deployment && node test-bot-offline.js

# Interactive testing session
node interactive-bot-tester.js

# Deploy to Railway (via MCP)
"Trigger deployment for service [service_id]"
```

### Safety Commands
bash
git checkout main           # Return to safety
git branch                 # Check current branch
git status                # Check for changes

### Database Checks
javascript
mcp__supabase__supabase_list_tables()
mcp__supabase__supabase_query("prop_firms", "id, name")

---

🎯 OBJECTIVE: 7-firm Telegram bot at 100% accuracy with €200K/month revenue target  
⚡ CURRENT STATUS: Production ready, all firms integrated, interactive testing system operational  
📋 MAINTAINER: Braian Basanta & Claude Code  
📅 LAST UPDATE: Aug 25, 2025-e 
### 2025-08-25 13:27
CLAUDE.md
railway-deployment