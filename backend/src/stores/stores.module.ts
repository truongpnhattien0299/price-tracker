import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { AdminStoresController } from './admin-stores.controller';
import { AdminGuard } from '../auth/guards/admin.guard';

@Module({
  controllers: [StoresController, AdminStoresController],
  providers: [StoresService, AdminGuard],
  exports: [StoresService],
})
export class StoresModule {}
