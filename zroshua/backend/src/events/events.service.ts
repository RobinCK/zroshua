import { Injectable } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

/** Broadcasts engine/journal events to connected frontend clients. */
@Injectable()
export class EventsService {
  private wss: WebSocketServer | null = null;

  attach(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/api/ws' });
    this.wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'hello' })));
  }

  broadcast(type: string, payload: unknown) {
    if (!this.wss) return;
    const msg = JSON.stringify({ type, payload });
    for (const c of this.wss.clients) if (c.readyState === WebSocket.OPEN) c.send(msg);
  }
}
