import { PartialType } from '@nestjs/swagger';
import { CreateLaporanDto } from './create-laporan.dto';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateLaporanDto extends PartialType(CreateLaporanDto) {
  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  emApproved?: boolean;

  @IsBoolean()
  @IsOptional()
  vendorApproved?: boolean;
}
