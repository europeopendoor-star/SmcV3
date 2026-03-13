const fs = require('fs');

const content = fs.readFileSync('server/apiServer.ts', 'utf8');

const newRoutes = `
// MT5 Proxy Routes
const MT5_API_URL = process.env.MT5_API_URL || 'http://127.0.0.1:8000';

router.get('/mt5/account', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/account\`);
    if (!response.ok) throw new Error(\`MT5 API error: \${response.statusText}\`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mt5/symbol/:symbol', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/symbol/\${req.params.symbol}\`);
    if (!response.ok) throw new Error(\`MT5 API error: \${response.statusText}\`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mt5/positions', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/positions\`);
    if (!response.ok) throw new Error(\`MT5 API error: \${response.statusText}\`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mt5/orders/pending', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/orders/pending\`);
    if (!response.ok) throw new Error(\`MT5 API error: \${response.statusText}\`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mt5/trade', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/trade\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || \`MT5 API error: \${response.statusText}\`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mt5/trade/pending', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/trade/pending\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || \`MT5 API error: \${response.statusText}\`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mt5/trade/modify', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/trade/modify\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || \`MT5 API error: \${response.statusText}\`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mt5/trade/close', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/trade/close\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || \`MT5 API error: \${response.statusText}\`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mt5/trade/cancel', requireAuth, async (req, res) => {
  try {
    const response = await fetch(\`\${MT5_API_URL}/trade/cancel\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || \`MT5 API error: \${response.statusText}\`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backtesting API
`;

const updatedContent = content.replace('// Backtesting API', newRoutes);

fs.writeFileSync('server/apiServer.ts', updatedContent);
