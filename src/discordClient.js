const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const { saveMessage, recordEdit, recordDelete } = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — must be enabled in the Dev Portal
  ],
  // Partials let us still receive events for messages that aren't cached
  // (e.g. edits/deletes on old messages after a restart)
  partials: [Partials.Message, Partials.Channel],
});

function allowedGuild(guildId) {
  if (config.guildWhitelist.length === 0) return true;
  return config.guildWhitelist.includes(guildId);
}

function toRow(message) {
  return {
    id: message.id,
    guild_id: message.guildId || null,
    channel_id: message.channelId,
    author_id: message.author?.id || 'unknown',
    author_tag: message.author?.tag || null,
    content: message.content || '',
    replied_to_id: message.reference?.messageId || null,
    attachments: JSON.stringify([...message.attachments.values()].map((a) => a.url)),
    created_at: message.createdTimestamp,
  };
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}. Watching ${config.guildWhitelist.length ? config.guildWhitelist.length + ' whitelisted guild(s)' : 'all guilds'}.`);
});

client.on('messageCreate', (message) => {
  if (message.author?.bot) return; // skip bots, remove this line to log bots too
  if (!allowedGuild(message.guildId)) return;
  try {
    saveMessage(toRow(message));
  } catch (err) {
    console.error('Failed to save message', message.id, err);
  }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  if (!allowedGuild(newMessage.guildId)) return;
  if (newMessage.author?.bot) return;
  // Content may be null if the message wasn't cached — fetch is best-effort
  const oldContent = oldMessage?.content ?? null;
  const newContent = newMessage.content ?? '';
  recordEdit(newMessage.id, oldContent, newContent, Date.now());
});

client.on('messageDelete', (message) => {
  if (!allowedGuild(message.guildId)) return;
  recordDelete(message.id, Date.now());
});

module.exports = client;
