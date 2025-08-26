const express = require('express');
const TelegramGateway = require('./services/gateway');

const app = express();
app.use(express.json());

const gateway = new TelegramGateway({ mockMode: false });

// Initialize gateway
gateway.initialize().then(() => {
  console.log('MARS Gateway initialized with 6 services');
});

// Telegram webhook
app.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    if (message && message.text) {
      await gateway.processMessage(message.text, message.chat.id);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: gateway.getHealth()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MARS Trading Bot',
    version: '1.0.0',
    services: 6,
    status: 'operational'
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`MARS running on port ${PORT}`);
});