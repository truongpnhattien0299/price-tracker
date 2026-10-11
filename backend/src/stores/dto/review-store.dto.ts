import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RejectStoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class MergeStoreDto {
  @IsUUID()
  @IsNotEmpty()
  targetId!: string;
}
