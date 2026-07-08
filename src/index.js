const config = require('./config');
const client = require('./discordClient');
const app = require('./server');

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

client.login(config.token);

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
