import 'dotenv/config';

const startServer = async (): Promise<void> => {
  try {
    const [{ buildApp }, { env }] = await Promise.all([
      import('./app.js'),
      import('./infrastructure/config/env.js'),
    ]);

    const app = buildApp();

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend service running on http://localhost:${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend service. Please verify .env and database settings.', error);
    process.exit(1);
  }
};

void startServer();
