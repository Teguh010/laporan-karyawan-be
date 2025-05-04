import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Laporan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  namaBarang: string;

  @Column()
  nomorBarang: string;

  @Column()
  noSurat: string;

  @Column('json')
  needApproveFiles: {
    name: string;
    path: string;
  }[];

  @Column('json')
  noNeedApproveFiles: {
    name: string;
    path: string;
  }[];

  @Column({ default: 'entry' })
  status: string;

  @Column({ default: false })
  emApproved: boolean;

  @Column({ default: false })
  vendorApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
