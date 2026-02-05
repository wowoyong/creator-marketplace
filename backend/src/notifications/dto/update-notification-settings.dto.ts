import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  enableEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePush?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnTransaction?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnReview?: boolean;
}
