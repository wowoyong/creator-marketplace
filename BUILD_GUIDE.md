# 크리에이터 마켓플레이스 - AI 개발 가이드

> 이 문서는 Claude/OpenCode AI 에이전트가 프로젝트를 단계별로 구축할 수 있도록 작성되었습니다.
> 각 단계는 독립적으로 실행 가능하며, 완료 기준이 명확하게 정의되어 있습니다.

---

## 📋 사전 준비 사항

### 환경 정보
- **서버**: Mac Mini (Tailscale SSH: `mac-mini-ts`)
- **User**: jojaeyong
- **프로젝트 경로**: `~/WebstormProjects/creator-marketplace`
- **문서 위치**: 
  - REQUIREMENTS.md
  - ARCHITECTURE.md
  - IMPLEMENTATION_PLAN.md

### 필수 소프트웨어 확인

```bash
# Mac Mini에 SSH 접속
ssh mac-mini-ts

# 버전 확인
node --version    # v18+ 필요
npm --version     # v9+ 필요
psql --version    # PostgreSQL 확인
git --version     # Git 확인

# 없으면 설치
brew install node postgresql git
```

---

## 🎯 개발 원칙 (AI 에이전트 필독)

### 1. 단계별 검증
- 각 단계 완료 후 **반드시** 동작 확인
- 다음 단계로 넘어가기 전 체크리스트 완료
- 에러 발생 시 즉시 보고 및 해결

### 2. 파일 작성 규칙
- 전체 파일 내용을 작성 (부분 작성 금지)
- TypeScript strict mode 사용
- ESLint/Prettier 규칙 준수
- 주석은 한글로 작성

### 3. 커밋 규칙
- 각 단계 완료 시 Git commit
- 커밋 메시지 형식: `feat: [단계명] 설명`
- 예: `feat: Phase1-1 프로젝트 초기 설정 완료`

### 4. 에러 처리
- 에러 발생 시 로그 전체 복사
- 해결 방법 시도 전 사용자에게 보고
- 해결 후 재검증

---

## 📦 Phase 1: 기반 구축 (Week 1-8)

---

## Week 1-2: 프로젝트 초기 설정

### Step 1.1: Git 저장소 초기화

**작업 내용:**
```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace

# Git 초기화
git init
git add *.md
git commit -m "docs: Initial project documentation"

# .gitignore 생성
cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
.pnpm-store/

# Environment variables
.env
.env.local
.env.production
.env.development

# Build outputs
dist/
.next/
out/

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Uploads (for development)
uploads/

# Database
*.db
*.sqlite

# Prisma
prisma/migrations/
GITIGNORE

git add .gitignore
git commit -m "chore: Add .gitignore"

echo "✅ Step 1.1 완료: Git 저장소 초기화"
EOF
```

**검증 방법:**
```bash
ssh mac-mini-ts "cd ~/WebstormProjects/creator-marketplace && git log --oneline"
# 출력: 2개의 커밋이 보여야 함
```

**완료 기준:**
- [ ] Git 저장소 초기화됨
- [ ] .gitignore 생성됨
- [ ] 2개의 커밋 존재

---

### Step 1.2: 백엔드 프로젝트 생성 (NestJS)

**작업 내용:**
```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace

# NestJS 프로젝트 생성
npx @nestjs/cli new backend --package-manager npm --skip-git

cd backend

# 필수 패키지 설치
npm install @prisma/client prisma
npm install @nestjs/passport passport passport-jwt passport-kakao
npm install @nestjs/jwt @nestjs/config
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install class-validator class-transformer
npm install bcrypt
npm install sharp  # 이미지 처리

# Dev dependencies
npm install --save-dev @types/passport-jwt @types/passport-kakao @types/bcrypt

echo "✅ Step 1.2 완료: 백엔드 프로젝트 생성"
EOF
```

**검증 방법:**
```bash
ssh mac-mini-ts "cd ~/WebstormProjects/creator-marketplace/backend && npm run start:dev"
# 서버가 실행되고 "Nest application successfully started" 메시지가 보여야 함
# Ctrl+C로 종료
```

**완료 기준:**
- [ ] backend 폴더 생성됨
- [ ] package.json에 모든 의존성 설치됨
- [ ] `npm run start:dev` 명령어로 서버 실행 가능

---

### Step 1.3: Prisma 설정

**작업 내용:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# Prisma 초기화
npx prisma init

echo "✅ Step 1.3-1 완료: Prisma 초기화"
EOF
```

이제 **ARCHITECTURE.md**의 Prisma Schema를 `backend/prisma/schema.prisma`에 작성하세요.

**schema.prisma 전체 내용:**

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User & Profile
// ============================================

enum UserRole {
  ARTIST
  CLIENT
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

model User {
  id            String      @id @default(cuid())
  email         String      @unique
  kakaoId       String      @unique
  nickname      String
  profileImage  String?
  role          UserRole
  status        UserStatus  @default(ACTIVE)
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  lastLoginAt   DateTime?
  
  // Relations
  artistProfile     ArtistProfile?
  clientProfile     ClientProfile?
  sentMessages      Message[]         @relation("SentMessages")
  chatRooms         ChatRoomMember[]
  sentTransactions  Transaction[]     @relation("ClientTransactions")
  receivedTransactions Transaction[]  @relation("ArtistTransactions")
  givenReviews      Review[]          @relation("ReviewAuthor")
  receivedReviews   Review[]          @relation("ReviewTarget")
  notifications     Notification[]
  pushSubscriptions PushSubscription[]
  
  @@index([kakaoId])
  @@index([role, status])
  @@map("users")
}

model ArtistProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  bio             String?   @db.Text
  specialties     String[]
  priceRange      String?
  
  totalTransactions Int     @default(0)
  averageRating     Float?
  responseRate      Float?
  
  portfolios        Portfolio[]
  referenceUrls     String[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("artist_profiles")
}

model ClientProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  preferredGenres String[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("client_profiles")
}

// ============================================
// Portfolio
// ============================================

model Portfolio {
  id              String        @id @default(cuid())
  artistProfileId String
  artistProfile   ArtistProfile @relation(fields: [artistProfileId], references: [id], onDelete: Cascade)
  
  imageUrl        String
  title           String?
  description     String?       @db.Text
  displayOrder    Int           @default(0)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([artistProfileId, displayOrder])
  @@map("portfolios")
}

// ============================================
// Chat System
// ============================================

enum ChatRoomStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

model ChatRoom {
  id          String          @id @default(cuid())
  status      ChatRoomStatus  @default(ACTIVE)
  
  members     ChatRoomMember[]
  messages    Message[]
  transaction Transaction?
  
  lastMessageAt DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  @@map("chat_rooms")
}

model ChatRoomMember {
  id          String    @id @default(cuid())
  chatRoomId  String
  chatRoom    ChatRoom  @relation(fields: [chatRoomId], references: [id], onDelete: Cascade)
  
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  lastReadAt  DateTime?
  joinedAt    DateTime  @default(now())
  
  @@unique([chatRoomId, userId])
  @@index([userId])
  @@map("chat_room_members")
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

model Message {
  id          String      @id @default(cuid())
  chatRoomId  String
  chatRoom    ChatRoom    @relation(fields: [chatRoomId], references: [id], onDelete: Cascade)
  
  senderId    String
  sender      User        @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  
  type        MessageType @default(TEXT)
  content     String      @db.Text
  fileUrl     String?
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([chatRoomId, createdAt])
  @@index([senderId])
  @@map("messages")
}

// ============================================
// Transaction Management
// ============================================

enum TransactionStatus {
  REQUESTED
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  REVIEWED
  CANCELLED
}

enum PaymentMethod {
  EXTERNAL
  TOSS_PAYMENTS
  BANK_TRANSFER
}

enum EscrowStatus {
  NONE
  PENDING
  DEPOSITED
  RELEASED
  REFUNDED
}

model Transaction {
  id              String            @id @default(cuid())
  
  clientId        String
  client          User              @relation("ClientTransactions", fields: [clientId], references: [id])
  
  artistId        String
  artist          User              @relation("ArtistTransactions", fields: [artistId], references: [id])
  
  chatRoomId      String            @unique
  chatRoom        ChatRoom          @relation(fields: [chatRoomId], references: [id])
  
  title           String
  description     String            @db.Text
  agreedPrice     Int?
  status          TransactionStatus @default(REQUESTED)
  
  paymentMethod   PaymentMethod     @default(EXTERNAL)
  escrowStatus    EscrowStatus      @default(NONE)
  pgTransactionId String?
  paidAt          DateTime?
  
  requestedAt     DateTime          @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  
  reviews         Review[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@index([clientId, status])
  @@index([artistId, status])
  @@index([status])
  @@map("transactions")
}

// ============================================
// Review System
// ============================================

enum ReviewType {
  CLIENT_TO_ARTIST
  ARTIST_TO_CLIENT
}

model Review {
  id            String      @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  type          ReviewType
  
  authorId      String
  author        User        @relation("ReviewAuthor", fields: [authorId], references: [id])
  
  targetId      String
  target        User        @relation("ReviewTarget", fields: [targetId], references: [id])
  
  rating        Int
  content       String?     @db.Text
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@unique([transactionId, type])
  @@index([targetId, rating])
  @@map("reviews")
}

// ============================================
// Notification System
// ============================================

enum NotificationType {
  CHAT_MESSAGE
  TRANSACTION_REQUEST
  TRANSACTION_ACCEPT
  TRANSACTION_COMPLETE
  REVIEW_RECEIVED
  SYSTEM
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
}

model Notification {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type        NotificationType
  title       String
  content     String            @db.Text
  
  metadata    Json?
  
  isRead      Boolean           @default(false)
  readAt      DateTime?
  
  sentChannels NotificationChannel[]
  
  createdAt   DateTime          @default(now())
  
  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

model NotificationSettings {
  id        String   @id @default(cuid())
  userId    String   @unique
  
  enableInApp   Boolean @default(true)
  enableEmail   Boolean @default(true)
  enablePush    Boolean @default(true)
  
  notifyOnMessage     Boolean @default(true)
  notifyOnTransaction Boolean @default(true)
  notifyOnReview      Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("notification_settings")
}

model PushSubscription {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  endpoint    String   @unique
  keys        Json
  
  userAgent   String?
  
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())
  
  @@index([userId])
  @@map("push_subscriptions")
}
```

**환경 변수 설정:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# .env 파일 생성
cat > .env << 'ENVFILE'
# Database
DATABASE_URL="postgresql://jojaeyong@localhost:5432/creator_marketplace?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1h"

# Kakao OAuth
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CALLBACK_URL="http://localhost:3001/api/auth/kakao/callback"

# Server
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Storage
STORAGE_BASE_URL="http://localhost:3001"

# VAPID (Web Push) - 나중에 생성
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL=""

# SMTP (이메일 알림) - 나중에 설정
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
ENVFILE

echo "✅ Step 1.3-2 완료: .env 파일 생성"
EOF
```

**PostgreSQL 데이터베이스 생성 및 마이그레이션:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# 데이터베이스 생성
createdb creator_marketplace

# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

echo "✅ Step 1.3-3 완료: 데이터베이스 및 마이그레이션"
EOF
```

**검증 방법:**
```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# 데이터베이스 연결 확인
npx prisma db push --skip-generate

# 테이블 확인
psql creator_marketplace -c "\dt"
EOF
```

**완료 기준:**
- [ ] schema.prisma 파일 생성됨
- [ ] .env 파일 생성됨
- [ ] 데이터베이스 생성됨
- [ ] 마이그레이션 성공
- [ ] 모든 테이블이 생성됨 (users, artist_profiles, portfolios, chat_rooms, etc.)

---

### Step 1.4: NestJS 기본 모듈 구조 생성

**PrismaModule 생성:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# Prisma 모듈 생성
mkdir -p src/common/prisma
EOF
```

**파일 작성: `src/common/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**파일 작성: `src/common/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Database disconnected');
  }
}
```

**AppModule에 PrismaModule 추가:**

파일 수정: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**검증 방법:**
```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend
npm run start:dev
# "Database connected" 메시지 확인
# Ctrl+C로 종료
EOF
```

**완료 기준:**
- [ ] PrismaModule, PrismaService 생성됨
- [ ] AppModule에 import됨
- [ ] 서버 실행 시 "Database connected" 출력

---

### Step 1.5: Git Commit (Phase 1-1 완료)

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace

git add .
git commit -m "feat: Phase1-1 프로젝트 초기 설정 완료

- NestJS 백엔드 프로젝트 생성
- Prisma 설정 및 스키마 작성
- PostgreSQL 데이터베이스 생성
- PrismaModule 생성 및 연결 확인"

echo "✅ Phase 1-1 완료 및 커밋"
EOF
```

---

## Week 3-4: 인증 시스템 구현

### Step 2.1: Auth 모듈 생성

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

# 모듈 생성
nest g module auth
nest g controller auth
nest g service auth

# Users 모듈 생성
nest g module users
nest g controller users
nest g service users

echo "✅ Step 2.1 완료: Auth, Users 모듈 생성"
EOF
```

**검증:**
- [ ] src/auth 폴더 생성됨
- [ ] src/users 폴더 생성됨
- [ ] AppModule에 자동으로 import됨

---

### Step 2.2: JWT 전략 구현

**파일 작성: `src/auth/strategies/jwt.strategy.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('인증 실패');
    }

    return user;
  }
}
```

**파일 작성: `src/auth/strategies/kakao.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get('KAKAO_CLIENT_ID'),
      callbackURL: config.get('KAKAO_CALLBACK_URL'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { _json } = profile;
    return {
      kakaoId: profile.id,
      email: _json.kakao_account?.email,
      nickname: profile.displayName,
      profileImage: _json.properties?.profile_image,
    };
  }
}
```

**파일 작성: `src/auth/guards/jwt-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**파일 작성: `src/auth/guards/kakao-auth.guard.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {}
```

**파일 작성: `src/auth/decorators/current-user.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

### Step 2.3: Auth Service 구현

**파일 작성: `src/auth/auth.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async kakaoLogin(kakaoUser: any) {
    // User 찾기 또는 생성
    let user = await this.prisma.user.findUnique({
      where: { kakaoId: String(kakaoUser.kakaoId) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kakaoId: String(kakaoUser.kakaoId),
          email: kakaoUser.email,
          nickname: kakaoUser.nickname,
          profileImage: kakaoUser.profileImage,
          role: 'CLIENT', // 기본값
        },
      });
    }

    // 마지막 로그인 시간 업데이트
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // JWT 발급
    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user,
    };
  }

  async validateUser(userId: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: true,
        clientProfile: true,
      },
    });
  }
}
```

---

### Step 2.4: Auth Controller 구현

**파일 작성: `src/auth/auth.controller.ts`**

```typescript
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  async kakaoAuth() {
    // Kakao OAuth로 리다이렉트
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.kakaoLogin(req.user);
    
    // 프론트엔드로 리다이렉트 (토큰 전달)
    const frontendUrl = this.config.get('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${result.access_token}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: User) {
    return this.authService.validateUser(user.id);
  }
}
```

---

### Step 2.5: Auth Module 설정

**파일 수정: `src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, KakaoStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

### Step 2.6: Users Service 구현

**파일 작성: `src/users/dto/update-role.dto.ts`**

```typescript
import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
```

**파일 작성: `src/users/users.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: {
          include: {
            portfolios: true,
          },
        },
        clientProfile: true,
      },
    });
  }
}
```

**파일 작성: `src/users/users.controller.ts`**

```typescript
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me/role')
  async updateRole(@CurrentUser() user: User, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(user.id, dto.role);
  }
}
```

---

### Step 2.7: main.ts CORS 설정

**파일 수정: `src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = app.get(ConfigService);
  
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
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
```

---

### Step 2.8: 테스트 및 검증

**서버 실행:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend
npm run start:dev
EOF
```

**API 테스트:**

```bash
# 다른 터미널에서
ssh mac-mini-ts

# Health check
curl http://localhost:3001/api

# 출력: "Hello World!" (AppController의 기본 응답)
```

**완료 기준:**
- [ ] 서버가 정상적으로 실행됨
- [ ] /api 엔드포인트 접근 가능
- [ ] 콘솔에 에러 없음

---

### Step 2.9: Git Commit (Phase 1-2 완료)

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace

git add .
git commit -m "feat: Phase1-2 인증 시스템 구현

- JWT 인증 전략 구현
- Kakao OAuth 전략 구현
- Auth 모듈 및 서비스 구현
- Users 모듈 및 서비스 구현
- CORS 설정 및 Validation 파이프 추가"

echo "✅ Phase 1-2 완료 및 커밋"
EOF
```

---

## Week 5-6: 작가 프로필 & 포트폴리오

### Step 3.1: Artists 모듈 생성

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend

nest g module artists
nest g controller artists
nest g service artists

nest g module portfolios
nest g controller portfolios
nest g service portfolios

nest g module uploads
nest g controller uploads
nest g service uploads

echo "✅ Step 3.1 완료: Artists, Portfolios, Uploads 모듈 생성"
EOF
```

---

### Step 3.2: DTO 파일 생성

**파일 작성: `src/artists/dto/create-artist-profile.dto.ts`**

```typescript
import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateArtistProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @IsOptional()
  @IsString()
  priceRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceUrls?: string[];
}
```

**파일 작성: `src/artists/dto/update-artist-profile.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateArtistProfileDto } from './create-artist-profile.dto';

export class UpdateArtistProfileDto extends PartialType(CreateArtistProfileDto) {}
```

**파일 작성: `src/artists/dto/get-artists.dto.ts`**

```typescript
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetArtistsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  take?: number = 20;
}
```

---

### Step 3.3: Artists Service 구현

**파일 작성: `src/artists/artists.service.ts`**

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArtistProfileDto } from './dto/create-artist-profile.dto';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';
import { GetArtistsDto } from './dto/get-artists.dto';

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateArtistProfileDto) {
    // 이미 프로필이 있는지 확인
    const existing = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('이미 작가 프로필이 존재합니다');
    }

    return this.prisma.artistProfile.create({
      data: {
        userId,
        bio: dto.bio,
        specialties: dto.specialties,
        priceRange: dto.priceRange,
        referenceUrls: dto.referenceUrls || [],
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateArtistProfileDto) {
    return this.prisma.artistProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
        portfolios: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('작가 프로필을 찾을 수 없습니다');
    }

    return profile;
  }

  async findAll(query: GetArtistsDto) {
    const { search, skip = 0, take = 20 } = query;

    return this.prisma.user.findMany({
      where: {
        role: 'ARTIST',
        status: 'ACTIVE',
        ...(search && {
          OR: [
            { nickname: { contains: search, mode: 'insensitive' } },
            { artistProfile: { bio: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        artistProfile: {
          include: {
            portfolios: {
              take: 5,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        receivedReviews: {
          where: { type: 'CLIENT_TO_ARTIST' },
          select: { rating: true },
          take: 10,
        },
      },
      skip,
      take,
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: {
          include: {
            portfolios: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        receivedReviews: {
          where: { type: 'CLIENT_TO_ARTIST' },
          include: {
            author: {
              select: {
                nickname: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user || user.role !== 'ARTIST') {
      throw new NotFoundException('작가를 찾을 수 없습니다');
    }

    return user;
  }
}
```

---

### Step 3.4: Artists Controller 구현

**파일 작성: `src/artists/artists.controller.ts`**

```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreateArtistProfileDto } from './dto/create-artist-profile.dto';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';
import { GetArtistsDto } from './dto/get-artists.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private artistsService: ArtistsService) {}

  @Get()
  async findAll(@Query() query: GetArtistsDto) {
    return this.artistsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async createProfile(@CurrentUser() user: User, @Body() dto: CreateArtistProfileDto) {
    return this.artistsService.createProfile(user.id, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateArtistProfileDto) {
    return this.artistsService.updateProfile(user.id, dto);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.artistsService.getProfile(user.id);
  }
}
```

---

### Step 3.5: Uploads Service 구현 (이미지 업로드)

**Sharp 패키지 설치 확인:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend
npm list sharp
# 이미 설치되어 있어야 함
EOF
```

**파일 작성: `src/uploads/uploads.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class UploadsService {
  private readonly STORAGE_BASE_URL: string;
  private readonly UPLOAD_DIR: string;

  constructor(private config: ConfigService) {
    this.STORAGE_BASE_URL = config.get('STORAGE_BASE_URL') || 'http://localhost:3001';
    this.UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads');
  }

  async uploadPortfolio(file: Express.Multer.File, userId: string): Promise<string> {
    // 디렉토리 생성
    const portfolioDir = path.join(this.UPLOAD_DIR, 'portfolio');
    await fs.mkdir(portfolioDir, { recursive: true });

    // 파일명 생성
    const filename = `${Date.now()}-${userId}.webp`;
    const filepath = path.join(portfolioDir, filename);

    // 이미지 최적화
    await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    // 전체 URL 반환
    return `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}`;
  }

  async uploadChatFile(file: Express.Multer.File, userId: string): Promise<string> {
    const chatDir = path.join(this.UPLOAD_DIR, 'chat');
    await fs.mkdir(chatDir, { recursive: true });

    const filename = `${Date.now()}-${userId}-${file.originalname}`;
    const filepath = path.join(chatDir, filename);

    await fs.writeFile(filepath, file.buffer);

    return `${this.STORAGE_BASE_URL}/uploads/chat/${filename}`;
  }
}
```

**파일 작성: `src/uploads/uploads.controller.ts`**

```typescript
import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('portfolio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPortfolio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const imageUrl = await this.uploadsService.uploadPortfolio(file, user.id);
    return { imageUrl };
  }

  @Post('chat')
  @UseInterceptors(FileInterceptor('file'))
  async uploadChatFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const fileUrl = await this.uploadsService.uploadChatFile(file, user.id);
    return { fileUrl };
  }
}
```

**Multer 설정 추가:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend
npm install @nestjs/platform-express multer
npm install --save-dev @types/multer
EOF
```

---

### Step 3.6: Portfolios Service 구현

**파일 작성: `src/portfolios/dto/create-portfolio.dto.ts`**

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
```

**파일 작성: `src/portfolios/portfolios.service.ts`**

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePortfolioDto) {
    // 작가 프로필 확인
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (!artistProfile) {
      throw new BadRequestException('작가 프로필이 없습니다');
    }

    // 현재 포트폴리오 개수 확인 (최대 20개)
    const count = await this.prisma.portfolio.count({
      where: { artistProfileId: artistProfile.id },
    });

    if (count >= 20) {
      throw new BadRequestException('포트폴리오는 최대 20개까지 등록할 수 있습니다');
    }

    return this.prisma.portfolio.create({
      data: {
        artistProfileId: artistProfile.id,
        imageUrl: dto.imageUrl,
        title: dto.title,
        description: dto.description,
        displayOrder: count,
      },
    });
  }

  async findByArtist(artistProfileId: string) {
    return this.prisma.portfolio.findMany({
      where: { artistProfileId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async delete(userId: string, portfolioId: string) {
    // 작가 프로필 확인
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (!artistProfile) {
      throw new NotFoundException('작가 프로필을 찾을 수 없습니다');
    }

    // 포트폴리오 삭제
    return this.prisma.portfolio.delete({
      where: {
        id: portfolioId,
        artistProfileId: artistProfile.id,
      },
    });
  }
}
```

**파일 작성: `src/portfolios/portfolios.controller.ts`**

```typescript
import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Controller('portfolios')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  constructor(private portfoliosService: PortfoliosService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreatePortfolioDto) {
    return this.portfoliosService.create(user.id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.portfoliosService.delete(user.id, id);
  }
}
```

---

### Step 3.7: 정적 파일 제공 설정

**파일 수정: `src/main.ts`**

```typescript
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
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
```

---

### Step 3.8: 업로드 디렉토리 생성

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace
mkdir -p uploads/portfolio uploads/chat
chmod 755 uploads
echo "✅ 업로드 디렉토리 생성 완료"
EOF
```

---

### Step 3.9: 테스트

**서버 재시작:**

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace/backend
npm run start:dev
EOF
```

**API 테스트 (curl):**

```bash
ssh mac-mini-ts

# 작가 목록 조회
curl http://localhost:3001/api/artists

# 작가 검색
curl "http://localhost:3001/api/artists?search=test"
```

**완료 기준:**
- [ ] Artists API 동작
- [ ] Portfolios API 동작
- [ ] Uploads API 동작
- [ ] 정적 파일 제공 동작 (/uploads/... 접근 가능)

---

### Step 3.10: Git Commit

```bash
ssh mac-mini-ts << 'EOF'
cd ~/WebstormProjects/creator-marketplace

git add .
git commit -m "feat: Phase1-3 작가 프로필 및 포트폴리오 구현

- Artists 모듈 및 서비스 구현
- Portfolios 모듈 및 서비스 구현
- Uploads 모듈 및 이미지 최적화 (Sharp)
- 정적 파일 제공 설정"

echo "✅ Phase 1-3 완료 및 커밋"
EOF
```

---

## 🎯 체크포인트: Phase 1 완료 확인

Phase 1 (Week 1-6)이 완료되었습니다. 다음을 확인하세요:

### 완료된 기능
- [x] Git 저장소 초기화
- [x] NestJS 백엔드 프로젝트
- [x] Prisma + PostgreSQL 설정
- [x] 카카오 OAuth 로그인 (백엔드)
- [x] JWT 인증
- [x] 작가 프로필 생성/수정
- [x] 포트폴리오 업로드
- [x] 작가 목록/검색

### API 엔드포인트 목록

```
GET    /api/auth/kakao               - 카카오 로그인 시작
GET    /api/auth/kakao/callback      - 카카오 콜백
GET    /api/auth/me                  - 내 정보 조회

PATCH  /api/users/me/role            - 역할 변경
GET    /api/users/me                 - 프로필 조회

GET    /api/artists                  - 작가 목록
GET    /api/artists/:id              - 작가 상세
POST   /api/artists/profile          - 작가 프로필 생성
PATCH  /api/artists/profile          - 작가 프로필 수정
GET    /api/artists/profile/me       - 내 작가 프로필

POST   /api/portfolios               - 포트폴리오 생성
DELETE /api/portfolios/:id           - 포트폴리오 삭제

POST   /api/uploads/portfolio        - 포트폴리오 이미지 업로드
POST   /api/uploads/chat             - 채팅 파일 업로드
```

### 다음 단계

Phase 2로 진행하기 전에:

1. **카카오 디벨로퍼스 설정**
   - https://developers.kakao.com
   - 앱 생성
   - 리다이렉트 URI 설정
   - .env 파일에 KAKAO_CLIENT_ID 업데이트

2. **프론트엔드 개발**
   - Week 7-8에서 Next.js 프론트엔드 생성 예정
   - 로그인 페이지, 작가 목록 페이지 등 구현

3. **Phase 2 준비**
   - Week 9부터 채팅 시스템 구현 시작

---

## 📝 다음 주차 작업: Week 7-8 프론트엔드 기초

### 작업 내용 (요약)
1. Next.js 프로젝트 생성
2. 로그인 페이지 구현
3. 작가 목록/상세 페이지 구현
4. 작가 프로필 등록 페이지 구현

### 상세 가이드는 별도 요청 시 제공

---

## 🚨 에러 발생 시 대응 가이드

### 1. Prisma 마이그레이션 실패
```bash
# 데이터베이스 리셋
npx prisma migrate reset

# 마이그레이션 재실행
npx prisma migrate dev --name init
```

### 2. 포트 이미 사용 중
```bash
# 3001 포트 사용 프로세스 찾기
lsof -ti:3001

# 프로세스 종료
kill -9 $(lsof -ti:3001)
```

### 3. npm install 실패
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 4. PostgreSQL 연결 실패
```bash
# PostgreSQL 상태 확인
brew services list

# PostgreSQL 재시작
brew services restart postgresql
```

---

## 📚 참고 문서

- **REQUIREMENTS.md**: 전체 요구사항
- **ARCHITECTURE.md**: 아키텍처 및 Prisma Schema
- **IMPLEMENTATION_PLAN.md**: 6개월 구현 계획

---

**AI 에이전트 가이드 버전**: 1.0  
**최종 수정일**: 2026-02-05  
**다음 업데이트**: Phase 2 (Week 9-16) 가이드 추가 예정
