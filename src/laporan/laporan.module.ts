import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LaporanController } from './laporan.controller';
import { LaporanService } from './laporan.service';
import { Laporan } from './entities/laporan.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Laporan, User]),
    ConfigModule,
    UsersModule,
  ],
  controllers: [LaporanController],
  providers: [LaporanService],
})
export class LaporanModule {}
