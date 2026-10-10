import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';

// POST /uploads/photo-urls — one call for a whole calendar month / day grid
// instead of one presigned GET per photo (rate limit is per IP).
export class PhotoUrlsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  keys!: string[];
}
