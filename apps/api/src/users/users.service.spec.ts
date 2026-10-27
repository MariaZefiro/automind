import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));

describe('UsersService', () => {
  const admin = { sub: 'admin-id', email: 'admin@example.com', role: Role.ADMIN };
  const createdUser = {
    id: 'user-id', name: 'Ana Pessoa', email: 'ana@example.com', passwordHash: 'hashed-password',
    role: Role.USER, departmentId: null, createdAt: new Date(), updatedAt: new Date(),
  };

  it('creates users with a hashed password and records the administrator action', async () => {
    const tx = {
      user: { create: jest.fn().mockResolvedValue(createdUser) },
      userAudit: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    const result = await service.create({ name: 'Ana Pessoa', email: 'ANA@example.com', password: 'a-strong-password' }, admin);

    expect(result).not.toHaveProperty('passwordHash');
    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'ana@example.com', passwordHash: 'hashed-password' }) }));
    expect(tx.userAudit.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: admin.sub, targetUserId: createdUser.id, action: 'USER_CREATED' }) });
  });

  it('prevents demoting the last administrator', async () => {
    const tx = {
      user: { count: jest.fn().mockResolvedValue(0), update: jest.fn() },
      userAudit: { create: jest.fn() },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...createdUser, role: Role.ADMIN }) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.update(createdUser.id, { role: Role.USER }, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.count).toHaveBeenCalledWith({ where: { role: Role.ADMIN, id: { not: createdUser.id } } });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
