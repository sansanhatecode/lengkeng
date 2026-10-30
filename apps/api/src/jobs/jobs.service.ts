import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { parseSettings } from '../common/settings';
import { BillingService } from '../billing/billing.service';

/** Việc chạy nền trong tiến trình. Chuyển sang BullMQ khi có Redis. */
@Injectable()
export class JobsService {
  private readonly log = new Logger('Jobs');
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  /**
   * Tự đóng phiên không hoạt động quá N giờ (mặc định 4).
   * Phiên không có đơn thì hủy luôn. Phiên có đơn chưa thu tiền thì để lại cho thu ngân, chỉ ghi log.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCloseIdleSessions() {
    const stores = await this.prisma.store.findMany({ select: { id: true, settings: true } });
    for (const store of stores) {
      const hours = parseSettings(store.settings).autoCloseSessionHours;
      const cutoff = new Date(Date.now() - hours * 3600 * 1000);
      const idle = await this.prisma.tableSession.findMany({
        where: { storeId: store.id, status: 'OPEN', lastActivityAt: { lt: cutoff } },
        include: { _count: { select: { orders: { where: { status: 'ACCEPTED' } } } } },
      });
      for (const s of idle) {
        if (s._count.orders === 0) {
          await this.billing.voidSession(store.id, s.id, 'system').catch((e) => this.log.warn(`void ${s.id}: ${e.message}`));
          this.log.log(`Tự đóng phiên trống ${s.id}`);
        } else {
          this.log.warn(`Phiên ${s.id} quá ${hours}h chưa thu tiền, chờ thu ngân xử lý`);
        }
      }
    }
  }
}
