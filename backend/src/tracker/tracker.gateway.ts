import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AppConfig } from '../config/configuration';

export type TrackerActivityPayload = {
  employeeId: string;
  deviceId: string;
  status: 'ACTIVE' | 'IDLE' | 'LOCKED' | 'UNLOCKED';
  timestamp: string;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class TrackerGateway implements OnGatewayInit {
  private readonly logger = new Logger(TrackerGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  afterInit(server: Server): void {
    const origins = this.config.get('corsOrigin', { infer: true });
    if (origins.length > 0) {
      server.engine.opts.cors = {
        origin: origins,
        credentials: true,
      };
    }
    this.logger.log('Socket.IO gateway ready for tracker.activity.updated');
  }

  emitActivityUpdated(payload: TrackerActivityPayload): void {
    this.server?.emit('tracker.activity.updated', payload);
  }
}
