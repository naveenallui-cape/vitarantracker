import type { IncomingMessage, ServerResponse } from 'http';
import type { Express } from 'express';
import { createNestApp } from '../src/create-app';

let cachedServer: Express | undefined;

async function getServer(): Promise<Express> {
  if (!cachedServer) {
    const { app, server } = await createNestApp();
    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const server = await getServer();
  server(req, res);
}
