import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  const config = app.get(ConfigService);
  
  // 정적 파일 제공
  app.useStaticAssets(path.join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  
  // CORS
  app.enableCors({
    origin: config.get('FRONTEND_URL'),
    credentials: true,
  });
  
  const port = config.get('PORT') || 3001;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
