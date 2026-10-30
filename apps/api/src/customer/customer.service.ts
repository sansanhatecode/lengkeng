import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Cart, RealtimeEvent } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TablesService } from '../tables/tables.service';
import { MenuService } from '../menu/menu.service';
import { RealtimeService } from '../realtime/realtime.service';
import { parseSettings } from '../common/settings';
import { orderInclude } from '../orders/orders.service';
import { CustomerPrincipal } from '../auth/auth.types';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly tables: TablesService,
    private readonly menu: MenuService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * K1: khách quét QR. Trả về mã phiên để gọi các API còn lại.
   * Bàn chưa có phiên: mở phiên mới nếu quán cho phép (ON_SCAN), ngược lại báo chờ nhân viên.
   */
  async scan(qrToken: string) {
    const table = await this.prisma.table.findUnique({ where: { qrToken }, include: { store: true, area: true } });
    if (!table) throw new NotFoundException('Mã QR không hợp lệ. Hãy gọi nhân viên để được hỗ trợ.');
    if (!table.store.isActive) throw new ConflictException({ code: 'STORE_SUSPENDED', message: 'Quán tạm ngưng nhận đơn qua QR' });
    if (table.status === 'LOCKED') throw new ConflictException({ code: 'TABLE_LOCKED', message: 'Bàn này hiện không nhận đơn' });

    const settings = parseSettings(table.store.settings);
    let session = await this.prisma.tableSession.findFirst({ where: { tableId: table.id, status: 'OPEN' } });
    if (!session) {
      if (settings.sessionOpenMode === 'BY_STAFF') {
        throw new ConflictException({ code: 'WAIT_FOR_STAFF', message: 'Vui lòng chờ nhân viên mở bàn' });
      }
      session = await this.tables.openSession(table.storeId, table.id, {});
    }

    const token = this.auth.signCustomer({ kind: 'customer', storeId: table.storeId, tableId: table.id, sessionId: session.id });
    return {
      token,
      store: { id: table.store.id, name: table.store.name, languages: settings.languages, vatPercent: settings.vatPercent },
      table: { id: table.id, name: table.name, area: table.area.name },
      session: { id: session.id, openedAt: session.openedAt },
    };
  }

  menuFor(p: CustomerPrincipal) {
    return this.menu.customerMenu(p.storeId);
  }

  /** K5: toàn bộ đơn của phiên kèm trạng thái bếp, cộng giỏ chung. */
  async sessionState(p: CustomerPrincipal) {
    const session = await this.prisma.tableSession.findUniqueOrThrow({
      where: { id: p.sessionId },
      include: { orders: { orderBy: { createdAt: 'asc' }, include: orderInclude }, serviceRequests: { where: { handledAt: null } } },
    });
    const accepted = session.orders.filter((o) => o.status === 'ACCEPTED');
    const subtotal = accepted.reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty * i.unitPrice, 0), 0);
    return { id: session.id, status: session.status, cart: session.cart as Cart, orders: session.orders, openRequests: session.serviceRequests, subtotal };
  }

  /** K4: giỏ hàng chung của bàn. Ghi đè toàn bộ, người sau cùng thắng; đủ cho một bàn vài người. */
  async setCart(p: CustomerPrincipal, cart: Cart) {
    await this.prisma.tableSession.update({ where: { id: p.sessionId }, data: { cart, lastActivityAt: new Date() } });
    this.realtime.toSession(p.sessionId, RealtimeEvent.CART_UPDATED, cart);
    return cart;
  }
}
