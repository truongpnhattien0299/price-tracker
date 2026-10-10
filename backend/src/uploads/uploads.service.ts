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
    this.bucket = this.config.getOrThrow<string>('STORAGE_BUCKET');

    // Any S3-compatible store: Cloudflare R2 in prod, MinIO in local dev.
    // Endpoint + keys are always explicit — R2 has no IAM-role credential chain.
    this.s3 = new S3Client({
      region: this.config.get<string>('STORAGE_REGION') ?? 'auto',
      endpoint: this.config.getOrThrow<string>('STORAGE_ENDPOINT'),
      forcePathStyle:
        this.config.get<string>('STORAGE_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>(
          'STORAGE_SECRET_ACCESS_KEY',
        ),
      },
      // SDK ≥3.729 otherwise signs `x-amz-checksum-crc32` of an EMPTY body into
      // presigned PUT URLs, so R2 rejects the real upload with a checksum mismatch.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  // Presigned PUT — client uploads the image bytes straight to storage (R2).
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
