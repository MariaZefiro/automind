import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RequestStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

describe('RequestsService.update', () => {
  const request = {
    id: 'request-id', title: 'Help', description: 'A sufficiently long request description',
    status: RequestStatus.PENDING, authorId: 'owner-id', departmentId: null,
  };
  const tx = {
    request: { update: jest.fn().mockResolvedValue(request) },
    requestHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    request: { findUnique: jest.fn().mockResolvedValue(request) },
    requestClassification: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;
  const service = new RequestsService(prisma, { classify: jest.fn() } as never);
  const actor = (role: Role, sub: string): AuthenticatedUser => ({ role, sub, email: `${sub}@example.com` });

  beforeEach(() => jest.clearAllMocks());

  it('only lets a requester edit their own request', async () => {
    await expect(service.update(request.id, { title: 'Changed title' }, actor(Role.USER, 'another-user')))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only lets requesters edit requests that are still pending', async () => {
    (prisma.request.findUnique as jest.Mock).mockResolvedValueOnce({ ...request, status: RequestStatus.IN_REVIEW });
    await expect(service.update(request.id, { description: 'A replacement request description' }, actor(Role.USER, request.authorId)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires an approved human review before setting approved status', async () => {
    await expect(service.update(request.id, { status: RequestStatus.APPROVED }, actor(Role.REVIEWER, 'reviewer-id')))
      .rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records request edits in the same transaction', async () => {
    await service.update(request.id, { title: 'Updated request title' }, actor(Role.USER, request.authorId));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.requestHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requestId: request.id, action: 'REQUEST_UPDATED' }),
    }));
  });
});
