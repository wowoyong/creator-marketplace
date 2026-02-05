# 크리에이터 마켓플레이스 - 아키텍처 설계서

## 📐 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Browser   │  │   Mobile    │  │     PWA     │         │
│  │  (Desktop)  │  │   Safari    │  │  (Offline)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS / WebSocket
┌────────────▼────────────────────────────────────────────────┐
│                     Next.js 15 (Frontend)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App Router  │  React Components  │  TailwindCSS    │   │
│  │  PWA Setup   │  Service Worker    │  Push API       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │ REST API / Socket.IO
┌────────────▼────────────────────────────────────────────────┐
│                      NestJS 11 (Backend)                     │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐    │
│  │   Auth      │   Chat      │ Transaction │  Notify  │    │
│  │  Module     │   Gateway   │   Module    │  Module  │    │
│  └─────────────┴─────────────┴─────────────┴──────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Passport.js  │  Socket.IO Server  │  Bull Queue    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│PostgreSQL│      │  Redis   │
│(Prisma) │      │ (Cache)  │
└─────────┘      └──────────┘
```

---

## 🗄 데이터베이스 스키마 설계

### Prisma Schema (schema.prisma)

```prisma
// ============================================
// User & Profile
// ============================================

enum UserRole {
  ARTIST    // 작가
  CLIENT    // 클라이언트
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
  
  // 작가 정보
  bio             String?   @db.Text
  specialties     String[]  // ["일러스트", "캐릭터 디자인"]
  priceRange      String?   // "50,000 ~ 200,000원"
  
  // 통계
  totalTransactions Int     @default(0)
  averageRating     Float?
  responseRate      Float?  // 응답률
  
  // 포트폴리오
  portfolios        Portfolio[]
  referenceUrls     String[]  // 외부 참고 링크
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("artist_profiles")
}

model ClientProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 클라이언트 정보
  preferredGenres String[]  // 선호 장르
  
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
  
  imageUrl        String        // 전체 URL: https://domain.com/uploads/portfolio/xxx.jpg
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
  
  // Relations
  members     ChatRoomMember[]
  messages    Message[]
  transaction Transaction?    // 거래와 1:1 매핑
  
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
  
  lastReadAt  DateTime? // 마지막으로 읽은 시간
  joinedAt    DateTime  @default(now())
  
  @@unique([chatRoomId, userId])
  @@index([userId])
  @@map("chat_room_members")
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM  // 시스템 메시지 (거래 시작, 완료 등)
}

model Message {
  id          String      @id @default(cuid())
  chatRoomId  String
  chatRoom    ChatRoom    @relation(fields: [chatRoomId], references: [id], onDelete: Cascade)
  
  senderId    String
  sender      User        @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  
  type        MessageType @default(TEXT)
  content     String      @db.Text
  fileUrl     String?     // 첨부 파일 URL
  
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
  REQUESTED       // 의뢰 요청됨
  ACCEPTED        // 작가가 수락
  IN_PROGRESS     // 작업 진행중
  COMPLETED       // 완료됨
  REVIEWED        // 후기 작성 완료
  CANCELLED       // 취소됨
}

// 향후 에스크로 전환 대비
enum PaymentMethod {
  EXTERNAL        // 외부 결제 (MVP)
  TOSS_PAYMENTS   // 토스페이먼츠
  BANK_TRANSFER   // 계좌이체
}

enum EscrowStatus {
  NONE            // 에스크로 없음 (MVP)
  PENDING         // 결제 대기
  DEPOSITED       // 입금됨
  RELEASED        // 작가에게 지급
  REFUNDED        // 환불됨
}

model Transaction {
  id              String            @id @default(cuid())
  
  // 거래 당사자
  clientId        String
  client          User              @relation("ClientTransactions", fields: [clientId], references: [id])
  
  artistId        String
  artist          User              @relation("ArtistTransactions", fields: [artistId], references: [id])
  
  // 채팅방 연결
  chatRoomId      String            @unique
  chatRoom        ChatRoom          @relation(fields: [chatRoomId], references: [id])
  
  // 거래 정보
  title           String
  description     String            @db.Text
  agreedPrice     Int?              // 합의된 가격 (원)
  status          TransactionStatus @default(REQUESTED)
  
  // 결제 정보 (향후 에스크로 전환 대비)
  paymentMethod   PaymentMethod     @default(EXTERNAL)
  escrowStatus    EscrowStatus      @default(NONE)
  pgTransactionId String?           // PG사 거래 ID
  paidAt          DateTime?
  
  // 타임스탬프
  requestedAt     DateTime          @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  
  // Relations
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
  CLIENT_TO_ARTIST  // 클라이언트가 작가에게
  ARTIST_TO_CLIENT  // 작가가 클라이언트에게
}

model Review {
  id            String      @id @default(cuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  type          ReviewType
  
  // 작성자와 대상
  authorId      String
  author        User        @relation("ReviewAuthor", fields: [authorId], references: [id])
  
  targetId      String
  target        User        @relation("ReviewTarget", fields: [targetId], references: [id])
  
  // 평가 내용
  rating        Int         // 1-5
  content       String?     @db.Text
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@unique([transactionId, type])  // 거래당 각 타입별 1개씩만
  @@index([targetId, rating])
  @@map("reviews")
}

// ============================================
// Notification System
// ============================================

enum NotificationType {
  CHAT_MESSAGE        // 새 채팅 메시지
  TRANSACTION_REQUEST // 의뢰 요청
  TRANSACTION_ACCEPT  // 의뢰 수락
  TRANSACTION_COMPLETE // 거래 완료
  REVIEW_RECEIVED     // 후기 받음
  SYSTEM              // 시스템 알림
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
  
  // 메타데이터
  metadata    Json?             // 관련 데이터 (transactionId, messageId 등)
  
  // 상태
  isRead      Boolean           @default(false)
  readAt      DateTime?
  
  // 발송 채널
  sentChannels NotificationChannel[]
  
  createdAt   DateTime          @default(now())
  
  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

// ============================================
// User Notification Settings
// ============================================

model NotificationSettings {
  id        String   @id @default(cuid())
  userId    String   @unique
  
  // 채널별 설정
  enableInApp   Boolean @default(true)
  enableEmail   Boolean @default(true)
  enablePush    Boolean @default(true)
  
  // 이벤트별 설정
  notifyOnMessage     Boolean @default(true)
  notifyOnTransaction Boolean @default(true)
  notifyOnReview      Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("notification_settings")
}

// ============================================
// PWA Push Subscription
// ============================================

model PushSubscription {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  endpoint    String   @unique
  keys        Json     // {p256dh: string, auth: string}
  
  userAgent   String?
  
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime @default(now())
  
  @@index([userId])
  @@map("push_subscriptions")
}
```

---

## 🏗 모듈 구조 (NestJS)

```
src/
├── main.ts
├── app.module.ts
│
├── auth/                    # 인증 모듈
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── kakao.strategy.ts
│   │   └── jwt.strategy.ts
│   └── guards/
│       └── roles.guard.ts
│
├── users/                   # 사용자 관리
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│
├── artists/                 # 작가 프로필
│   ├── artists.module.ts
│   ├── artists.controller.ts
│   ├── artists.service.ts
│   └── dto/
│
├── portfolios/              # 포트폴리오
│   ├── portfolios.module.ts
│   ├── portfolios.controller.ts
│   ├── portfolios.service.ts
│   └── dto/
│
├── chat/                    # 채팅 시스템
│   ├── chat.module.ts
│   ├── chat.gateway.ts      # Socket.IO Gateway
│   ├── chat.service.ts
│   ├── rooms.service.ts
│   └── dto/
│
├── transactions/            # 거래 관리
│   ├── transactions.module.ts
│   ├── transactions.controller.ts
│   ├── transactions.service.ts
│   └── dto/
│
├── reviews/                 # 후기 시스템
│   ├── reviews.module.ts
│   ├── reviews.controller.ts
│   ├── reviews.service.ts
│   └── dto/
│
├── notifications/           # 알림 시스템
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── notifications.gateway.ts  # 실시간 알림
│   ├── email.service.ts
│   ├── push.service.ts
│   └── dto/
│
├── uploads/                 # 파일 업로드
│   ├── uploads.module.ts
│   ├── uploads.controller.ts
│   ├── uploads.service.ts
│   └── storage/
│       ├── local.storage.ts
│       └── cloud.storage.ts (향후)
│
├── common/                  # 공통 모듈
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   └── utils/
│
└── config/                  # 설정
    ├── app.config.ts
    ├── database.config.ts
    └── jwt.config.ts
```

---

## 🔄 핵심 플로우 설계

### 1. 거래 플로우 (Transaction Flow)

```
[클라이언트]              [시스템]              [작가]
     │                      │                     │
     │──(1) 작가 프로필 조회──▶│                     │
     │◀────작가 정보 반환────│                     │
     │                      │                     │
     │──(2) 채팅방 생성 요청─▶│                     │
     │                      │──(3) 채팅방 생성──▶│
     │◀────채팅방 ID────────│◀────Socket.IO─────│
     │                      │                     │
     │──(4) 의뢰 요청 전송───▶│                     │
     │    (Transaction 생성)  │──(5) 알림 발송──▶│
     │                      │    (인앱/이메일/푸시)  │
     │                      │                     │
     │                      │◀─(6) 의뢰 수락────│
     │◀──(7) 상태 업데이트──│                     │
     │    (ACCEPTED)         │                     │
     │                      │                     │
     │ ←─────(8) 채팅으로 협의 (Socket.IO)──────▶ │
     │                      │                     │
     │ (9) 외부 결제 진행    │                     │
     │ (계좌이체/토스 등)     │                     │
     │                      │                     │
     │──(10) "결제완료" 상태─▶│──(11) 알림──────▶│
     │      업데이트 요청     │                     │
     │                      │                     │
     │                      │◀─(12) 작업 완료──│
     │◀──(13) 거래 완료 알림─│      전송          │
     │                      │                     │
     │──(14) 후기 작성──────▶│──(15) 알림──────▶│
     │                      │◀─(16) 후기 작성──│
     │◀────평점 업데이트─────│                     │
```

### 2. 실시간 채팅 플로우

```typescript
// Client → Server
socket.emit('join_room', { roomId: 'xxx' })
socket.emit('send_message', { 
  roomId: 'xxx', 
  content: '안녕하세요' 
})

// Server → Client
socket.on('message_received', (message) => {
  // 메시지 표시
})

socket.on('user_typing', (data) => {
  // 타이핑 표시
})

socket.on('message_read', (data) => {
  // 읽음 표시 업데이트
})
```

**서버 로직:**
```typescript
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  
  @SubscribeMessage('join_room')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    // 1. 권한 확인 (해당 방의 멤버인지)
    // 2. Socket을 방에 join
    client.join(payload.roomId)
    // 3. 읽지 않은 메시지 수 업데이트
  }
  
  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: SendMessageDto) {
    // 1. DB에 메시지 저장
    const message = await this.chatService.createMessage(payload)
    
    // 2. 방의 모든 멤버에게 전송
    this.server.to(payload.roomId).emit('message_received', message)
    
    // 3. 상대방에게 알림 발송 (오프라인 시)
    await this.notificationService.notifyNewMessage(message)
  }
}
```

### 3. 알림 시스템 플로우

```typescript
// notifications.service.ts
async sendNotification(params: {
  userId: string
  type: NotificationType
  title: string
  content: string
  metadata?: any
}) {
  // 1. 사용자 알림 설정 조회
  const settings = await this.getSettings(params.userId)
  
  const channels: NotificationChannel[] = []
  
  // 2. 인앱 알림 (항상 저장)
  const notification = await this.createInAppNotification(params)
  channels.push('IN_APP')
  
  // 3. 실시간 푸시 (Socket.IO)
  if (settings.enableInApp) {
    this.gateway.server
      .to(`user:${params.userId}`)
      .emit('notification', notification)
  }
  
  // 4. 이메일 발송
  if (settings.enableEmail && this.shouldSendEmail(params.type)) {
    await this.emailService.send({
      to: user.email,
      template: this.getEmailTemplate(params.type),
      data: params
    })
    channels.push('EMAIL')
  }
  
  // 5. PWA 푸시
  if (settings.enablePush) {
    await this.pushService.send({
      userId: params.userId,
      title: params.title,
      body: params.content,
      data: params.metadata
    })
    channels.push('PUSH')
  }
  
  // 6. 발송 채널 기록
  await this.updateSentChannels(notification.id, channels)
}
```

---

## 📱 PWA 푸시 알림 구현

### 프론트엔드 (Next.js)

```typescript
// app/service-worker.ts
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.metadata
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // 알림 클릭 시 해당 페이지로 이동
  const urlToOpen = event.notification.data.url || '/'
  event.waitUntil(
    clients.openWindow(urlToOpen)
  )
})
```

```typescript
// hooks/usePushNotification.ts
export function usePushNotification() {
  const subscribe = async () => {
    // 1. Service Worker 등록
    const registration = await navigator.serviceWorker.ready
    
    // 2. Push 구독
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    })
    
    // 3. 백엔드에 구독 정보 전송
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    })
  }
  
  return { subscribe }
}
```

### 백엔드 (NestJS)

```typescript
// push.service.ts
import * as webpush from 'web-push'

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {
    webpush.setVapidDetails(
      'mailto:support@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
  
  async send(params: {
    userId: string
    title: string
    body: string
    data?: any
  }) {
    // 1. 사용자의 모든 구독 정보 조회
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: params.userId }
    })
    
    // 2. 각 구독에 푸시 발송
    const promises = subscriptions.map(sub => 
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as any
        },
        JSON.stringify({
          title: params.title,
          body: params.body,
          metadata: params.data
        })
      ).catch(error => {
        // 만료된 구독 삭제
        if (error.statusCode === 410) {
          return this.prisma.pushSubscription.delete({
            where: { id: sub.id }
          })
        }
      })
    )
    
    await Promise.all(promises)
  }
}
```

---

## 🖼 파일 저장소 전환 전략

### 현재 구조 (MVP)

```typescript
// uploads.service.ts
@Injectable()
export class UploadsService {
  private readonly STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || 'http://localhost:3000'
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads')
  
  async uploadPortfolio(file: Express.Multer.File, userId: string): Promise<string> {
    // 1. 파일 저장
    const filename = `${Date.now()}-${file.originalname}`
    const filepath = path.join(this.UPLOAD_DIR, 'portfolio', filename)
    await fs.writeFile(filepath, file.buffer)
    
    // 2. 전체 URL 반환 (중요!)
    const imageUrl = `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}`
    
    return imageUrl
  }
}
```

### 향후 구조 (Cloudflare R2)

```typescript
// storage/cloud.storage.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

@Injectable()
export class CloudStorage {
  private s3Client: S3Client
  
  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY
      }
    })
  }
  
  async upload(file: Express.Multer.File, key: string): Promise<string> {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    }))
    
    // R2 Public URL
    return `${process.env.R2_PUBLIC_URL}/${key}`
  }
}
```

### 마이그레이션 스크립트

```typescript
// scripts/migrate-to-cloud.ts
async function migrateImagesToCloud() {
  const portfolios = await prisma.portfolio.findMany()
  
  for (const portfolio of portfolios) {
    // 1. 로컬 파일 읽기
    const localPath = portfolio.imageUrl.replace('http://localhost:3000', '')
    const fileBuffer = await fs.readFile(path.join(process.cwd(), localPath))
    
    // 2. R2에 업로드
    const filename = path.basename(localPath)
    const r2Url = await cloudStorage.upload({
      buffer: fileBuffer,
      originalname: filename,
      mimetype: 'image/jpeg'
    } as any, `portfolio/${filename}`)
    
    // 3. DB 업데이트
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { imageUrl: r2Url }
    })
    
    console.log(`Migrated: ${portfolio.id}`)
  }
}
```

---

## 🔐 인증 & 보안

### JWT 전략

```typescript
// auth.service.ts
async login(kakaoUser: any) {
  // 1. 카카오 사용자 정보로 User 찾기 또는 생성
  let user = await this.prisma.user.findUnique({
    where: { kakaoId: kakaoUser.id }
  })
  
  if (!user) {
    user = await this.prisma.user.create({
      data: {
        kakaoId: kakaoUser.id,
        email: kakaoUser.email,
        nickname: kakaoUser.nickname,
        profileImage: kakaoUser.profile_image,
        role: 'CLIENT' // 기본값, 나중에 변경 가능
      }
    })
  }
  
  // 2. JWT 발급
  const payload = { sub: user.id, role: user.role }
  return {
    access_token: this.jwtService.sign(payload),
    user
  }
}
```

### Role-based Access Control

```typescript
// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler())
    if (!requiredRoles) return true
    
    const request = context.switchToHttp().getRequest()
    const user = request.user
    
    return requiredRoles.some(role => user.role === role)
  }
}

// 사용 예시
@Get('profile')
@Roles(UserRole.ARTIST)
@UseGuards(JwtAuthGuard, RolesGuard)
async getArtistProfile(@CurrentUser() user: User) {
  return this.artistsService.getProfile(user.id)
}
```

---

## ⚡️ 성능 최적화

### 1. Database Query Optimization

```typescript
// artists.service.ts
async getArtistsWithStats(params: GetArtistsDto) {
  return this.prisma.user.findMany({
    where: {
      role: 'ARTIST',
      status: 'ACTIVE'
    },
    include: {
      artistProfile: {
        include: {
          portfolios: {
            take: 5,
            orderBy: { displayOrder: 'asc' }
          },
          // N+1 방지: 평균 평점 계산 (Prisma aggregation)
          _count: {
            select: { portfolios: true }
          }
        }
      },
      // 받은 리뷰 평균 (미리 계산된 averageRating 사용)
      receivedReviews: {
        select: {
          rating: true
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    },
    skip: params.skip,
    take: params.take
  })
}
```

### 2. Redis Caching

```typescript
// artists.service.ts
async getFeaturedArtists() {
  const cacheKey = 'featured_artists'
  
  // 1. 캐시 확인
  const cached = await this.redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // 2. DB 조회
  const artists = await this.prisma.user.findMany({
    where: {
      role: 'ARTIST',
      artistProfile: {
        averageRating: { gte: 4.5 },
        totalTransactions: { gte: 10 }
      }
    },
    include: {
      artistProfile: {
        include: {
          portfolios: { take: 3 }
        }
      }
    },
    take: 10
  })
  
  // 3. 캐시 저장 (10분)
  await this.redis.setex(cacheKey, 600, JSON.stringify(artists))
  
  return artists
}
```

### 3. Image Optimization

```typescript
// uploads.service.ts
import sharp from 'sharp'

async uploadPortfolio(file: Express.Multer.File): Promise<string> {
  // 1. 이미지 리사이징 & 최적화
  const optimized = await sharp(file.buffer)
    .resize(1200, 1200, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .webp({ quality: 85 })
    .toBuffer()
  
  // 2. 저장
  const filename = `${Date.now()}.webp`
  await fs.writeFile(
    path.join(this.UPLOAD_DIR, 'portfolio', filename),
    optimized
  )
  
  return `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}`
}
```

---

## 🚀 배포 전략

### PM2 Ecosystem 설정

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'creator-marketplace-api',
      script: 'dist/main.js',
      instances: 2,  // 클러스터 모드
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'creator-marketplace-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.yourdomain.com'
      }
    }
  ]
}
```

### Nginx 설정

```nginx
# /etc/nginx/sites-available/creator-marketplace
upstream api_backend {
  server localhost:3001;
}

upstream web_frontend {
  server localhost:3000;
}

server {
  listen 80;
  server_name yourdomain.com;
  
  # HTTPS 리다이렉트 (Let's Encrypt 설정 후)
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;
  
  # SSL 인증서 (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  
  # API 요청
  location /api {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
  
  # Socket.IO
  location /socket.io {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
  
  # 정적 파일 (업로드)
  location /uploads {
    alias /Users/chojaeyong/WebstormProjects/creator-marketplace/uploads;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  
  # Next.js 프론트엔드
  location / {
    proxy_pass http://web_frontend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## 📊 모니터링 & 로깅

### Winston Logger 설정

```typescript
// common/logger/logger.service.ts
import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
})
```

---

## 🔄 에스크로 전환 시 필요 작업

### 1. PG 연동 (토스페이먼츠)

```typescript
// payments/toss.service.ts
@Injectable()
export class TossPaymentsService {
  private readonly CLIENT_KEY = process.env.TOSS_CLIENT_KEY
  private readonly SECRET_KEY = process.env.TOSS_SECRET_KEY
  
  async requestPayment(transaction: Transaction) {
    const response = await fetch('https://api.tosspayments.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(this.SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: transaction.id,
        amount: transaction.agreedPrice,
        orderName: transaction.title,
        successUrl: `${process.env.FRONTEND_URL}/payment/success`,
        failUrl: `${process.env.FRONTEND_URL}/payment/fail`
      })
    })
    
    return response.json()
  }
  
  async confirmPayment(paymentKey: string, orderId: string, amount: number) {
    // 결제 승인
    await this.prisma.transaction.update({
      where: { id: orderId },
      data: {
        pgTransactionId: paymentKey,
        escrowStatus: 'DEPOSITED',
        paidAt: new Date()
      }
    })
  }
  
  async releaseToArtist(transactionId: string) {
    // 작가에게 정산
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId }
    })
    
    // 토스페이먼츠 정산 API 호출
    // ...
    
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { escrowStatus: 'RELEASED' }
    })
  }
}
```

### 2. Transaction 상태 FSM

```typescript
// transactions/transaction.state.ts
enum TransactionStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',  // 추가
  PAYMENT_COMPLETE = 'PAYMENT_COMPLETE', // 추가
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED'
}

const TRANSITIONS = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAYMENT_COMPLETE', 'CANCELLED'],
  PAYMENT_COMPLETE: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['REVIEWED'],
  REVIEWED: [],
  CANCELLED: []
}

function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}
```

---

## ✅ 체크리스트

### MVP 출시 전 필수 항목

- [ ] **기능 완성도**
  - [ ] 카카오 로그인 동작
  - [ ] 작가 프로필 생성 (포트폴리오 5장 필수)
  - [ ] 작가 검색/목록
  - [ ] 1:1 채팅 (실시간)
  - [ ] 거래 상태 관리
  - [ ] 후기 작성 (양방향)
  - [ ] 알림 (인앱/이메일/푸시)

- [ ] **보안**
  - [ ] HTTPS 적용
  - [ ] JWT 만료 시간 설정 (1시간)
  - [ ] Refresh Token 구현
  - [ ] CORS 설정
  - [ ] XSS 방지 (Input sanitization)
  - [ ] CSRF 방지
  - [ ] Rate Limiting

- [ ] **성능**
  - [ ] Database Index 설정
  - [ ] N+1 쿼리 해결
  - [ ] 이미지 최적화 (WebP, 리사이징)
  - [ ] API 응답 시간 < 500ms

- [ ] **법적**
  - [ ] 개인정보 처리방침
  - [ ] 이용약관
  - [ ] 쿠키 정책

- [ ] **모니터링**
  - [ ] 에러 로깅 (Winston)
  - [ ] PM2 모니터링
  - [ ] DB 백업 스크립트

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-02-04  
**작성자**: Sisyphus (OhMyClaude Code)
