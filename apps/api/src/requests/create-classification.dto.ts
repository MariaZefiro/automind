import { Priority, RequestCategory } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, Max, MinLength } from 'class-validator';

export class CreateClassificationDto {
  @IsEnum(RequestCategory) category!: RequestCategory;
  @IsEnum(Priority) priority!: Priority;
  @IsString() @MinLength(3) @MaxLength(1000) summary!: string;
  @IsString() @MinLength(3) @MaxLength(2000) suggestedAction!: string;
  @IsUUID() @IsOptional() suggestedDepartmentId?: string;
  @IsNumber() @Min(0) @Max(1) @IsOptional() confidence?: number;
}
