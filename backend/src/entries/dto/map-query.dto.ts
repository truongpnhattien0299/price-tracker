import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsUUID } from 'class-validator';

// GET /entries/map filters (plans/08). No pagination: the map clusters every point client-side.
export class MapQueryDto {
  @IsOptional()
  @IsUUID()
  category?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
