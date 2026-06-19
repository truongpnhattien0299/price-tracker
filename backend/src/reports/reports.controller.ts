import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto, TimeSeriesQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.reports.summary(u.userId, q);
  }

  @Get('by-category')
  byCategory(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.reports.byCategory(u.userId, q);
  }

  @Get('time-series')
  timeSeries(@CurrentUser() u: AuthUser, @Query() q: TimeSeriesQueryDto) {
    return this.reports.timeSeries(u.userId, q);
  }

  @Get('top-stores')
  topStores(@CurrentUser() u: AuthUser, @Query() q: ReportQueryDto) {
    return this.reports.topStores(u.userId, q);
  }
}
