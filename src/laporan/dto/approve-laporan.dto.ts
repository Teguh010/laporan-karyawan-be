import { IsEnum } from 'class-validator';

export enum ApprovalRole {
  EM = 'EM',
  USER = 'USER',
  VENDOR = 'VENDOR',
}

export class ApproveLaporanDto {
  @IsEnum(ApprovalRole)
  role: ApprovalRole;
}
