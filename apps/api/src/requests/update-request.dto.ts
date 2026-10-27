import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateRequestDto {
  @IsString() @MinLength(4) @MaxLength(160) @IsOptional() title?: string;
  @IsString() @MinLength(10) @MaxLength(10000) @IsOptional() description?: string;
  @IsUUID() @IsOptional() departmentId?: string | null;
  @IsEnum(RequestStatus) @IsOptional() status?: RequestStatus;
}