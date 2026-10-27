import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.department.findMany({ orderBy: { name: 'asc' } }); }
  async create(name: string) {
    try { return await this.prisma.department.create({ data: { name } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Department already exists');
      throw error;
    }
  }

  async update(id: string, name: string) {
    if (!await this.prisma.department.findUnique({ where: { id }, select: { id: true } })) {
      throw new NotFoundException('Department not found');
    }
    try { return await this.prisma.department.update({ where: { id }, data: { name } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Department already exists');
      throw error;
    }
  }
}
