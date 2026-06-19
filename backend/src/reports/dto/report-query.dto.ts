import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

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
