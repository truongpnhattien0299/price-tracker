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
import { QueryStoresDto } from './dto/query-stores.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

// User-created stores (plans/09). Global + own are visible; own non-global are editable.
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  search(@CurrentUser() user: AuthUser, @Query() q: QueryStoresDto) {
    return this.stores.search(user.userId, q);
  }

  // Declared before :id so "mine" isn't captured as an id param.
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.stores.mine(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.stores.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreDto) {
    return this.stores.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.stores.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.stores.remove(user.userId, id);
  }

  @Post(':id/propose')
  @HttpCode(HttpStatus.OK)
  propose(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.stores.propose(user.userId, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.stores.withdraw(user.userId, id);
  }
}
