import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const valid = user ? await verify(user.passwordHash, dto.password).catch(() => false) : false;
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      tokenType: 'Bearer',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId },
    };
  }
}
