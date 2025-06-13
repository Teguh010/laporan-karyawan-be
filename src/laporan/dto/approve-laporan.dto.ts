import { IsIn } from 'class-validator';

export class ApproveLaporanDto {
  @IsIn(['emApproved', 'userApproved'], {
    message: 'Role must be either emApproved or userApproved',
  })
  role: 'emApproved' | 'userApproved';
}
