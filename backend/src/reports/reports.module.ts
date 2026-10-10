import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [EntitlementModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
