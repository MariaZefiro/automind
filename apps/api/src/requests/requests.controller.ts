import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CreateClassificationDto } from './create-classification.dto';
import { CreateRequestDto } from './create-request.dto';
import { ReviewClassificationDto } from './review-classification.dto';
import { UpdateRequestDto } from './update-request.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post() create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.create(dto, user);
  }

  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.requests.list(user); }

  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.findOne(id, user);
  }

  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.update(id, dto, user);
  }

  @Post(':id/classify') classifyWithAi(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.classifyWithAi(id, user);
  }

  @Post(':id/classifications')
  @Roles(Role.REVIEWER, Role.ADMIN)
  createClassification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateClassificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.requests.createClassification(id, dto, user); }

  @Post(':id/classifications/:classificationId/review')
  @Roles(Role.REVIEWER, Role.ADMIN)
  reviewClassification(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('classificationId', ParseUUIDPipe) classificationId: string,
    @Body() dto: ReviewClassificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) { return this.requests.reviewClassification(id, classificationId, dto, user); }

  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.history(id, user);
  }
}
