import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RequestResetDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
