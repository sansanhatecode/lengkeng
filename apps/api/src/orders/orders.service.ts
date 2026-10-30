import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KitchenStatus, OrderSource, Prisma, Station } from '@prisma/client';
import { z } from 'zod';
import { CreateOrderSchema, RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { parseSettings } from '../common/settings';
import { startOfTodayVn } from '../common/time';

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const orderInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  session: { select: { id: true, tableId: true, table: { select: { id: true, name: true, area: { select: { name: true } } } } } },
} satisfies Prisma.OrderInclude;

const ORDERS_PER_MINUTE = 5;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Tạo đơn cho cả khách (K4) và phục vụ gọi hộ (V3).
   * Giá và tùy chọn được chụp lại tại thời điểm đặt.
   */
  async create(params: {
    storeId: string;
    sessionId: string;
    source: OrderSource;
    input: CreateOrderInput;
    staffId?: string;
  }) {
    const { storeId, sessionId, source, input, staffId } = params;

    const existing = await this.prisma.order.findUnique({
      where: { storeId_idempotencyKey: { storeId, idempotencyKey: input.idempotencyKey } },
      include: orderInclude,
    });
    if (existing) return existing; // gửi lại cùng đơn, trả về đơn cũ

    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, storeId, status: 'OPEN' },
      include: { store: true },
    });
    if (!session) throw new ConflictException({ code: 'SESSION_CLOSED', message: 'Bàn đã được đóng' });

    if (source === 'CUSTOMER') {
      const recent = await this.prisma.order.count({
        where: { sessionId, createdAt: { gte: new Date(Date.now() - 60_000) } },
      });
      if (recent >= ORDERS_PER_MINUTE) {
        throw new HttpException('Bạn gửi đơn quá nhanh, vui lòng chờ một chút', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const itemIds = [...new Set(input.lines.map((l) => l.menuItemId))];
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: itemIds }, storeId, deletedAt: null },
      include: { modifierGroups: { include: { modifiers: true } } },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    for (const line of input.lines) {
      const item = byId.get(line.menuItemId);
      if (!item) throw new BadRequestException(`Món không tồn tại: ${line.menuItemId}`);
      if (!item.isAvailable) throw new BadRequestException(`"${item.nameVi}" vừa hết, vui lòng bỏ khỏi giỏ`);

      const chosen: { groupId: string; groupName: string; modifierId: string; name: string; priceDelta: number }[] = [];
      for (const g of item.modifierGroups) {
        const picks = line.modifiers.filter((m) => m.groupId === g.id);
        if (g.required && picks.length < Math.max(1, g.minSelect)) {
          throw new BadRequestException(`"${item.nameVi}": cần chọn ${g.name}`);
        }
        if (picks.length > g.maxSelect) {
          throw new BadRequestException(`"${item.nameVi}": ${g.name} chọn tối đa ${g.maxSelect}`);
        }
        for (const pick of picks) {
          const mod = g.modifiers.find((m) => m.id === pick.modifierId);
          if (!mod || !mod.isAvailable) throw new BadRequestException(`"${item.nameVi}": tùy chọn không hợp lệ`);
          chosen.push({ groupId: g.id, groupName: g.name, modifierId: mod.id, name: mod.name, priceDelta: mod.priceDelta });
        }
      }
      const unitPrice = item.price + chosen.reduce((s, c) => s + c.priceDelta, 0);
      itemsData.push({
        store: { connect: { id: storeId } },
        menuItem: { connect: { id: item.id } },
        nameSnapshot: item.nameVi,
        qty: line.qty,
        unitPrice,
        modifiersSnapshot: chosen,
        note: line.note,
        station: item.station,
        kitchenStatus: 'QUEUED',
      });
    }

    const settings = parseSettings(session.store.settings);
    let status: 'PENDING_CONFIRM' | 'ACCEPTED' = 'ACCEPTED';
    if (source === 'CUSTOMER') {
      if (settings.requireOrderConfirm) status = 'PENDING_CONFIRM';
      else if (settings.requireFirstOrderConfirm) {
        const accepted = await this.prisma.order.count({ where: { sessionId, status: 'ACCEPTED' } });
        if (accepted === 0) status = 'PENDING_CONFIRM';
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const todayCount = await tx.order.count({ where: { storeId, createdAt: { gte: startOfTodayVn() } } });
      const created = await tx.order.create({
        data: {
          storeId,
          sessionId,
          dailyNumber: todayCount + 1,
          source,
          status,
          idempotencyKey: input.idempotencyKey,
          note: input.note,
          createdById: staffId,
          approvedById: status === 'ACCEPTED' && staffId ? staffId : undefined,
          approvedAt: status === 'ACCEPTED' ? new Date() : undefined,
          items: { create: itemsData },
        },
        include: orderInclude,
      });
      await tx.tableSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date(), cart: source === 'CUSTOMER' ? { lines: [] } : undefined },
      });
      return created;
    });

    this.realtime.toStoreAndSession(storeId, sessionId, RealtimeEvent.ORDER_CREATED, order);
    if (source === 'CUSTOMER') this.realtime.toSession(sessionId, RealtimeEvent.CART_UPDATED, { lines: [] });
    return order;
  }

  /** Danh sách đơn cho phục vụ: mặc định đơn chờ xác nhận + đơn hôm nay. */
  list(storeId: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        ...(status ? { status: status as any } : { createdAt: { gte: startOfTodayVn() } }),
      },
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
      take: 200,
    });
  }

  async approve(storeId: string, orderId: string, staffId: string) {
    const order = await this.getPending(storeId, orderId);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'ACCEPTED', approvedById: staffId, approvedAt: new Date() },
      include: orderInclude,
    });
    this.realtime.toStoreAndSession(storeId, order.sessionId, RealtimeEvent.ORDER_UPDATED, updated);
    return updated;
  }

  async reject(storeId: string, orderId: string, staffId: string, reason?: string) {
    const order = await this.getPending(storeId, orderId);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'REJECTED', approvedById: staffId, approvedAt: new Date(), rejectReason: reason },
      include: orderInclude,
    });
    this.realtime.toStoreAndSession(storeId, order.sessionId, RealtimeEvent.ORDER_UPDATED, updated);
    return updated;
  }

  /** B1: danh sách món cho màn hình bếp, chỉ đơn đã nhận và món chưa ra. */
  kitchenQueue(storeId: string, station?: Station) {
    return this.prisma.orderItem.findMany({
      where: {
        storeId,
        ...(station ? { station } : {}),
        kitchenStatus: { in: ['QUEUED', 'COOKING'] }, // món DONE rời bếp, phục vụ bấm 'Đã mang ra' ở màn phục vụ
        order: { status: 'ACCEPTED', session: { status: 'OPEN' } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          select: {
            id: true,
            dailyNumber: true,
            note: true,
            createdAt: true,
            approvedAt: true,
            session: { select: { id: true, table: { select: { name: true, area: { select: { name: true } } } } } },
          },
        },
      },
    });
  }

  /** B2: bếp cập nhật trạng thái món. Khách và phục vụ thấy ngay. */
  async setKitchenStatus(storeId: string, itemId: string, status: KitchenStatus) {
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, storeId }, include: { order: true } });
    if (!item) throw new NotFoundException('Không tìm thấy món');
    const updated = await this.prisma.orderItem.update({ where: { id: itemId }, data: { kitchenStatus: status } });
    this.realtime.toStoreAndSession(storeId, item.order.sessionId, RealtimeEvent.ORDER_ITEM_UPDATED, {
      ...updated,
      orderId: item.orderId,
      sessionId: item.order.sessionId,
    });
    return updated;
  }

  private async getPending(storeId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, storeId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn');
    if (order.status !== 'PENDING_CONFIRM') throw new ConflictException('Đơn này đã được xử lý');
    return order;
  }
}
