import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreDto } from './create-store.dto';

// latitude/longitude still travel together, and must match the kind (checked in the service).
export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
