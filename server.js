const express = require('express');
const config = require('./config');
const { db } = require('./db');

const app = express();

// Simple auth: require header "x-api-key: <API_KEY>" on every request
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!config.apiKey || req.header('x-api-key') !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid x-api-key header.' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /messages?guildId=&channelId=&authorId=&limit=50&offset=0
app.get('/messages', (req, res) => {
  const { guildId, channelId, authorId, limit = 50, offset = 0 } = req.query;

  const clauses = [];
  const params = {};
  if (guildId) { clauses.push('guild_id = @guildId'); params.guildId = guildId; }
  if (channelId) { clauses.push('channel_id = @channelId'); params.channelId = channelId; }
  if (authorId) { clauses.push('author_id = @authorId'); params.authorId = authorId; }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  const off = parseInt(offset, 10) || 0;

  const rows = db
    .prepare(`SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`)
    .all(params);

  res.json({ count: rows.length, messages: rows });
});

// GET /messages/:id — single message plus its edit history
app.get('/messages/:id', (req, res) => {
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Not found' });
  const edits = db.prepare('SELECT * FROM message_edits WHERE message_id = ? ORDER BY edited_at ASC').all(req.params.id);
  res.json({ ...message, edit_history: edits });
});

module.exports = app;
