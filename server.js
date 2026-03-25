const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8090;

// Load tokens from env var (TOKENS) atau file tokens.txt
let tokens = [];
if (process.env.TOKENS) {
  tokens = process.env.TOKENS.split('\n').map(t => t.trim()).filter(t => t);
} else {
  const fs = require('fs');
  const path = require('path');
  const tokensFile = path.join(__dirname, 'tokens.txt');
  if (fs.existsSync(tokensFile)) {
    tokens = fs.readFileSync(tokensFile, 'utf8')
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }
}

if (tokens.length === 0) {
  console.error('❌ No tokens found! Set TOKENS env or create tokens.txt');
  process.exit(1);
}

let currentIndex = 0;

// Round-robin token picker
function getNextToken() {
  currentIndex = (currentIndex + 1) % tokens.length;
  return tokens[currentIndex];
}

app.use(express.json());

// Dashboard (optional)
app.get('/', (req, res) => {
  res.send(`
    <html><body style="background:#0d1117;color:#c9d1d9;font-family:monospace;padding:20px;">
      <h1 style="color:#58a6ff;">⚡️ Ampere Proxy</h1>
      <p>Active tokens: <strong style="color:#3fb950;">${tokens.length}</strong></p>
      <p>Visit <a href="https://railway.app" style="color:#58a6ff;">Railway</a> for logs.</p>
    </body></html>
  `);
});

// Proxy endpoint: OpenAI-compatible
app.post('/v1/chat/completions', async (req, res) => {
  const token = getNextToken();
  try {
    const response = await axios.post('https://api.ampere.sh/v1/chat/completions', req.body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 60000
    });
    res.json(response.data);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ error: 'Proxy error', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', tokens: tokens.length }));

app.listen(PORT, () => {
  console.log(`⚡️ Ampere Proxy running on port ${PORT}`);
});
