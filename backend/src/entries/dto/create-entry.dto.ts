import { Type } from 'class-transformer';
import {
  IsDate,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productName?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  photoKey?: string;

  @IsOptional()
  @IsString()
  blurhash?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  // Picking a store fills storeName/address/latitude/longitude from it,
  // overriding whatever was sent for those (plans/09 S6–S7).
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // Real purchase time; defaults to now in the service if omitted.
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchasedAt?: Date;
}
