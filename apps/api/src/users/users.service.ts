import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'argon2';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');
    const passwordHash = await hash(dto.password, { type: 2 });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          name: dto.name, email, passwordHash, role: dto.role ?? Role.USER, departmentId: dto.departmentId,
        } });
        await tx.userAudit.create({ data: {
          actorId: actor.sub, targetUserId: user.id, action: 'USER_CREATED',
          changes: { name: user.name, email: user.email, role: user.role, departmentId: user.departmentId },
        } });
        return this.safeUser(user);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, departmentId: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');

    const email = dto.email?.toLowerCase();
    if (email && email !== existing.email && await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email already registered');
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (email !== undefined) data.email = email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.departmentId !== undefined) data.department = dto.departmentId === null
      ? { disconnect: true }
      : { connect: { id: dto.departmentId } };
    if (dto.password) data.passwordHash = await hash(dto.password, { type: 2 });

    const changes = {
      ...(dto.name !== undefined && { name: { from: existing.name, to: dto.name } }),
      ...(email !== undefined && { email: { from: existing.email, to: email } }),
      ...(dto.role !== undefined && { role: { from: existing.role, to: dto.role } }),
      ...(dto.departmentId !== undefined && { departmentId: { from: existing.departmentId, to: dto.departmentId } }),
      ...(dto.password && { passwordChanged: true }),
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (existing.role === Role.ADMIN && dto.role && dto.role !== Role.ADMIN) {
          const otherAdmins = await tx.user.count({ where: { role: Role.ADMIN, id: { not: userId } } });
          if (otherAdmins === 0) throw new ConflictException('At least one administrator must remain');
        }
        const user = await tx.user.update({ where: { id: userId }, data });
        await tx.userAudit.create({ data: {
          actorId: actor.sub, targetUserId: userId, action: 'USER_UPDATED', changes,
        } });
        return this.safeUser(user);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  private safeUser<T extends { passwordHash: string }>(user: T) {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
