const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Make sure the folder for the db file exists
const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  guild_id        TEXT,
  channel_id      TEXT NOT NULL,
  author_id       TEXT NOT NULL,
  author_tag      TEXT,
  content         TEXT,
  replied_to_id   TEXT,
  attachments     TEXT,           -- JSON array of attachment URLs
  created_at      INTEGER NOT NULL,
  edited_at       INTEGER,
  deleted_at      INTEGER
);

CREATE TABLE IF NOT EXISTS message_edits (
  edit_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    TEXT NOT NULL,
  old_content   TEXT,
  edited_at     INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_guild ON messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
`);

const stmts = {
  insertMessage: db.prepare(`
    INSERT OR REPLACE INTO messages
      (id, guild_id, channel_id, author_id, author_tag, content, replied_to_id, attachments, created_at)
    VALUES (@id, @guild_id, @channel_id, @author_id, @author_tag, @content, @replied_to_id, @attachments, @created_at)
  `),
  getMessage: db.prepare(`SELECT * FROM messages WHERE id = ?`),
  updateOnEdit: db.prepare(`
    UPDATE messages SET content = @content, edited_at = @edited_at WHERE id = @id
  `),
  insertEditHistory: db.prepare(`
    INSERT INTO message_edits (message_id, old_content, edited_at)
    VALUES (@message_id, @old_content, @edited_at)
  `),
  markDeleted: db.prepare(`
    UPDATE messages SET deleted_at = @deleted_at WHERE id = @id
  `),
};

function saveMessage(msg) {
  stmts.insertMessage.run(msg);
}

function recordEdit(id, oldContent, newContent, editedAt) {
  const existing = stmts.getMessage.get(id);
  if (!existing) return; // message wasn't in DB (e.g. sent before bot started)
  stmts.insertEditHistory.run({ message_id: id, old_content: oldContent, edited_at: editedAt });
  stmts.updateOnEdit.run({ id, content: newContent, edited_at: editedAt });
}

function recordDelete(id, deletedAt) {
  stmts.markDeleted.run({ id, deleted_at: deletedAt });
}

module.exports = { db, saveMessage, recordEdit, recordDelete };
