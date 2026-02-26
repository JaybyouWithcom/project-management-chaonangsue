import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 4000);

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ service: 'chaonangsue-backend', status: 'ok' }));
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend service running on http://localhost:${port}`);
});
