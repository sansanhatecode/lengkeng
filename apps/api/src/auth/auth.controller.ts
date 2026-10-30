import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginSchema, PinLoginSchema, RegisterStoreSchema } from '@lengkeng/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';
import { CurrentPrincipal, CurrentStaff, StaffAuthGuard, StoreAuthGuard } from './guards';
import { Principal, StaffPrincipal } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Tự đăng ký quán mới: tạo cửa hàng, chủ quán, 1 khu vực và N bàn có QR; trả token đăng nhập luôn. */
  @Post('register')
  register(@Body(new ZodPipe(RegisterStoreSchema)) body: z.infer<typeof RegisterStoreSchema>) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body(new ZodPipe(LoginSchema)) body: z.infer<typeof LoginSchema>) {
    return this.auth.login(body.email, body.password, body.deviceName);
  }

  @Post('pin')
  @ApiBearerAuth()
  @UseGuards(StoreAuthGuard)
  pin(@CurrentPrincipal() p: Principal, @Body(new ZodPipe(PinLoginSchema)) body: z.infer<typeof PinLoginSchema>) {
    return this.auth.pinLogin(p, body.pin);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(StaffAuthGuard)
  me(@CurrentStaff() p: StaffPrincipal) {
    return this.auth.me(p);
  }
}
