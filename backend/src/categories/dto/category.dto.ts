import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  // An emoji (may be several code points); null or "" clears it.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(16)
  icon?: string | null;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
