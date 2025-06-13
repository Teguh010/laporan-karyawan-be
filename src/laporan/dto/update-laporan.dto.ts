import { PartialType } from '@nestjs/swagger';
import { CreateLaporanDto } from './create-laporan.dto';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';

const STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'resubmitted',
] as const;

type Status = (typeof STATUSES)[number];

export class UpdateLaporanDto extends PartialType(CreateLaporanDto) {
  @IsString()
  @IsOptional()
  @IsIn(STATUSES)
  status?: Status;

  @IsBoolean()
  @IsOptional()
  emApproved?: boolean;

  @IsBoolean()
  @IsOptional()
  vendorApproved?: boolean;

  @IsNumber()
  @IsOptional()
  resubmissionCount?: number;
}
