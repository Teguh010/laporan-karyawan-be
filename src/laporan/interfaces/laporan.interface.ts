import { User } from '../../users/entities/user.entity';

export interface FileObject {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

export interface LaporanInterface {
  id: string;
  title: string;
  description: string;
  status: string;
  needApproveFiles: FileObject[];
  noNeedApproveFiles: FileObject[];
  assignTo: string | null;
  assignedTo: User | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  emApproved?: boolean;
  vendorApproved?: boolean;
  userApproved?: boolean;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectReason?: string | null;
  resubmissionCount?: number;
}

export type Laporan = LaporanInterface;
