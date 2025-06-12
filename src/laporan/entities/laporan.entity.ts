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

  @Column({ type: 'varchar', nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestName: string | null;

  @Column({ type: 'varchar', nullable: true })
  companyCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestObjective: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestBackground: string | null;

  @Column({ type: 'varchar', nullable: true })
  poType: string | null;

  @Column({ type: 'varchar', nullable: true })
  assetType: string | null;

  @Column({ type: 'integer', nullable: true })
  totalAmountIdr: number | null;

  @Column({ type: 'integer', nullable: true })
  totalAmountOriginalCurrency: number | null;

  @Column({ type: 'varchar', nullable: true })
  remarks: string | null;

  @Column({ type: 'varchar', nullable: true })
  assignTo: string | null;

  @Column({ type: 'timestamp', nullable: true })
  requestDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  buyer: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveryDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  currency: string | null;

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
