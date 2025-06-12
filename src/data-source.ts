import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['./src/**/entities/*.entity{.ts,.js}'],
  migrations: ['./src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  ssl: false,
  extra: {
    trustServerCertificate: true,
  },
});
