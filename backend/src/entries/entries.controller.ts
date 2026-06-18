import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { QueryEntriesDto } from './dto/query-entries.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEntryDto) {
    return this.entries.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryEntriesDto) {
    return this.entries.findAll(user.userId, query);
  }

  // Declared before :id so "calendar" isn't captured as an id param.
  @Get('calendar')
  calendar(@CurrentUser() user: AuthUser, @Query() q: CalendarQueryDto) {
    return this.entries.calendar(user.userId, q.month, q.tz);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entries.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.entries.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entries.remove(user.userId, id);
  }
}
