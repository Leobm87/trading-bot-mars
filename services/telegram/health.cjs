const express = require('express');
const app = express();

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('health on', port));