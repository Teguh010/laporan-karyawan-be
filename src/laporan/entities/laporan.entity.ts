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
  requestId: string;

  @Column()
  title: string;

  @Column()
  requestName: string;

  @Column()
  companyCode: string;

  @Column()
  requestObjective: string;

  @Column()
  requestBackground: string;

  @Column()
  poType: string;

  @Column()
  assetType: string;

  @Column()
  totalAmountIdr: number;

  @Column()
  totalAmountOriginalCurrency: number;

  @Column()
  remarks: string;

  @Column()
  assignTo: string;

  @Column()
  requestDate: Date;

  @Column()
  department: string;

  @Column()
  buyer: string;

  @Column()
  deliveryDate: Date;

  @Column()
  currency: string;

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
