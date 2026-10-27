import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RequestStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { AiClassificationService } from '../ai/ai-classification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassificationDto } from './create-classification.dto';
import { CreateRequestDto } from './create-request.dto';
import { ReviewClassificationDto } from './review-classification.dto';
import { UpdateRequestDto } from './update-request.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService, private readonly aiClassification: AiClassificationService) {}

  async create(dto: CreateRequestDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({ data: { ...dto, authorId: actor.sub } });
      await tx.requestHistory.create({ data: {
        requestId: request.id, userId: actor.sub, action: 'REQUEST_CREATED',
        description: 'Solicitação criada.', metadata: { status: request.status },
      } });
      return request;
    });
  }

  async list(actor: AuthenticatedUser) {
    const where = actor.role === Role.ADMIN || actor.role === Role.REVIEWER ? {} : { authorId: actor.sub };
    return this.prisma.request.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        department: true,
        classifications: {
          orderBy: { createdAt: 'desc' },
          include: { reviewedBy: { select: { id: true, name: true } }, suggestedDepartment: true },
        },
      },
    });
  }

  async findOne(requestId: string, actor: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId }, include: {
      author: { select: { id: true, name: true, email: true } }, department: true,
      classifications: { orderBy: { createdAt: 'desc' }, include: { reviewedBy: { select: { id: true, name: true } }, suggestedDepartment: true } },
    } });
    if (!request) throw new NotFoundException('Request not found');
    this.assertCanRead(request.authorId, actor);
    return request;
  }

  async update(requestId: string, dto: UpdateRequestDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!existing) throw new NotFoundException('Request not found');
    const isRequester = actor.role === Role.USER;
    if (isRequester && existing.authorId !== actor.sub) throw new ForbiddenException('You cannot edit this request');
    if (isRequester && existing.status !== RequestStatus.PENDING) {
      throw new ForbiddenException('Only pending requests can be edited');
    }
    if (isRequester && dto.status !== undefined && dto.status !== RequestStatus.CANCELLED) {
      throw new ForbiddenException('Requesters can only cancel their own request');
    }
    if (!isRequester && dto.status === RequestStatus.APPROVED) {
      const reviewed = await this.prisma.requestClassification.count({ where: { requestId, reviewedAt: { not: null } } });
      if (!reviewed) throw new ConflictException('A human-reviewed classification is required before approval');
    }

    const data: Prisma.RequestUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.departmentId !== undefined) data.department = dto.departmentId === null
      ? { disconnect: true }
      : { connect: { id: dto.departmentId } };
    if (dto.status !== undefined) data.status = dto.status;
    const changes = Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, { from: existing[key as keyof typeof existing], to: value }]));

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.update({ where: { id: requestId }, data });
      await tx.requestHistory.create({ data: {
        requestId, userId: actor.sub, action: 'REQUEST_UPDATED',
        description: isRequester ? 'Solicitação atualizada pelo solicitante.' : 'Solicitação atualizada por usuário autorizado.',
        metadata: changes,
      } });
      return request;
    });
  }

  async createClassification(requestId: string, dto: CreateClassificationDto, actor: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId }, select: { id: true } });
    if (!request) throw new NotFoundException('Request not found');
    return this.prisma.$transaction(async (tx) => {
      const classification = await tx.requestClassification.create({ data: { ...dto, requestId, source: 'MANUAL' } });
      await tx.request.update({ where: { id: requestId }, data: { status: 'AWAITING_REVIEW' } });
      await tx.requestHistory.create({ data: {
        requestId, userId: actor.sub, action: 'CLASSIFICATION_CREATED',
        description: 'Classificação registrada para revisão humana.',
        metadata: { classificationId: classification.id, source: classification.source },
      } });
      return classification;
    });
  }

  async classifyWithAi(requestId: string, actor: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { department: true },
    });
    if (!request) throw new NotFoundException('Request not found');
    this.assertCanRead(request.authorId, actor);

    const departments = await this.prisma.department.findMany({ select: { id: true, name: true } });
    const result = await this.aiClassification.classify({
      title: request.title,
      description: request.description,
      currentDepartment: request.department?.name ?? null,
      availableDepartments: departments.map((department) => department.name),
    });
    const suggestedDepartment = result.suggestedDepartment === null
      ? null
      : departments.find((department) => department.name.toLocaleLowerCase() === result.suggestedDepartment?.toLocaleLowerCase());
    if (result.suggestedDepartment !== null && !suggestedDepartment) {
      throw new ConflictException('A IA sugeriu um departamento que não existe.');
    }

    return this.prisma.$transaction(async (tx) => {
      const classification = await tx.requestClassification.create({
        data: {
          requestId,
          category: result.category,
          priority: result.priority,
          suggestedDepartmentId: suggestedDepartment?.id,
          summary: result.summary,
          suggestedAction: result.suggestedAction,
          confidence: result.confidence,
          source: 'AI',
        },
        include: { suggestedDepartment: true, reviewedBy: { select: { id: true, name: true } } },
      });
      await tx.request.update({ where: { id: requestId }, data: { status: 'AWAITING_REVIEW' } });
      await tx.requestHistory.create({
        data: {
          requestId,
          userId: actor.sub,
          action: 'AI_CLASSIFICATION_CREATED',
          description: 'Classificação sugerida por IA e aguardando revisão humana.',
          metadata: { classificationId: classification.id, source: classification.source, confidence: classification.confidence },
        },
      });
      return classification;
    });
  }

  async reviewClassification(requestId: string, classificationId: string, dto: ReviewClassificationDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.requestClassification.findFirst({ where: { id: classificationId, requestId } });
    if (!existing) throw new NotFoundException('Classification not found');
    if (existing.reviewedAt) throw new ForbiddenException('Classification has already been reviewed');

    const corrected = Object.entries(dto).some(([key, value]) => value !== existing[key as keyof typeof existing]);

    return this.prisma.$transaction(async (tx) => {
      const classification = await tx.requestClassification.update({
        where: { id: classificationId },
        data: { ...dto, reviewedById: actor.sub, reviewedAt: new Date() },
      });
      await tx.request.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
      await tx.requestHistory.create({ data: {
        requestId, userId: actor.sub, action: 'CLASSIFICATION_REVIEWED',
        description: corrected
          ? 'Classificação revisada e corrigida por usuário autorizado.'
          : 'Classificação aprovada por usuário autorizado.',
        metadata: {
          classificationId,
          source: existing.source,
          corrected,
          changes: Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, {
            from: existing[key as keyof typeof existing], to: value,
          }])) as Prisma.InputJsonValue,
        },
      } });
      return classification;
    });
  }

  async history(requestId: string, actor: AuthenticatedUser) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId }, select: { authorId: true } });
    if (!request) throw new NotFoundException('Request not found');
    this.assertCanRead(request.authorId, actor);
    return this.prisma.requestHistory.findMany({ where: { requestId }, orderBy: { createdAt: 'asc' } });
  }

  private assertCanRead(authorId: string, actor: AuthenticatedUser): void {
    if (actor.role === Role.USER && authorId !== actor.sub) throw new ForbiddenException('You cannot access this request');
  }
}
