require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN,
  guildWhitelist: (process.env.GUILD_ID_WHITELIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || '',
  dbPath: process.env.DB_PATH || './data/messages.db',
};

if (!config.token) {
  console.error('Missing DISCORD_TOKEN in environment. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

module.exports = config;
