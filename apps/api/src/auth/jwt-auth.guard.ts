import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Bearer token required');

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      if (!payload.sub || !payload.email || !payload.role) throw new Error('Invalid token payload');
      const currentUser = await this.prisma.user.findUnique({
        where: { id: payload.sub }, select: { id: true, email: true, role: true },
      });
      if (!currentUser) throw new Error('User no longer exists');
      request.user = { sub: currentUser.id, email: currentUser.email, role: currentUser.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
