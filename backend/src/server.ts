import 'dotenv/config';

import { env } from './infrastructure/config/env.js';
import { buildApp } from './app.js';

const app = buildApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend service running on http://localhost:${env.port}`);
});
