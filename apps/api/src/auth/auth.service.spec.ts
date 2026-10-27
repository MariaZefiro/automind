import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({ verify: jest.fn() }));

const verifyMock = jest.mocked(verify);

describe('AuthService', () => {
  let service: AuthService;
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }],
    })
      .compile();
    service = module.get(AuthService);
  });

  it('returns a signed token and safe user for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id', name: 'Alex', email: 'alex@example.test', passwordHash: 'argon-hash',
      role: 'USER', departmentId: null,
    });
    verifyMock.mockResolvedValue(true);

    await expect(service.login({ email: 'ALEX@example.test', password: 'StrongPassword1' })).resolves.toEqual({
      accessToken: 'signed.jwt.token', tokenType: 'Bearer',
      user: { id: 'user-id', name: 'Alex', email: 'alex@example.test', role: 'USER', departmentId: null },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'alex@example.test' } });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'user-id', email: 'alex@example.test', role: 'USER' });
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'missing@example.test', password: 'StrongPassword1' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyMock).not.toHaveBeenCalled();
  });
});
