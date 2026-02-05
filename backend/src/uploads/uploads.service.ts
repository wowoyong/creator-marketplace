import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class UploadsService {
  private readonly STORAGE_BASE_URL: string;
  private readonly UPLOAD_DIR: string;

  constructor(private config: ConfigService) {
    this.STORAGE_BASE_URL =
      config.get('STORAGE_BASE_URL') || 'http://localhost:4001';
    this.UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads');
  }

  async uploadPortfolio(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const portfolioDir = path.join(this.UPLOAD_DIR, 'portfolio');
    const thumbDir = path.join(this.UPLOAD_DIR, 'portfolio', 'thumb');
    await fs.mkdir(portfolioDir, { recursive: true });
    await fs.mkdir(thumbDir, { recursive: true });

    const baseName = `${Date.now()}-${userId}`;
    const filename = `${baseName}.webp`;
    const thumbFilename = `${baseName}-thumb.webp`;

    // 원본 (최적화)
    await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(portfolioDir, filename));

    // 썸네일 (목록용)
    await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 75 })
      .toFile(path.join(thumbDir, thumbFilename));

    return `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}`;
  }

  async uploadChatFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const chatDir = path.join(this.UPLOAD_DIR, 'chat');
    await fs.mkdir(chatDir, { recursive: true });

    const ext = path.extname(file.originalname) || '';
    const safeName = `${Date.now()}-${userId}${ext}`;
    const filepath = path.join(chatDir, safeName);

    // 이미지면 리사이징
    if (file.mimetype.startsWith('image/')) {
      await sharp(file.buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath.replace(ext, '.webp'));

      return `${this.STORAGE_BASE_URL}/uploads/chat/${safeName.replace(ext, '.webp')}`;
    }

    await fs.writeFile(filepath, file.buffer);
    return `${this.STORAGE_BASE_URL}/uploads/chat/${safeName}`;
  }
}
