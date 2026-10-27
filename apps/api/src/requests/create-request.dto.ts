import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString() @MinLength(4) @MaxLength(160) title!: string;
  @IsString() @MinLength(10) @MaxLength(10000) description!: string;
  @IsUUID() @IsOptional() departmentId?: string;
}
