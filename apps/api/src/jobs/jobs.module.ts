import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { BillingModule } from '../billing/billing.module';

@Module({ imports: [BillingModule], providers: [JobsService] })
export class JobsModule {}
