import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CustomerModule } from './customer/customer.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';
import { BillingModule } from './billing/billing.module';
import { RequestsModule } from './requests/requests.module';
import { AdminModule } from './admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { PlatformModule } from './platform/platform.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    RealtimeModule,
    MenuModule,
    OrdersModule,
    TablesModule,
    BillingModule,
    RequestsModule,
    CustomerModule,
    AdminModule,
    JobsModule,
    PlatformModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
