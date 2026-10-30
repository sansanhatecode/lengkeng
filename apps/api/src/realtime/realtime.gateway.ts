import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { rooms } from '@lengkeng/shared';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from './realtime.service';

/**
 * Một gateway cho cả khách và nhân viên. Client gửi token trong `auth.token` khi kết nối.
 * - Khách: vào phòng session:{id}
 * - Nhân viên/thiết bị: vào phòng store:{id} và các phòng trạm (KDS lọc theo trạm ở client)
 */
@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly log = new Logger('Realtime');

  constructor(
    private readonly auth: AuthService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token as string | undefined) ?? (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.emit('error', { message: 'Thiếu token' });
      client.disconnect(true);
      return;
    }
    try {
      const p = this.auth.verify(token);
      if (p.kind === 'customer') {
        void client.join(rooms.session(p.sessionId));
      } else if (p.kind === 'platform') {
        // Quản trị hệ thống chưa cần realtime; không vào phòng của quán nào
      } else {
        void client.join(rooms.store(p.storeId));
        void client.join(rooms.station(p.storeId, 'KITCHEN'));
        void client.join(rooms.station(p.storeId, 'BAR'));
      }
      client.data.principal = p;
    } catch {
      client.emit('error', { message: 'Token không hợp lệ' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.log.verbose(`disconnect ${client.id}`);
  }
}
