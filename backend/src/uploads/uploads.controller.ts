import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/strategies/jwt.strategy';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  presign(@CurrentUser() user: AuthUser, @Body() dto: PresignDto) {
    return this.uploads.presignUpload(user.userId, dto);
  }

  @Get('photo-url')
  photoUrl(@CurrentUser() user: AuthUser, @Query('key') key?: string) {
    if (!key) throw new BadRequestException('key is required');
    // Only allow access to the caller's own objects.
    if (!key.startsWith(`entries/${user.userId}/`)) {
      throw new ForbiddenException('Not allowed to access this object');
    }
    return this.uploads.presignGet(key);
  }
}
