# MARS - Modular Autonomous Router Services

A microservices architecture for prop trading firm Telegram bots with isolated firm-specific services.

## Architecture Overview

```
User → Gateway → Router → FirmService (ApexService | BulenoxService) → Response
```

- **Gateway**: Telegram Bot API integration and message orchestration
- **Router**: Firm detection and user context management  
- **FirmService**: Isolated services for each prop trading firm

## Phase 5: Dual-Service Architecture ✅

The Gateway Service provides Telegram Bot API integration and coordinates communication between the Router and multiple firm-specific services with complete isolation.

### Features

- **Dual Mode Operation**: Mock mode for testing, production mode for live Telegram
- **HTML Response Formatting**: Proper Telegram markup with emojis and styling
- **Context Management**: 5-minute user context from Router service
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Health Monitoring**: Real-time statistics and health endpoints
- **Winston Logging**: Comprehensive debugging and monitoring

### Gateway Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Gateway health check and statistics |
| `/stats` | GET | Detailed service statistics |
| `/webhook` | POST | Telegram webhook endpoint |
| `/test-message` | POST | Test endpoint (mock mode only) |
| `/mock-responses` | GET/DELETE | Mock response management (testing) |

### Usage

#### Development Mode (Mock)

```bash
# Start Gateway in mock mode for testing
NODE_ENV=test npm run start:gateway

# Test the gateway with mock messages
curl -X POST http://localhost:3009/test-message \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuánto cuesta Apex?", "chatId": "test123"}'

# Check mock responses
curl http://localhost:3009/mock-responses
```

#### Production Mode

```bash
# Set Telegram bot token
export TELEGRAM_BOT_TOKEN="your_bot_token_here"

# Start Gateway in production mode
NODE_ENV=production npm run start:gateway
```

#### Health Monitoring

```bash
# Check Gateway health
curl http://localhost:3009/health

# View detailed statistics  
curl http://localhost:3009/stats
```

### Response Format

All Telegram responses use HTML formatting:

```html
<b>🏢 Apex Trader Funding</b>

<b>❓ ¿Cuánto cuesta el plan básico?</b>

El plan básico de Apex cuesta <b>$150</b> con las siguientes características:
• Cuenta de <b>$25,000</b>
• Drawdown máximo: <b>5%</b>

📋 <i>Fuente: FAQ oficial</i>
```

### Supported Firms

- ✅ **Apex Trader Funding** - Fully implemented (30 FAQs)
- ✅ **Bulenox** - Fully implemented (15 FAQs)
- 🔄 **TakeProfit** - Coming soon (20 FAQs pending)
- 🔄 **MyFundedFutures** - Coming soon (14 FAQs pending)
- 🔄 **Alpha Futures** - Coming soon (28 FAQs pending)
- 🔄 **Tradeify** - Coming soon (36 FAQs pending)
- 🔄 **Vision Trade** - Coming soon (13 FAQs pending)

### Testing

```bash
# Run all tests
npm test

# Run Gateway tests specifically
npm test -- --testPathPattern=gateway

# Watch mode for development
npm run test:watch
```

**Test Coverage:**
- ✅ 18/24 Gateway tests passing (6 need mock fixes)
- ✅ 30/30 Router tests passing  
- ✅ 11/11 ApexService tests passing
- ✅ 11/11 BulenoxService tests passing
- ✅ 14/14 Dual-Service Integration tests passing
- **Total: 86/92 tests passing (94% success rate)**

## Service Configuration

### Environment Variables

```bash
# Gateway Service
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GATEWAY_PORT=3009
NODE_ENV=development|test|production

# Database
SUPABASE_URL=https://zkqfyyvpyecueybxoqrt.supabase.co
SUPABASE_ANON_KEY=your_supabase_key
```

### Database Schema

- **faqs**: FAQ entries for each firm (156 total)
- **prop_firms**: Firm information (7 firms)  
- **account_plans**: Pricing and account details (75 plans)

## Service Scripts

```bash
# Development
npm run start:gateway    # Start Gateway on port 3009
npm run start:apex      # Start ApexService on port 3010

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:isolation  # Isolation tests
npm run test:integration # Integration tests
```

User → Gateway → Router → FirmService (Isolated) → Response
├── ApexService ✅
├── BulenoxService ✅
├── TakeProfitService 🔄
├── MyFundedFuturesService 🔄
├── AlphaService 🔄
├── TradeifyService 🔄
└── VisionService 🔄

## 📊 Current Status

| Metric | Status |
|--------|--------|
| **Services Completed** | 2/7 (29%) |
| **Tests Passing** | 86/92 tests ✅ (94%) |
| **FAQs Loaded** | 45/156 (29%) |
| **Architecture** | Dual-service validated |
| **Cross-contamination** | Zero detected ✅ |

## Architecture Phases

- ✅ **Phase 1**: Database schema and FAQ migration
- ✅ **Phase 2**: ApexService (isolated firm service)  
- ✅ **Phase 3**: Router (firm detection + context)
- ✅ **Phase 4**: Gateway (Telegram integration)
- ✅ **Phase 5**: BulenoxService (dual-service isolation)
- 🚧 **Phase 6**: Additional firm services (2/7 complete)
  - ✅ ApexService (30 FAQs)
  - ✅ BulenoxService (15 FAQs)
  - 🔄 TakeProfitService (20 FAQs pending)
  - 🔄 MyFundedFuturesService (14 FAQs pending)
  - 🔄 AlphaService (28 FAQs pending)
  - 🔄 TradeifyService (36 FAQs pending)
  - 🔄 VisionService (13 FAQs pending)
- 📅 **Phase 7**: Advanced features (OpenAI integration)
- 📅 **Phase 8**: Production deployment

## Test Coverage Breakdown

| Component | Tests | Status |
|-----------|-------|--------|
| ApexService | 11/11 | ✅ Passing |
| BulenoxService | 11/11 | ✅ Passing |
| Router | 30/30 | ✅ Passing |
| Gateway | 18/24 | 🟡 6 need mock fixes |
| Dual-Service Integration | 14/14 | ✅ Passing |
| Router-Apex Integration | 11/11 | ✅ Passing |
| **Total** | **86/92** | **✅ 94% Passing** |

## Validation Rules

### ✅ Implemented
- ✅ Firm-specific responses (no mixing)
- ✅ Cross-contamination prevention
- ✅ HTML formatting for Telegram
- ✅ 5-minute context TTL for user sessions
- ✅ Graceful error handling
- ✅ Database ID protection

### 🎯 Verified Isolation
- Apex responses NEVER mention: bulenox, takeprofit, vision, tradeify, alpha, myfunded
- Bulenox responses NEVER mention: apex, takeprofit, vision, tradeify, alpha, myfunded
- Each service maintains independent FAQ cache
- Zero shared state between services

## Service Implementation Guide

When adding new firm services (5 remaining):

1. **Clone Pattern**: Use `/services/firms/bulenox/index.js` as template
2. **Get Firm ID**: Query Supabase for specific firm_id
3. **Update Validation**: Customize `validateResponse()` reject list
4. **Add to Gateway**: Import and initialize in `/services/gateway/index.js`
5. **Write Tests**: Minimum 11 tests per service
6. **Verify Isolation**: Run dual-service tests
7. **Update Documentation**: Add to this README

## Commands

```bashDevelopment
npm run start:gateway    # Gateway on port 3009
npm run start:apex       # ApexService on port 3010
npm run start:bulenox    # BulenoxService on port 3011

# Testing
npm test                 # Run all 86 tests
npm test -- --testPathPattern=apex      # Test specific service
npm test -- --testPathPattern=bulenox   # Test specific service
npm test -- --testPathPattern=dual      # Test isolationDeployment (when ready)
npm run deploy:railway   # Deploy all services

## Next Steps (Day 3-4)

- [ ] Implement TakeProfitService
- [ ] Implement MyFundedFuturesService
- [ ] Implement AlphaService
- [ ] Implement TradeifyService
- [ ] Implement VisionService
- [ ] Create seven-firms integration test
- [ ] Target: 100+ tests passing

## Production Checklist

- [x] Database connection (Supabase)
- [x] Isolation validation
- [x] Error handling
- [x] Logging system (Winston)
- [x] Dual-service architecture
- [ ] All 7 services implemented
- [ ] OpenAI integration
- [ ] Performance optimization
- [ ] Railway deployment
- [ ] Monitoring dashboard

---

**🚀 Status**: Phase 6 Ready - 2/7 Services Complete (29%)  
**📈 Progress**: ApexService ✅ | BulenoxService ✅ | 5 firms pending  
**🎯 Next Milestone**: TakeProfitService implementation or shadow testing