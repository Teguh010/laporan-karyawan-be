import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../auth/enums/role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}