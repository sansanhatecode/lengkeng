import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Station } from '@prisma/client';
import { z } from 'zod';
import { CreateOrderSchema, RejectOrderSchema, UpdateKitchenStatusSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentStaff, Roles, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { OrdersService } from './orders.service';

@ApiTags('staff · orders')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  list(@CurrentStaff() p: StaffPrincipal, @Query('status') status?: string) {
    return this.orders.list(p.storeId, status);
  }

  /** V3: phục vụ gọi món hộ khách vào phiên đang mở. */
  @Post('sessions/:sessionId/orders')
  @Roles('WAITER', 'CASHIER', 'MANAGER')
  createForSession(
    @CurrentStaff() p: StaffPrincipal,
    @Param('sessionId') sessionId: string,
    @Body(new ZodPipe(CreateOrderSchema)) body: z.infer<typeof CreateOrderSchema>,
  ) {
    return this.orders.create({ storeId: p.storeId, sessionId, source: 'STAFF', input: body, staffId: p.sub });
  }

  @Post('orders/:id/approve')
  @Roles('WAITER', 'CASHIER', 'MANAGER')
  approve(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.orders.approve(p.storeId, id, p.sub);
  }

  @Post('orders/:id/reject')
  @Roles('WAITER', 'CASHIER', 'MANAGER')
  reject(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(RejectOrderSchema)) body: z.infer<typeof RejectOrderSchema>,
  ) {
    return this.orders.reject(p.storeId, id, p.sub, body.reason);
  }

  @Get('kitchen/queue')
  kitchenQueue(@CurrentStaff() p: StaffPrincipal, @Query('station') station?: Station) {
    return this.orders.kitchenQueue(p.storeId, station);
  }

  @Patch('order-items/:id/status')
  @Roles('KITCHEN', 'WAITER', 'MANAGER')
  setStatus(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(UpdateKitchenStatusSchema)) body: z.infer<typeof UpdateKitchenStatusSchema>,
  ) {
    return this.orders.setKitchenStatus(p.storeId, id, body.status);
  }
}
