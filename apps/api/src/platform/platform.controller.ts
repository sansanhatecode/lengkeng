import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { PlatformCreateStoreSchema, PlatformLoginSchema, PlatformUpdateStoreSchema } from '@lengkeng/shared';
import { ZodPipe } from '../common/zod.pipe';
import { CurrentPlatformAdmin, PlatformAuthGuard } from '../auth/guards';
import { PlatformPrincipal } from '../auth/auth.types';
import { PlatformService } from './platform.service';

@ApiTags('platform · quản trị hệ thống')
@Controller('p')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Post('login')
  login(@Body(new ZodPipe(PlatformLoginSchema)) body: z.infer<typeof PlatformLoginSchema>) {
    return this.platform.login(body.email, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(PlatformAuthGuard)
  me(@CurrentPlatformAdmin() p: PlatformPrincipal) {
    return this.platform.me(p);
  }

  @Get('stores')
  @ApiBearerAuth()
  @UseGuards(PlatformAuthGuard)
  stores(@Query('q') q?: string) {
    return this.platform.listStores(q?.trim() || undefined);
  }

  @Post('stores')
  @ApiBearerAuth()
  @UseGuards(PlatformAuthGuard)
  createStore(@Body(new ZodPipe(PlatformCreateStoreSchema)) body: z.infer<typeof PlatformCreateStoreSchema>) {
    return this.platform.createStore(body);
  }

  @Patch('stores/:id')
  @ApiBearerAuth()
  @UseGuards(PlatformAuthGuard)
  updateStore(@Param('id') id: string, @Body(new ZodPipe(PlatformUpdateStoreSchema)) body: z.infer<typeof PlatformUpdateStoreSchema>) {
    return this.platform.updateStore(id, body);
  }
}
