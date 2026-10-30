import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CartSchema, CreateOrderSchema, CreateServiceRequestSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentCustomer, CustomerAuthGuard } from '../auth/guards';
import { CustomerPrincipal } from '../auth/auth.types';
import { CustomerService } from './customer.service';
import { OrdersService } from '../orders/orders.service';
import { RequestsService } from '../requests/requests.service';

@ApiTags('customer')
@Controller('c')
export class CustomerController {
  constructor(
    private readonly customer: CustomerService,
    private readonly orders: OrdersService,
    private readonly requests: RequestsService,
  ) {}

  @Post('scan/:qrToken')
  scan(@Param('qrToken') qrToken: string) {
    return this.customer.scan(qrToken);
  }

  @Get('menu')
  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  menu(@CurrentCustomer() p: CustomerPrincipal) {
    return this.customer.menuFor(p);
  }

  @Get('session')
  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  session(@CurrentCustomer() p: CustomerPrincipal) {
    return this.customer.sessionState(p);
  }

  @Put('cart')
  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  cart(@CurrentCustomer() p: CustomerPrincipal, @Body(new ZodPipe(CartSchema)) body: z.infer<typeof CartSchema>) {
    return this.customer.setCart(p, body);
  }

  @Post('orders')
  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  order(@CurrentCustomer() p: CustomerPrincipal, @Body(new ZodPipe(CreateOrderSchema)) body: z.infer<typeof CreateOrderSchema>) {
    return this.orders.create({ storeId: p.storeId, sessionId: p.sessionId, source: 'CUSTOMER', input: body });
  }

  @Post('service-requests')
  @ApiBearerAuth()
  @UseGuards(CustomerAuthGuard)
  request(@CurrentCustomer() p: CustomerPrincipal, @Body(new ZodPipe(CreateServiceRequestSchema)) body: z.infer<typeof CreateServiceRequestSchema>) {
    return this.requests.create(p.storeId, p.sessionId, body.type);
  }
}
