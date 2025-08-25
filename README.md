# MARS - Modular Autonomous Router Services

A microservices architecture for prop trading firm Telegram bots with isolated firm-specific services.

## Architecture Overview

```
User → Gateway → Router → FirmService (ApexService) → Response
```

- **Gateway**: Telegram Bot API integration and message orchestration
- **Router**: Firm detection and user context management  
- **FirmService**: Isolated services for each prop trading firm

## Phase 4: Gateway Service ✅

The Gateway Service provides Telegram Bot API integration and coordinates communication between the Router and firm-specific services.

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
- 🔄 **Bulenox** - Coming soon
- 🔄 **TakeProfit** - Coming soon  
- 🔄 **MyFundedFutures** - Coming soon
- 🔄 **Alpha Futures** - Coming soon
- 🔄 **Tradeify** - Coming soon
- 🔄 **Vision Trade** - Coming soon

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
- ✅ 24 Gateway tests passing
- ✅ 30 Router tests passing  
- ✅ 11 ApexService tests passing
- **Total: 65 tests passing**

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

## Architecture Phases

- ✅ **Phase 1**: Database schema and FAQ migration
- ✅ **Phase 2**: ApexService (isolated firm service)  
- ✅ **Phase 3**: Router (firm detection + context)
- ✅ **Phase 4**: Gateway (Telegram integration) 
- 🔄 **Phase 5**: Additional firm services
- 🔄 **Phase 6**: Advanced features
- 🔄 **Phase 7**: Production deployment

## Validation Rules

- Responses must be firm-specific (no mixing)
- HTML formatting required for Telegram
- 5-minute context TTL for user sessions
- Graceful error handling with user feedback
- Never expose database IDs or internal errors

## Contributing

When adding new firm services:

1. Follow the ApexService pattern in `/services/firms/apex/`
2. Add firm detection pattern to Router
3. Update Gateway to route to new service
4. Write comprehensive tests
5. Update this README

---

**Status**: Phase 4 Complete - Gateway Service operational with Apex integration