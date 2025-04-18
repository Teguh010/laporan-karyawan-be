import { IsString, IsNotEmpty } from 'class-validator';

export class CreateLaporanDto {
  @IsString()
  @IsNotEmpty()
  namaBarang: string;

  @IsString()
  @IsNotEmpty()
  nomorBarang: string;

  @IsString()
  @IsNotEmpty()
  noSurat: string;
}