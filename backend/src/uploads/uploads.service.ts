import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PresignDto } from './dto/presign.dto';

const PUT_EXPIRES = 300; // 5 min (DESIGN.md §7)
const GET_EXPIRES = 300;

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.s3 = new S3Client({
      region: this.config.get<string>('AWS_REGION') ?? 'ap-southeast-1',
      // Set for MinIO/local dev; omitted in prod (real S3 on EC2 uses IAM role).
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle:
        this.config.get<string>('AWS_S3_FORCE_PATH_STYLE') === 'true',
      // Explicit creds only when provided; otherwise SDK default chain (IAM role).
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  // Presigned PUT — client uploads the image bytes straight to S3.
  async presignUpload(userId: string, dto: PresignDto) {
    const photoKey = `entries/${userId}/${randomUUID()}.${dto.ext}`;
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: photoKey,
        ContentType: dto.contentType,
      }),
      { expiresIn: PUT_EXPIRES },
    );
    return { uploadUrl, photoKey };
  }

  // Presigned GET — short-lived URL to view a photo.
  async presignGet(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: GET_EXPIRES },
    );
    return { url };
  }

  // Best-effort delete used when an entry is removed (Phase 2 TODO).
  async deleteObject(key: string) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
