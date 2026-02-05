import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('portfolio')
  @Throttle({ short: { ttl: 1000, limit: 2 }, medium: { ttl: 60000, limit: 20 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPortfolio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    this.validateFile(file);
    const imageUrl = await this.uploadsService.uploadPortfolio(file, user.id);
    return { imageUrl };
  }

  @Post('chat')
  @Throttle({ short: { ttl: 1000, limit: 2 }, medium: { ttl: 60000, limit: 30 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChatFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 10MB 이하여야 합니다');
    }
    const fileUrl = await this.uploadsService.uploadChatFile(file, user.id);
    return { fileUrl };
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 10MB 이하여야 합니다');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        '허용되는 이미지 형식: JPEG, PNG, WebP, GIF',
      );
    }
  }
}
