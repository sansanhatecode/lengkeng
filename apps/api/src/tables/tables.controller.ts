import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AreaInputSchema, OpenSessionSchema, TableInputSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentStaff, Roles, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { TablesService } from './tables.service';

@ApiTags('staff · tables')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get('floor')
  floor(@CurrentStaff() p: StaffPrincipal) {
    return this.tables.floor(p.storeId);
  }

  @Post('tables/:id/open-session')
  @Roles('WAITER', 'CASHIER', 'MANAGER')
  open(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(OpenSessionSchema)) body: z.infer<typeof OpenSessionSchema>) {
    return this.tables.openSession(p.storeId, id, { guestCount: body.guestCount, staffId: p.sub });
  }

  @Get('areas')
  areas(@CurrentStaff() p: StaffPrincipal) {
    return this.tables.listAreas(p.storeId);
  }
  @Post('areas')
  @Roles('OWNER', 'MANAGER')
  createArea(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(AreaInputSchema)) body: z.infer<typeof AreaInputSchema>) {
    return this.tables.createArea(p.storeId, body);
  }
  @Patch('areas/:id')
  @Roles('OWNER', 'MANAGER')
  updateArea(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(AreaInputSchema.partial())) body: Partial<z.infer<typeof AreaInputSchema>>) {
    return this.tables.updateArea(p.storeId, id, body);
  }
  @Delete('areas/:id')
  @Roles('OWNER', 'MANAGER')
  deleteArea(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.tables.deleteArea(p.storeId, id);
  }

  @Post('tables')
  @Roles('OWNER', 'MANAGER')
  createTable(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(TableInputSchema)) body: z.infer<typeof TableInputSchema>) {
    return this.tables.createTable(p.storeId, body);
  }
  @Patch('tables/:id')
  @Roles('OWNER', 'MANAGER')
  rename(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(z.object({ name: z.string().min(1).max(30) }))) body: { name: string }) {
    return this.tables.renameTable(p.storeId, id, body.name);
  }
  @Delete('tables/:id')
  @Roles('OWNER', 'MANAGER')
  deleteTable(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.tables.deleteTable(p.storeId, id);
  }
  @Post('tables/:id/rotate-qr')
  @Roles('OWNER', 'MANAGER')
  rotate(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.tables.rotateQr(p.storeId, id);
  }
  @Post('tables/:id/lock')
  @Roles('OWNER', 'MANAGER')
  lock(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string, @Body(new ZodPipe(z.object({ locked: z.boolean() }))) body: { locked: boolean }) {
    return this.tables.setLocked(p.storeId, id, body.locked);
  }
  @Get('tables/qr')
  @Roles('OWNER', 'MANAGER')
  qr(@CurrentStaff() p: StaffPrincipal) {
    return this.tables.qrImages(p.storeId);
  }
}
