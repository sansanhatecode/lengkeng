import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as QRCode from 'qrcode';
import { RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

/**
 * Mã bàn trong QR: 128 bit ngẫu nhiên, lưu trong DB, không đoán được.
 * Quản lý có thể đổi mã (in lại tem) nếu nghi bị lộ.
 */
const newQrToken = () => randomBytes(16).toString('base64url');

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  qrUrl(token: string) {
    const base = (process.env.CUSTOMER_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    return `${base}/t/${token}`;
  }

  /** Sơ đồ bàn cho phục vụ và thu ngân, kèm tóm tắt phiên đang mở. */
  async floor(storeId: string) {
    const areas = await this.prisma.area.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
      include: {
        tables: {
          orderBy: { name: 'asc' },
          include: {
            sessions: {
              where: { status: 'OPEN' },
              take: 1,
              include: {
                orders: { select: { id: true, status: true, items: { select: { qty: true, unitPrice: true, kitchenStatus: true } } } },
                serviceRequests: { where: { handledAt: null }, select: { id: true, type: true, createdAt: true } },
              },
            },
          },
        },
      },
    });
    return areas.map((a) => ({
      id: a.id,
      name: a.name,
      tables: a.tables.map((t) => {
        const s = t.sessions[0];
        const accepted = s?.orders.filter((o) => o.status === 'ACCEPTED') ?? [];
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          qrToken: t.qrToken,
          session: s
            ? {
                id: s.id,
                openedAt: s.openedAt,
                guestCount: s.guestCount,
                pendingOrders: s.orders.filter((o) => o.status === 'PENDING_CONFIRM').length,
                acceptedOrders: accepted.length,
                itemsNotServed: accepted.reduce((n, o) => n + o.items.filter((i) => i.kitchenStatus !== 'SERVED').length, 0),
                subtotal: accepted.reduce((sum, o) => sum + o.items.reduce((x, i) => x + i.qty * i.unitPrice, 0), 0),
                openRequests: s.serviceRequests,
              }
            : null,
        };
      }),
    }));
  }

  /** Mở phiên bàn. Dùng cả khi khách quét (ON_SCAN) và khi phục vụ mở (BY_STAFF). */
  /**
   * Mở phiên cho bàn. Hai khách quét cùng lúc (hoặc StrictMode gọi effect 2 lần) phải nhận cùng một phiên:
   * khóa dòng Table trong transaction rồi mới kiểm tra lại; DB còn có unique index "một phiên OPEN mỗi bàn" làm lưới cuối.
   */
  async openSession(storeId: string, tableId: string, opts: { guestCount?: number; staffId?: string }) {
    const table = await this.prisma.table.findFirst({ where: { id: tableId, storeId } });
    if (!table) throw new NotFoundException('Không tìm thấy bàn');
    if (table.status === 'LOCKED') throw new ConflictException('Bàn đang khóa');
    const open = await this.prisma.tableSession.findFirst({ where: { tableId, status: 'OPEN' } });
    if (open) return open;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Table" WHERE id = ${tableId} FOR UPDATE`;
      const existing = await tx.tableSession.findFirst({ where: { tableId, status: 'OPEN' } });
      if (existing) return { session: existing, created: false };
      const s = await tx.tableSession.create({
        data: { storeId, tableId, guestCount: opts.guestCount, bill: { create: { storeId } } },
      });
      await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
      if (opts.staffId) {
        await tx.auditLog.create({ data: { storeId, actorId: opts.staffId, action: 'session.open', entity: 'TableSession', entityId: s.id } });
      }
      return { session: s, created: true };
    });
    if (result.created) {
      this.realtime.toStore(storeId, RealtimeEvent.SESSION_OPENED, { sessionId: result.session.id, tableId, tableName: table.name });
    }
    return result.session;
  }

  // ---- Quản trị khu vực và bàn ----
  listAreas(storeId: string) {
    return this.prisma.area.findMany({ where: { storeId }, orderBy: { sortOrder: 'asc' }, include: { tables: { orderBy: { name: 'asc' } } } });
  }
  createArea(storeId: string, data: { name: string; sortOrder: number }) {
    return this.prisma.area.create({ data: { storeId, ...data } });
  }
  async updateArea(storeId: string, id: string, data: { name?: string; sortOrder?: number }) {
    await this.mustArea(storeId, id);
    return this.prisma.area.update({ where: { id }, data });
  }
  async deleteArea(storeId: string, id: string) {
    await this.mustArea(storeId, id);
    const n = await this.prisma.table.count({ where: { areaId: id } });
    if (n) throw new ConflictException('Khu vực còn bàn');
    return this.prisma.area.delete({ where: { id } });
  }

  async createTable(storeId: string, data: { areaId: string; name: string }) {
    await this.mustArea(storeId, data.areaId);
    const t = await this.prisma.table.create({ data: { storeId, ...data, qrToken: newQrToken() } });
    return { ...t, qrUrl: this.qrUrl(t.qrToken) };
  }
  async renameTable(storeId: string, id: string, name: string) {
    await this.mustTable(storeId, id);
    return this.prisma.table.update({ where: { id }, data: { name } });
  }
  async deleteTable(storeId: string, id: string) {
    await this.mustTable(storeId, id);
    const open = await this.prisma.tableSession.count({ where: { tableId: id, status: 'OPEN' } });
    if (open) throw new ConflictException('Bàn đang có khách');
    return this.prisma.table.delete({ where: { id } });
  }
  /** Đổi mã QR (in lại tem). */
  async rotateQr(storeId: string, id: string) {
    await this.mustTable(storeId, id);
    const t = await this.prisma.table.update({ where: { id }, data: { qrToken: newQrToken() } });
    return { ...t, qrUrl: this.qrUrl(t.qrToken) };
  }
  async setLocked(storeId: string, id: string, locked: boolean) {
    const t = await this.mustTable(storeId, id);
    if (t.status === 'OCCUPIED') throw new ConflictException('Bàn đang có khách');
    return this.prisma.table.update({ where: { id }, data: { status: locked ? 'LOCKED' : 'FREE' } });
  }

  /** Q2: ảnh QR PNG (data URL) cho một bàn; in tem làm ở client từ danh sách này. */
  async qrImages(storeId: string) {
    const tables = await this.prisma.table.findMany({ where: { storeId }, include: { area: true }, orderBy: [{ area: { sortOrder: 'asc' } }, { name: 'asc' }] });
    return Promise.all(
      tables.map(async (t) => ({
        id: t.id,
        name: t.name,
        area: t.area.name,
        url: this.qrUrl(t.qrToken),
        png: await QRCode.toDataURL(this.qrUrl(t.qrToken), { errorCorrectionLevel: 'M', margin: 1, width: 512 }),
      })),
    );
  }

  private async mustArea(storeId: string, id: string) {
    const a = await this.prisma.area.findFirst({ where: { id, storeId } });
    if (!a) throw new NotFoundException('Không tìm thấy khu vực');
    return a;
  }
  private async mustTable(storeId: string, id: string) {
    const t = await this.prisma.table.findFirst({ where: { id, storeId } });
    if (!t) throw new NotFoundException('Không tìm thấy bàn');
    return t;
  }
}
