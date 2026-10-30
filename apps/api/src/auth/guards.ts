import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { CustomerPrincipal, PlatformPrincipal, Principal, StaffPrincipal } from './auth.types';
import { PrismaService } from '../prisma/prisma.service';

const ROLES_KEY = 'roles';
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);

const extractToken = (req: any): string | undefined => {
  const h: string | undefined = req.headers?.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return undefined;
};

/** Cho phép token staff hoặc device (dùng cho endpoint đổi ca bằng PIN). */
@Injectable()
export class StoreAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Thiếu token');
    const p = this.auth.verify(token);
    if (p.kind !== 'staff' && p.kind !== 'device') throw new UnauthorizedException();
    req.principal = p;
    return true;
  }
}

/** Quản trị hệ thống: chỉ token kind=platform. */
@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Thiếu token');
    const p = this.auth.verify(token);
    if (p.kind !== 'platform') throw new UnauthorizedException('Cần đăng nhập quản trị hệ thống');
    req.principal = p;
    return true;
  }
}

/** Chỉ nhân viên đã xác định (sau khi login hoặc PIN), kiểm tra vai trò nếu có @Roles. */
@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Thiếu token');
    const p = this.auth.verify(token);
    if (p.kind !== 'staff') throw new UnauthorizedException('Cần đăng nhập nhân viên');
    const roles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length && !roles.includes(p.role) && p.role !== 'OWNER') {
      throw new ForbiddenException('Vai trò của bạn không được phép làm việc này');
    }
    req.principal = p;
    return true;
  }
}

/** Khách: token phiên phải thuộc phiên bàn đang mở. */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Thiếu mã phiên');
    const p = this.auth.verify(token);
    if (p.kind !== 'customer') throw new UnauthorizedException();
    const session = await this.prisma.tableSession.findFirst({
      where: { id: p.sessionId, storeId: p.storeId, status: 'OPEN' },
      select: { id: true },
    });
    if (!session) throw new UnauthorizedException({ code: 'SESSION_CLOSED', message: 'Bàn đã được đóng' });
    req.principal = p;
    return true;
  }
}

export const CurrentStaff = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): StaffPrincipal => ctx.switchToHttp().getRequest().principal,
);
export const CurrentCustomer = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CustomerPrincipal => ctx.switchToHttp().getRequest().principal,
);
export const CurrentPrincipal = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Principal => ctx.switchToHttp().getRequest().principal,
);
export const CurrentPlatformAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PlatformPrincipal => ctx.switchToHttp().getRequest().principal,
);
