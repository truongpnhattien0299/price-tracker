import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { PresignDto } from './dto/presign.dto';
import { PhotoUrlsDto } from './dto/photo-urls.dto';
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
    this.uploads.assertOwnKey(user.userId, key);
    return this.uploads.presignGet(key);
  }

  // Batch variant of photo-url. POST because a month of keys can be long.
  @Post('photo-urls')
  @HttpCode(200)
  async photoUrls(@CurrentUser() user: AuthUser, @Body() dto: PhotoUrlsDto) {
    for (const key of dto.keys) this.uploads.assertOwnKey(user.userId, key);
    const urls = await Promise.all(
      dto.keys.map(async (key) => [key, (await this.uploads.presignGet(key)).url] as const),
    );
    return { urls: Object.fromEntries(urls) };
  }

}
