import { Priority, RequestCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ReviewClassificationDto {
  @IsEnum(RequestCategory) @IsOptional() category?: RequestCategory;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsString() @MinLength(3) @MaxLength(1000) @IsOptional() summary?: string;
  @IsString() @MinLength(3) @MaxLength(2000) @IsOptional() suggestedAction?: string;
  @IsUUID() @IsOptional() suggestedDepartmentId?: string | null;
}
