import { IsIn, IsString } from 'class-validator';

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

export class PresignDto {
  @IsString()
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: string;

  @IsString()
  @IsIn(ALLOWED_EXTS)
  ext!: string;
}
