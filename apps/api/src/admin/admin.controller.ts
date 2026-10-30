import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { StaffInputSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentStaff, Roles, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { AdminService } from './admin.service';

const UpdateStoreSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(200).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
});

@ApiTags('staff · admin')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('store')
  store(@CurrentStaff() p: StaffPrincipal) {
    return this.admin.store(p.storeId);
  }

  @Patch('store')
  @Roles('OWNER', 'MANAGER')
  updateStore(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(UpdateStoreSchema)) body: z.infer<typeof UpdateStoreSchema>) {
    return this.admin.updateStore(p.storeId, body);
  }

  @Get('staff')
  @Roles('OWNER', 'MANAGER')
  staff(@CurrentStaff() p: StaffPrincipal) {
    return this.admin.listStaff(p.storeId);
  }

  @Post('staff')
  @Roles('OWNER', 'MANAGER')
  createStaff(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(StaffInputSchema)) body: z.infer<typeof StaffInputSchema>) {
    return this.admin.createStaff(p.storeId, body);
  }

  @Patch('staff/:id')
  @Roles('OWNER', 'MANAGER')
  updateStaff(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(StaffInputSchema.partial())) body: Partial<z.infer<typeof StaffInputSchema>>) {
    return this.admin.updateStaff(p.storeId, id, body);
  }

  @Get('devices')
  @Roles('OWNER', 'MANAGER')
  devices(@CurrentStaff() p: StaffPrincipal) {
    return this.admin.devices(p.storeId);
  }

  @Delete('devices/:id')
  @Roles('OWNER', 'MANAGER')
  revoke(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.admin.revokeDevice(p.storeId, id);
  }
}
