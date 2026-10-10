import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [EntitlementModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
