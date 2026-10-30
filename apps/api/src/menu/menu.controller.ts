import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AvailabilitySchema, CategoryInputSchema, MenuItemInputSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentStaff, Roles, StaffAuthGuard } from '../auth/guards';
import { StaffPrincipal } from '../auth/auth.types';
import { MenuService } from './menu.service';

@ApiTags('staff · menu')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard)
@Controller('s/menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  full(@CurrentStaff() p: StaffPrincipal) {
    return this.menu.fullMenu(p.storeId);
  }

  /** Bếp, phục vụ, quản lý đều được báo hết món. */
  @Patch('items/:id/availability')
  availability(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(AvailabilitySchema)) body: z.infer<typeof AvailabilitySchema>,
  ) {
    return this.menu.setAvailability(p.storeId, id, body.isAvailable);
  }

  @Post('categories')
  @Roles('OWNER', 'MANAGER')
  createCategory(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(CategoryInputSchema)) body: z.infer<typeof CategoryInputSchema>) {
    return this.menu.createCategory(p.storeId, body);
  }

  @Put('categories/:id')
  @Roles('OWNER', 'MANAGER')
  updateCategory(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(CategoryInputSchema.partial())) body: Partial<z.infer<typeof CategoryInputSchema>>,
  ) {
    return this.menu.updateCategory(p.storeId, id, body);
  }

  @Delete('categories/:id')
  @Roles('OWNER', 'MANAGER')
  deleteCategory(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.menu.deleteCategory(p.storeId, id);
  }

  @Post('items')
  @Roles('OWNER', 'MANAGER')
  createItem(@CurrentStaff() p: StaffPrincipal, @Body(new ZodPipe(MenuItemInputSchema)) body: z.infer<typeof MenuItemInputSchema>) {
    return this.menu.createItem(p.storeId, body);
  }

  @Put('items/:id')
  @Roles('OWNER', 'MANAGER')
  updateItem(
    @CurrentStaff() p: StaffPrincipal,
    @Param('id') id: string,
    @Body(new ZodPipe(MenuItemInputSchema)) body: z.infer<typeof MenuItemInputSchema>,
  ) {
    return this.menu.updateItem(p.storeId, id, body);
  }

  @Delete('items/:id')
  @Roles('OWNER', 'MANAGER')
  deleteItem(@CurrentStaff() p: StaffPrincipal, @Param('id') id: string) {
    return this.menu.deleteItem(p.storeId, id);
  }
}
