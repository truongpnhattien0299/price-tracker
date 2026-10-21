import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsOptional,
  Matches,
} from 'class-validator';

const UUID_OR_NONE =
  /^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class ReportQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class TimeSeriesQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsIn(['day', 'month', 'year'])
  groupBy: 'day' | 'month' | 'year' = 'month';

  // IANA tz for local-day bucketing (same pattern as calendar endpoint).
  @IsOptional()
  tz: string = 'Asia/Ho_Chi_Minh';
}

export class CategorySeriesQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsIn(['month', 'year'])
  groupBy: 'month' | 'year' = 'month';

  @IsOptional()
  tz: string = 'Asia/Ho_Chi_Minh';

  // Comma-separated category ids; `none` = entries without a category.
  // Omitted = every category.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').map((v) => v.trim()).filter(Boolean)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(UUID_OR_NONE, { each: true })
  categoryIds?: string[];
}
