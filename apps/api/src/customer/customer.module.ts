import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { TablesModule } from '../tables/tables.module';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [TablesModule, MenuModule, OrdersModule, RequestsModule],
  providers: [CustomerService],
  controllers: [CustomerController],
})
export class CustomerModule {}
