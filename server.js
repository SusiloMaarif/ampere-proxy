const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 8090;

// Load tokens
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
  console.error('❌ ERROR: No tokens found! Set TOKENS env variable.');
  process.exit(1);
}

console.log(`✅ Loaded ${tokens.length} tokens`);

let currentIndex = 0;
function getNextToken() {
  currentIndex = (currentIndex + 1) % tokens.length;
  return tokens[currentIndex];
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', tokens: tokens.length, currentIndex });
});

app.post('/v1/chat/completions', async (req, res) => {
  const token = getNextToken();
  try {
    const response = await axios.post('https://api.ampere.sh/v1/chat/completions', req.body, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 60000
    });
    res.json(response.data);
  } catch (error) {
    console.error(`❌ Token error: ${error.message}`);
    res.status(500).json({ error: 'Proxy error', details: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', tokens: tokens.length }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡️ Proxy running on port ${PORT}`);
});
