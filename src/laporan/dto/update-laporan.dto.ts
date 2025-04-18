import { PartialType } from '@nestjs/swagger';
import { CreateLaporanDto } from './create-laporan.dto';

export class UpdateLaporanDto extends PartialType(CreateLaporanDto) {}
