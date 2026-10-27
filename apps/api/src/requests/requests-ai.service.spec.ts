import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Priority, RequestCategory, Role } from '@prisma/client';
import { AiClassificationService } from '../ai/ai-classification.service';
import { AiClassificationProvider } from '../ai/ai-classification-provider';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

describe('RequestsService.classifyWithAi', () => {
  const actor: AuthenticatedUser = { sub: 'user-id', email: 'user@example.test', role: Role.USER };
  const request = {
    id: 'request-id', title: 'Cannot access finance app', description: 'Access denied when signing in to the finance app.',
    authorId: actor.sub, department: { id: 'it-id', name: 'TI' },
  };
  const result = {
    category: RequestCategory.ACCESS,
    priority: Priority.HIGH,
    suggestedDepartment: 'TI',
    summary: 'Usuário sem acesso ao sistema financeiro.',
    suggestedAction: 'Verificar permissões da conta.',
    confidence: 0.91,
  };

  function setup(providerResult: unknown = result) {
    const provider: AiClassificationProvider = { classify: jest.fn().mockResolvedValue(providerResult) };
    const ai = new AiClassificationService(provider);
    const createdClassification = { id: 'classification-id', source: 'AI', ...result };
    const tx = {
      requestClassification: { create: jest.fn().mockResolvedValue(createdClassification) },
      request: { update: jest.fn().mockResolvedValue({}) },
      requestHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      request: { findUnique: jest.fn().mockResolvedValue(request) },
      department: { findMany: jest.fn().mockResolvedValue([{ id: 'it-id', name: 'TI' }]) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaService;
    return { service: new RequestsService(prisma, ai), provider, prisma, tx };
  }

  it('creates a validated AI classification and records it for human review', async () => {
    const { service, provider, prisma, tx } = setup();
    await expect(service.classifyWithAi(request.id, actor)).resolves.toMatchObject({ source: 'AI' });
    expect(provider.classify).toHaveBeenCalledWith(expect.objectContaining({ title: request.title, currentDepartment: 'TI' }));
    expect(tx.requestClassification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requestId: request.id, source: 'AI', suggestedDepartmentId: 'it-id', confidence: 0.91 }),
    }));
    expect(tx.request.update).toHaveBeenCalledWith({ where: { id: request.id }, data: { status: 'AWAITING_REVIEW' } });
    expect(tx.requestHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'AI_CLASSIFICATION_CREATED', userId: actor.sub }),
    }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid structured provider output without persisting it', async () => {
    const { service, tx } = setup({ ...result, confidence: 1.5 });
    await expect(service.classifyWithAi(request.id, actor)).rejects.toBeInstanceOf(BadGatewayException);
    expect(tx.requestClassification.create).not.toHaveBeenCalled();
  });

  it('propagates provider failures as an API gateway error without persistence', async () => {
    const ai = new AiClassificationService({ classify: jest.fn().mockRejectedValue(new Error('provider offline')) });
    const prisma = {
      request: { findUnique: jest.fn().mockResolvedValue(request) },
      department: { findMany: jest.fn().mockResolvedValue([{ id: 'it-id', name: 'TI' }]) },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const failingService = new RequestsService(prisma, ai);
    await expect(failingService.classifyWithAi(request.id, actor)).rejects.toBeInstanceOf(BadGatewayException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing request before calling the AI provider', async () => {
    const { service, provider, prisma } = setup();
    (prisma.request.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.classifyWithAi(request.id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(provider.classify).not.toHaveBeenCalled();
  });
});
