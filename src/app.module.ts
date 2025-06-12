import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LaporanModule } from './laporan/laporan.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppDataSource } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(AppDataSource),
    LaporanModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
