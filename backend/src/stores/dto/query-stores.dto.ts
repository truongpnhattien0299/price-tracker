import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// GET /stores: what the entry form's store picker shows (plans/09 S9).
export class QueryStoresDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  // Sort by distance from here when both are given.
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

// GET /admin/stores. Personal stores are private and never listed here (S3).
export class AdminQueryStoresDto {
  @IsIn(['pending', 'global'])
  status!: 'pending' | 'global';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
