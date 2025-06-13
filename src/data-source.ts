import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  username: process.env.DB_USERNAME || 'teguhbadrusalam',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'laporan_karyawan',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Disable synchronize when using migrations
  ssl: false,
  extra: {
    trustServerCertificate: true,
  },
  migrationsRun: true, // Automatically run migrations on application start
});
