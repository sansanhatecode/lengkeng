import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { CloseSessionSchema, RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { parseSettings } from '../common/settings';
import { orderInclude } from '../orders/orders.service';

type CloseInput = z.infer<typeof CloseSessionSchema>;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** T1: hóa đơn tạm tính của phiên, tính từ các đơn đã nhận. */
  async bill(storeId: string, sessionId: string, opts: { discount?: number; surcharge?: number } = {}) {
    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, storeId },
      include: {
        store: true,
        table: { include: { area: true } },
        bill: { include: { payments: true } },
        orders: { where: { status: 'ACCEPTED' }, orderBy: { createdAt: 'asc' }, include: orderInclude },
      },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên bàn');
    const settings = parseSettings(session.store.settings);

    const lines = session.orders.flatMap((o) =>
      o.items.map((i) => ({
        orderId: o.id,
        dailyNumber: o.dailyNumber,
        itemId: i.id,
        name: i.nameSnapshot,
        modifiers: i.modifiersSnapshot as { name: string; priceDelta: number }[],
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: i.qty * i.unitPrice,
        kitchenStatus: i.kitchenStatus,
        note: i.note,
      })),
    );
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const paid = session.bill?.status === 'PAID';
    const discount = paid ? session.bill!.discount : (opts.discount ?? session.bill?.discount ?? 0);
    const surcharge = paid ? session.bill!.surcharge : (opts.surcharge ?? session.bill?.surcharge ?? 0);
    if (discount > subtotal + surcharge) throw new BadRequestException('Giảm giá lớn hơn tổng tiền');
    const taxable = subtotal - discount + surcharge;
    const vat = paid ? session.bill!.vat : Math.round((taxable * settings.vatPercent) / 100);
    const total = paid ? session.bill!.total : taxable + vat;

    return {
      sessionId: session.id,
      status: session.bill?.status ?? 'OPEN',
      table: { id: session.table.id, name: session.table.name, area: session.table.area.name },
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      guestCount: session.guestCount,
      lines,
      subtotal,
      discount,
      surcharge,
      vatPercent: settings.vatPercent,
      vat,
      total,
      payments: session.bill?.payments ?? [],
      paidAt: session.bill?.paidAt ?? null,
    };
  }

  /** T3: thu tiền và đóng bàn. Phiên kết thúc, mã phiên của khách hết hiệu lực. */
  async close(storeId: string, sessionId: string, input: CloseInput, staffId: string) {
    const session = await this.prisma.tableSession.findFirst({ where: { id: sessionId, storeId }, include: { bill: true } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên bàn');
    if (session.status !== 'OPEN') throw new ConflictException('Phiên đã đóng');

    const pending = await this.prisma.order.count({ where: { sessionId, status: 'PENDING_CONFIRM' } });
    if (pending > 0) throw new ConflictException('Còn đơn chờ xác nhận, hãy duyệt hoặc từ chối trước');

    const bill = await this.bill(storeId, sessionId, { discount: input.discount, surcharge: input.surcharge });
    const paidSum = input.payments.reduce((s, p) => s + p.amount, 0);
    if (paidSum < bill.total) {
      throw new BadRequestException(`Số tiền thu (${paidSum}) nhỏ hơn tổng hóa đơn (${bill.total})`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bill.update({
        where: { sessionId },
        data: {
          subtotal: bill.subtotal,
          discount: bill.discount,
          surcharge: bill.surcharge,
          vat: bill.vat,
          total: bill.total,
          status: 'PAID',
          paidAt: new Date(),
          closedById: staffId,
          payments: { create: input.payments.map((p) => ({ storeId, method: p.method, amount: p.amount, txnRef: p.txnRef, status: 'PAID' })) },
        },
      });
      await tx.orderItem.updateMany({
        where: { storeId, order: { sessionId, status: 'ACCEPTED' }, kitchenStatus: { not: 'SERVED' } },
        data: { kitchenStatus: 'SERVED' },
      });
      await tx.serviceRequest.updateMany({ where: { sessionId, handledAt: null }, data: { handledAt: new Date(), handledById: staffId } });
      await tx.tableSession.update({ where: { id: sessionId }, data: { status: 'CLOSED', closedAt: new Date() } });
      await tx.table.update({ where: { id: session.tableId }, data: { status: 'FREE' } });
      await tx.auditLog.create({
        data: { storeId, actorId: staffId, action: 'session.close', entity: 'TableSession', entityId: sessionId, meta: { total: bill.total, payments: input.payments } },
      });
      return b;
    });

    this.realtime.toStoreAndSession(storeId, sessionId, RealtimeEvent.SESSION_CLOSED, {
      sessionId,
      tableId: session.tableId,
      total: result.total,
    });
    return this.bill(storeId, sessionId);
  }

  /** Hủy phiên không có đơn (khách quét nhầm, bỏ đi). */
  async voidSession(storeId: string, sessionId: string, staffId: string) {
    const session = await this.prisma.tableSession.findFirst({ where: { id: sessionId, storeId, status: 'OPEN' } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên đang mở');
    const accepted = await this.prisma.order.count({ where: { sessionId, status: 'ACCEPTED' } });
    if (accepted > 0) throw new ConflictException('Phiên đã có đơn, phải thu tiền để đóng');
    await this.prisma.$transaction([
      this.prisma.order.updateMany({ where: { sessionId, status: 'PENDING_CONFIRM' }, data: { status: 'CANCELLED' } }),
      this.prisma.bill.update({ where: { sessionId }, data: { status: 'VOID', closedById: staffId } }),
      this.prisma.tableSession.update({ where: { id: sessionId }, data: { status: 'CLOSED', closedAt: new Date() } }),
      this.prisma.table.update({ where: { id: session.tableId }, data: { status: 'FREE' } }),
    ]);
    this.realtime.toStoreAndSession(storeId, sessionId, RealtimeEvent.SESSION_CLOSED, { sessionId, tableId: session.tableId, total: 0 });
    return { ok: true };
  }
}
