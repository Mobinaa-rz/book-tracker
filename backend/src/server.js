import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Book Tracker API listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});
