import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LaporanStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMITTED = 'resubmitted',
  ENTRY = 'entry'
}

export interface FileData {
  name: string;
  path: string;
  size: number;
  mimetype: string;
  originalname: string;
  filename: string;
  fieldname: string;
  encoding: string;
  destination: string;
}

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

  @Column({ type: 'json', nullable: true })
  needApproveFiles: FileData[] = [];

  @Column({ type: 'json', nullable: true })
  noNeedApproveFiles: FileData[] = [];

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



  @Column({ 
    type: 'enum',
    enum: LaporanStatus,
    default: LaporanStatus.ENTRY 
  })
  status: LaporanStatus;

  @Column({ default: false })
  emApproved: boolean;

  @Column({ default: false })
  vendorApproved: boolean;

  @Column({ default: false })
  userApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rejectedBy: string | null;

  @Column({ name: 'resubmission_count', type: 'integer', default: 0 })
  resubmissionCount: number;
}
