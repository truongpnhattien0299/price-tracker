import { IsOptional, IsString, Matches } from 'class-validator';

// GET /entries/calendar?month=YYYY-MM&tz=Area/City
export class CalendarQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM' })
  month!: string;

  // IANA timezone for local-day grouping (DESIGN.md §4.2). Defaults to VN.
  @IsOptional()
  @IsString()
  tz: string = 'Asia/Ho_Chi_Minh';
}
