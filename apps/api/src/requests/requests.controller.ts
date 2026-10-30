import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentStaff, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { RequestsService } from './requests.service';

@ApiTags('staff · service requests')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s/service-requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@CurrentStaff() p: StaffPrincipal) {
    return this.requests.listOpen(p.storeId);
  }

  @Post(':id/handle')
  handle(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.requests.handle(p.storeId, id, p.sub);
  }
}
