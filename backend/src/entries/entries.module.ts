import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule, EntitlementModule],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
