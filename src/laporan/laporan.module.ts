import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LaporanController } from './laporan.controller';
import { LaporanService } from './laporan.service';
import { Laporan } from './entities/laporan.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Laporan, User]),
    ConfigModule
  ],
  controllers: [LaporanController],
  providers: [LaporanService],
})
export class LaporanModule {}
