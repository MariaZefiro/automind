import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @MinLength(12) @MaxLength(128) @IsOptional() password?: string;
  @IsEnum(Role) @IsOptional() role?: Role;
  @IsUUID() @IsOptional() departmentId?: string | null;
}