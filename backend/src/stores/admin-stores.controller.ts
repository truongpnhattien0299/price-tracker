import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AdminQueryStoresDto } from './dto/query-stores.dto';
import { MergeStoreDto, RejectStoreDto } from './dto/review-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

// Review queue and global store management (plans/09). Never sees personal stores.
@Controller('admin/stores')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list(@Query() q: AdminQueryStoresDto) {
    return this.stores.adminList(q);
  }

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.stores.adminCreate(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreDto) {
    return this.stores.adminUpdate(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.stores.adminRemove(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.stores.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectStoreDto) {
    return this.stores.reject(id, dto.note);
  }

  @Post(':id/merge')
  @HttpCode(HttpStatus.OK)
  merge(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MergeStoreDto) {
    return this.stores.merge(id, dto.targetId);
  }
}
