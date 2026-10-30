import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RealtimeEvent, rooms } from '@lengkeng/shared';

/** Lớp mỏng để service nghiệp vụ phát sự kiện mà không phụ thuộc Socket.IO trực tiếp. */
@Injectable()
export class RealtimeService {
  private server?: Server;
  private readonly log = new Logger('Realtime');

  attach(server: Server) {
    this.server = server;
  }

  toStore(storeId: string, event: RealtimeEvent, payload: unknown) {
    this.server?.to(rooms.store(storeId)).emit(event, payload);
  }

  toSession(sessionId: string, event: RealtimeEvent, payload: unknown) {
    this.server?.to(rooms.session(sessionId)).emit(event, payload);
  }

  /** Phát cho cả quán lẫn khách ở bàn liên quan. */
  toStoreAndSession(storeId: string, sessionId: string, event: RealtimeEvent, payload: unknown) {
    this.toStore(storeId, event, payload);
    this.toSession(sessionId, event, payload);
  }
}
