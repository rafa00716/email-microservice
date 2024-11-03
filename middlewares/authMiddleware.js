const fs = require('fs');
const path = require('path');
require('dotenv').config();
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(","): '*';

const authMiddleware = (req, res, next) => {

  const origin = req.headers.origin || req.headers.referer;
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden: Invalid Origin' });
  }

  const { client } = req.params;
  const authKey = req.headers['x-api-key'];

  if (!authKey) {
    return res.status(403).json({ error: 'No API key provided' });
  }

  try {
    const configPath = path.join(__dirname, `../clients/${client}/config.json`);
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Client no found' });
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    if (config.apiKey !== authKey) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    next();
  } catch (error) {
    console.error('Authentication failed:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
