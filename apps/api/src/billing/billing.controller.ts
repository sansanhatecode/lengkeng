import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CloseSessionSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentStaff, Roles, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { BillingService } from './billing.service';

@ApiTags('staff · billing')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s/sessions')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get(':id/bill')
  bill(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Query('discount') discount?: string,
    @Query('surcharge') surcharge?: string,
  ) {
    return this.billing.bill(p.storeId, id, {
      discount: discount ? Number(discount) : undefined,
      surcharge: surcharge ? Number(surcharge) : undefined,
    });
  }

  @Post(':id/close')
  @Roles('CASHIER', 'MANAGER')
  close(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(CloseSessionSchema)) body: z.infer<typeof CloseSessionSchema>) {
    return this.billing.close(p.storeId, id, body, p.sub);
  }

  @Post(':id/void')
  @Roles('CASHIER', 'WAITER', 'MANAGER')
  voidSession(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.billing.voidSession(p.storeId, id, p.sub);
  }
}
