import { PartialType } from '@nestjs/mapped-types';
import { CreateEntryDto } from './create-entry.dto';

// All fields optional for PATCH.
export class UpdateEntryDto extends PartialType(CreateEntryDto) {}
