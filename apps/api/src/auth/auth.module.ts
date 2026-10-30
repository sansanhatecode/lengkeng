import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CustomerAuthGuard, PlatformAuthGuard, StaffAuthGuard, StoreAuthGuard } from './guards';
import { StoresModule } from '../stores/stores.module';

@Global()
@Module({
  imports: [
    StoresModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 16) throw new Error('JWT_SECRET phải có ít nhất 16 ký tự');
        return { secret };
      },
    }),
  ],
  providers: [AuthService, StaffAuthGuard, StoreAuthGuard, CustomerAuthGuard, PlatformAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, StaffAuthGuard, StoreAuthGuard, CustomerAuthGuard, PlatformAuthGuard],
})
export class AuthModule {}
