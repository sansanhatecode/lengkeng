import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceRequestType } from '@prisma/client';
import { RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

const include = { session: { select: { id: true, table: { select: { name: true, area: { select: { name: true } } } } } } };

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** K6: khách gọi phục vụ hoặc yêu cầu tính tiền. Cùng loại đang chờ thì không tạo thêm. */
  async create(storeId: string, sessionId: string, type: ServiceRequestType) {
    const dup = await this.prisma.serviceRequest.findFirst({ where: { sessionId, type, handledAt: null } });
    if (dup) throw new ConflictException('Yêu cầu của bạn đã được gửi, nhân viên sẽ tới ngay');
    const r = await this.prisma.serviceRequest.create({ data: { storeId, sessionId, type }, include });
    await this.prisma.tableSession.update({ where: { id: sessionId }, data: { lastActivityAt: new Date() } });
    this.realtime.toStoreAndSession(storeId, sessionId, RealtimeEvent.SERVICE_REQUEST_CREATED, r);
    return r;
  }

  listOpen(storeId: string) {
    return this.prisma.serviceRequest.findMany({ where: { storeId, handledAt: null }, orderBy: { createdAt: 'asc' }, include });
  }

  async handle(storeId: string, id: string, staffId: string) {
    const r = await this.prisma.serviceRequest.findFirst({ where: { id, storeId } });
    if (!r) throw new NotFoundException('Không tìm thấy yêu cầu');
    const updated = await this.prisma.serviceRequest.update({ where: { id }, data: { handledAt: new Date(), handledById: staffId }, include });
    this.realtime.toStoreAndSession(storeId, r.sessionId, RealtimeEvent.SERVICE_REQUEST_HANDLED, updated);
    return updated;
  }
}
