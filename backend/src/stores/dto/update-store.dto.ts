import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreDto } from './create-store.dto';

// latitude/longitude still travel together (checked in the service).
export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
