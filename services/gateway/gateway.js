const express = require('express');
const TelegramGateway = require('./index');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3009;

// Initialize gateway
const gateway = new TelegramGateway({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    mockMode: process.env.NODE_ENV === 'test'
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', async (req, res) => {
    try {
        const health = gateway.getHealth();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            ...health
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        if (update.message && update.message.text) {
            const result = await gateway.processMessage(
                update.message.text,
                update.message.chat.id
            );
            
            res.json({ success: true, processed: true });
        } else {
            res.json({ success: true, processed: false, reason: 'No text message' });
        }
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test endpoint (mock mode only)
app.post('/test-message', async (req, res) => {
    try {
        if (!gateway.mockMode) {
            return res.status(400).json({ 
                error: 'Test endpoint only available in mock mode' 
            });
        }
        
        const { message, chatId } = req.body;
        
        if (!message || !chatId) {
            return res.status(400).json({ 
                error: 'Missing required fields: message, chatId' 
            });
        }
        
        const result = await gateway.processMessage(message, chatId);
        const mockResponses = gateway.getMockResponses();
        
        res.json({
            success: true,
            result,
            mockResponses: mockResponses.slice(-1) // Return latest response
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get mock responses (test endpoint)
app.get('/mock-responses', (req, res) => {
    try {
        if (!gateway.mockMode) {
            return res.status(400).json({ 
                error: 'Mock responses only available in mock mode' 
            });
        }
        
        const responses = gateway.getMockResponses();
        res.json({
            count: responses.length,
            responses
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear mock responses (test endpoint)
app.delete('/mock-responses', (req, res) => {
    try {
        if (!gateway.mockMode) {
            return res.status(400).json({ 
                error: 'Mock mode operations only available in mock mode' 
            });
        }
        
        const count = gateway.clearMockResponses();
        gateway.clearAllContexts();
        
        res.json({
            success: true,
            clearedResponses: count,
            message: 'Mock responses and contexts cleared'
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Statistics endpoint
app.get('/stats', (req, res) => {
    try {
        const health = gateway.getHealth();
        res.json({
            service: 'TelegramGateway',
            timestamp: new Date().toISOString(),
            stats: health.stats,
            router: {
                activeContexts: health.router.activeContexts,
                firmsSupported: health.router.firmsSupported
            },
            apex: {
                isInitialized: health.apex.isInitialized,
                faqsLoaded: health.apex.faqsLoaded
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'MARS Phase 4 - Telegram Gateway',
        status: 'running',
        mode: process.env.NODE_ENV || 'development',
        mockMode: gateway.mockMode,
        endpoints: {
            health: '/health',
            stats: '/stats',
            webhook: '/webhook (POST)',
            testMessage: '/test-message (POST, mock mode only)',
            mockResponses: '/mock-responses (GET/DELETE, mock mode only)'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
    });
});

// Initialize and start server
async function start() {
    try {
        console.log('🚀 Starting MARS Phase 4 - Telegram Gateway');
        console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🤖 Mock Mode: ${gateway.mockMode}`);
        
        // Initialize gateway
        await gateway.initialize();
        console.log('✅ Gateway initialized successfully');
        
        // Start Express server
        const server = app.listen(PORT, () => {
            console.log(`🌐 Gateway server running on port ${PORT}`);
            console.log(`📡 Health check: http://localhost:${PORT}/health`);
            
            if (gateway.mockMode) {
                console.log(`🧪 Test endpoint: http://localhost:${PORT}/test-message`);
            }
        });
        
        // Start Telegram polling (production mode only)
        if (!gateway.mockMode) {
            console.log('📱 Starting Telegram polling...');
            await gateway.startPolling();
        } else {
            console.log('🔧 Mock mode: Use /test-message endpoint for testing');
        }
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('📴 Shutting down gateway...');
            server.close(() => {
                console.log('✅ Gateway shutdown complete');
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ Gateway startup failed:', error.message);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the gateway if this file is run directly
if (require.main === module) {
    start();
}

module.exports = { app, gateway, start };