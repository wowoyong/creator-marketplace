# 크리에이터 마켓플레이스 - 구현 계획서

## 📅 개발 로드맵 (6개월)

### Phase 1: 기반 구축 (Month 1-2)
**목표**: 프로젝트 셋업 + 인증 + 기본 프로필 관리

### Phase 2: 핵심 기능 (Month 3-4)
**목표**: 채팅 + 거래 관리 시스템

### Phase 3: 부가 기능 (Month 5)
**목표**: 알림 시스템 + 후기 시스템

### Phase 4: 테스트 & 최적화 (Month 6)
**목표**: 버그 수정 + 성능 최적화 + 배포

---

## 🏗 Phase 1: 기반 구축 (Week 1-8)

### Week 1-2: 프로젝트 초기 설정

#### 1.1 저장소 및 개발 환경 설정
```bash
# 프로젝트 디렉토리 생성
mkdir ~/WebstormProjects/creator-marketplace
cd ~/WebstormProjects/creator-marketplace

# Git 초기화
git init
git remote add origin <github-url>

# 백엔드 설정
mkdir backend
cd backend
npx @nestjs/cli new . --package-manager npm
npm install @prisma/client prisma
npm install @nestjs/passport passport passport-jwt passport-kakao
npm install @nestjs/jwt
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install class-validator class-transformer
npm install bcrypt
npm install --save-dev @types/passport-jwt @types/passport-kakao

# 프론트엔드 설정
cd ..
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install socket.io-client
npm install @tanstack/react-query
npm install zustand
npm install react-hook-form
npm install zod
```

**완료 기준:**
- [ ] Git 저장소 생성 및 initial commit
- [ ] 백엔드 NestJS 프로젝트 생성
- [ ] 프론트엔드 Next.js 프로젝트 생성
- [ ] 필수 dependencies 설치
- [ ] `.env.example` 파일 작성
- [ ] `README.md` 작성

#### 1.2 데이터베이스 설정

```bash
# PostgreSQL 설정 (Mac Mini에 이미 설치되어 있다고 가정)
createdb creator_marketplace

# Prisma 초기화
cd backend
npx prisma init

# schema.prisma에 ARCHITECTURE.md의 스키마 복사
# .env에 DATABASE_URL 설정
```

**완료 기준:**
- [ ] PostgreSQL 데이터베이스 생성
- [ ] Prisma schema 작성 완료
- [ ] `npx prisma migrate dev --name init` 성공
- [ ] Prisma Client 생성

#### 1.3 기본 모듈 구조 생성

```bash
cd backend
nest g module common/prisma
nest g service common/prisma
nest g module auth
nest g controller auth
nest g service auth
nest g module users
nest g controller users
nest g service users
```

**완료 기준:**
- [ ] PrismaModule, PrismaService 구현
- [ ] 모든 모듈에 PrismaModule import
- [ ] 기본 CRUD 템플릿 생성

---

### Week 3-4: 인증 시스템

#### 2.1 카카오 OAuth 연동

**백엔드 구현:**

```typescript
// auth/strategies/kakao.strategy.ts
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-kakao'

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID,
      callbackURL: process.env.KAKAO_CALLBACK_URL
    })
  }
  
  async validate(accessToken: string, refreshToken: string, profile: any) {
    return {
      kakaoId: profile.id,
      email: profile._json.kakao_account.email,
      nickname: profile.displayName,
      profileImage: profile._json.properties.profile_image
    }
  }
}

// auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}
  
  async kakaoLogin(kakaoUser: any) {
    // User 찾기 또는 생성
    let user = await this.prisma.user.findUnique({
      where: { kakaoId: kakaoUser.kakaoId }
    })
    
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kakaoId: kakaoUser.kakaoId,
          email: kakaoUser.email,
          nickname: kakaoUser.nickname,
          profileImage: kakaoUser.profileImage,
          role: 'CLIENT' // 기본값
        }
      })
    }
    
    // JWT 발급
    const payload = { sub: user.id, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user
    }
  }
}

// auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuth() {}
  
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoCallback(@Req() req, @Res() res) {
    const result = await this.authService.kakaoLogin(req.user)
    
    // 프론트엔드로 리다이렉트 (토큰 전달)
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${result.access_token}`)
  }
}
```

**프론트엔드 구현:**

```typescript
// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('access_token', token)
      router.push('/onboarding') // 역할 선택 페이지
    }
  }, [])
  
  return <div>로그인 처리 중...</div>
}

// app/onboarding/page.tsx
'use client'

export default function OnboardingPage() {
  const [role, setRole] = useState<'ARTIST' | 'CLIENT' | null>(null)
  
  const handleSubmit = async () => {
    await fetch('/api/users/me/role', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    })
    
    router.push(role === 'ARTIST' ? '/artist/profile/setup' : '/artists')
  }
  
  return (
    <div>
      <h1>어떤 역할로 시작하시겠어요?</h1>
      <button onClick={() => setRole('ARTIST')}>작가로 시작</button>
      <button onClick={() => setRole('CLIENT')}>클라이언트로 시작</button>
      {role && <button onClick={handleSubmit}>시작하기</button>}
    </div>
  )
}
```

**완료 기준:**
- [ ] 카카오 디벨로퍼스 앱 등록
- [ ] 카카오 로그인 버튼 클릭 시 OAuth 플로우 동작
- [ ] 로그인 후 JWT 발급 및 저장
- [ ] 역할 선택 페이지 완성
- [ ] JWT Guard 구현 및 테스트

#### 2.2 사용자 프로필 관리

```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  async updateRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role }
    })
  }
  
  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: {
          include: {
            portfolios: true
          }
        },
        clientProfile: true
      }
    })
  }
}
```

**완료 기준:**
- [ ] 역할 변경 API 동작
- [ ] 프로필 조회 API 동작
- [ ] 프론트엔드에서 사용자 정보 표시

---

### Week 5-6: 작가 프로필 & 포트폴리오

#### 3.1 작가 프로필 생성

```typescript
// artists/artists.service.ts
@Injectable()
export class ArtistsService {
  async createProfile(userId: string, dto: CreateArtistProfileDto) {
    return this.prisma.artistProfile.create({
      data: {
        userId,
        bio: dto.bio,
        specialties: dto.specialties,
        priceRange: dto.priceRange,
        referenceUrls: dto.referenceUrls || []
      }
    })
  }
  
  async updateProfile(userId: string, dto: UpdateArtistProfileDto) {
    return this.prisma.artistProfile.update({
      where: { userId },
      data: dto
    })
  }
}
```

**프론트엔드:**

```typescript
// app/artist/profile/setup/page.tsx
export default function ArtistProfileSetupPage() {
  const { register, handleSubmit } = useForm()
  
  const onSubmit = async (data) => {
    await fetch('/api/artists/profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    router.push('/artist/portfolio/setup')
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <textarea {...register('bio')} placeholder="자기소개" />
      <input {...register('specialties')} placeholder="전문분야 (쉼표로 구분)" />
      <input {...register('priceRange')} placeholder="가격대 (예: 50,000 ~ 200,000원)" />
      <button type="submit">다음</button>
    </form>
  )
}
```

**완료 기준:**
- [ ] 작가 프로필 생성 API
- [ ] 작가 프로필 수정 API
- [ ] 프론트엔드 폼 완성
- [ ] Validation 적용

#### 3.2 포트폴리오 업로드

```typescript
// uploads/uploads.service.ts
import { Injectable } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import sharp from 'sharp'

@Injectable()
export class UploadsService {
  private readonly STORAGE_BASE_URL = process.env.STORAGE_BASE_URL || 'http://localhost:3001'
  private readonly UPLOAD_DIR = path.join(process.cwd(), '..', 'uploads')
  
  async uploadPortfolio(file: Express.Multer.File, userId: string): Promise<string> {
    // 디렉토리 생성
    const portfolioDir = path.join(this.UPLOAD_DIR, 'portfolio')
    await fs.mkdir(portfolioDir, { recursive: true })
    
    // 이미지 최적화
    const filename = `${Date.now()}-${userId}.webp`
    const filepath = path.join(portfolioDir, filename)
    
    await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath)
    
    // 전체 URL 반환
    return `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}`
  }
}

// portfolios/portfolios.service.ts
@Injectable()
export class PortfoliosService {
  async create(artistProfileId: string, imageUrl: string, dto: CreatePortfolioDto) {
    // 현재 포트폴리오 개수 확인
    const count = await this.prisma.portfolio.count({
      where: { artistProfileId }
    })
    
    return this.prisma.portfolio.create({
      data: {
        artistProfileId,
        imageUrl,
        title: dto.title,
        description: dto.description,
        displayOrder: count
      }
    })
  }
  
  async getByArtist(artistProfileId: string) {
    return this.prisma.portfolio.findMany({
      where: { artistProfileId },
      orderBy: { displayOrder: 'asc' }
    })
  }
}

// portfolios/portfolios.controller.ts
@Controller('portfolios')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User
  ) {
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: { userId: user.id }
    })
    
    if (!artistProfile) {
      throw new BadRequestException('작가 프로필이 없습니다')
    }
    
    // 최대 20개 제한
    const count = await this.portfoliosService.count(artistProfile.id)
    if (count >= 20) {
      throw new BadRequestException('포트폴리오는 최대 20개까지 등록할 수 있습니다')
    }
    
    const imageUrl = await this.uploadsService.uploadPortfolio(file, user.id)
    return this.portfoliosService.create(artistProfile.id, imageUrl, {})
  }
}
```

**프론트엔드:**

```typescript
// app/artist/portfolio/setup/page.tsx
'use client'

export default function PortfolioSetupPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  
  const handleUpload = async () => {
    if (files.length < 5) {
      alert('최소 5장의 포트폴리오 이미지가 필요합니다')
      return
    }
    
    setUploading(true)
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      
      await fetch('/api/portfolios/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
    }
    
    setUploading(false)
    router.push('/artist/dashboard')
  }
  
  return (
    <div>
      <h1>포트폴리오 등록</h1>
      <p>최소 5장의 이미지를 업로드해주세요</p>
      
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />
      
      <div>선택된 파일: {files.length}개</div>
      
      <button onClick={handleUpload} disabled={files.length < 5 || uploading}>
        {uploading ? '업로드 중...' : '등록 완료'}
      </button>
    </div>
  )
}
```

**완료 기준:**
- [ ] 이미지 업로드 API 동작
- [ ] Sharp를 이용한 이미지 최적화 적용
- [ ] 5장 필수 검증
- [ ] 프론트엔드 파일 선택 UI
- [ ] 업로드 진행률 표시

#### 3.3 작가 목록 & 검색

```typescript
// artists/artists.controller.ts
@Controller('artists')
export class ArtistsController {
  @Get()
  async findAll(@Query() query: GetArtistsDto) {
    return this.artistsService.findAll(query)
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id)
  }
}

// artists/artists.service.ts
async findAll(query: GetArtistsDto) {
  const { search, skip = 0, take = 20 } = query
  
  return this.prisma.user.findMany({
    where: {
      role: 'ARTIST',
      status: 'ACTIVE',
      ...(search && {
        OR: [
          { nickname: { contains: search } },
          { artistProfile: { bio: { contains: search } } }
        ]
      })
    },
    include: {
      artistProfile: {
        include: {
          portfolios: {
            take: 5,
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      receivedReviews: {
        select: { rating: true },
        take: 10
      }
    },
    skip,
    take
  })
}

async findOne(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      artistProfile: {
        include: {
          portfolios: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      },
      receivedReviews: {
        include: {
          author: {
            select: {
              nickname: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      receivedTransactions: {
        where: { status: 'COMPLETED' },
        select: { id: true }
      }
    }
  })
  
  if (!user || user.role !== 'ARTIST') {
    throw new NotFoundException('작가를 찾을 수 없습니다')
  }
  
  return user
}
```

**프론트엔드:**

```typescript
// app/artists/page.tsx
'use client'

export default function ArtistsPage() {
  const [artists, setArtists] = useState([])
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    fetchArtists()
  }, [search])
  
  const fetchArtists = async () => {
    const res = await fetch(`/api/artists?search=${search}`)
    const data = await res.json()
    setArtists(data)
  }
  
  return (
    <div>
      <input
        type="text"
        placeholder="작가 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <div className="grid grid-cols-3 gap-4">
        {artists.map(artist => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  )
}

// components/ArtistCard.tsx
function ArtistCard({ artist }) {
  const avgRating = artist.receivedReviews.length > 0
    ? artist.receivedReviews.reduce((sum, r) => sum + r.rating, 0) / artist.receivedReviews.length
    : null
  
  return (
    <Link href={`/artists/${artist.id}`}>
      <div className="border rounded p-4">
        <img src={artist.profileImage} alt={artist.nickname} />
        <h3>{artist.nickname}</h3>
        <p>{artist.artistProfile.bio}</p>
        {avgRating && <div>⭐ {avgRating.toFixed(1)}</div>}
        <div className="flex gap-2 mt-2">
          {artist.artistProfile.portfolios.slice(0, 3).map(p => (
            <img key={p.id} src={p.imageUrl} className="w-20 h-20 object-cover" />
          ))}
        </div>
      </div>
    </Link>
  )
}
```

**완료 기준:**
- [ ] 작가 목록 API
- [ ] 작가 상세 API
- [ ] 검색 기능 동작
- [ ] 프론트엔드 목록 페이지
- [ ] 프론트엔드 상세 페이지 (포트폴리오 갤러리)

---

### Week 7-8: 정적 파일 제공 & Phase 1 마무리

#### 4.1 정적 파일 제공 설정

```typescript
// main.ts (NestJS)
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import * as path from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  
  // 정적 파일 제공
  app.useStaticAssets(path.join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/'
  })
  
  // CORS 설정
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
  
  await app.listen(3001)
}
```

**완료 기준:**
- [ ] 업로드된 이미지 URL로 접근 가능
- [ ] CORS 설정 완료
- [ ] API 문서 작성 (Swagger 선택적)

#### 4.2 Phase 1 테스트 & 배포

**테스트 항목:**
- [ ] 카카오 로그인 → 역할 선택 → 작가 프로필 생성 → 포트폴리오 업로드 (전체 플로우)
- [ ] 클라이언트로 가입 → 작가 목록 조회 → 작가 상세 페이지
- [ ] 이미지 업로드 및 조회
- [ ] JWT 인증 동작

**배포:**
```bash
# 백엔드 빌드
cd backend
npm run build

# 프론트엔드 빌드
cd ../frontend
npm run build

# PM2로 실행
pm2 start ecosystem.config.js
pm2 save
```

---

## 🚀 Phase 2: 핵심 기능 (Week 9-16)

### Week 9-10: 1:1 채팅 시스템

#### 5.1 채팅방 생성

```typescript
// chat/chat.service.ts
@Injectable()
export class ChatService {
  async createRoom(userId: string, targetUserId: string) {
    // 기존 채팅방 확인
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        members: {
          every: {
            userId: { in: [userId, targetUserId] }
          }
        }
      }
    })
    
    if (existing) return existing
    
    // 새 채팅방 생성
    return this.prisma.chatRoom.create({
      data: {
        members: {
          create: [
            { userId },
            { userId: targetUserId }
          ]
        }
      }
    })
  }
  
  async getRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: { userId }
        },
        status: 'ACTIVE'
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                profileImage: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    })
  }
}
```

#### 5.2 Socket.IO 게이트웨이

```typescript
// chat/chat.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server
  
  constructor(
    private chatService: ChatService,
    private prisma: PrismaService
  ) {}
  
  // 연결 시 인증
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token
      const payload = this.jwtService.verify(token)
      client.data.userId = payload.sub
      
      // 사용자의 모든 채팅방에 join
      const rooms = await this.chatService.getRooms(payload.sub)
      rooms.forEach(room => {
        client.join(room.id)
      })
      
      console.log(`User ${payload.sub} connected`)
    } catch (error) {
      client.disconnect()
    }
  }
  
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ) {
    // 권한 확인
    const member = await this.prisma.chatRoomMember.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId: data.roomId,
          userId: client.data.userId
        }
      }
    })
    
    if (!member) {
      return { error: '권한이 없습니다' }
    }
    
    client.join(data.roomId)
    
    // 읽음 처리
    await this.prisma.chatRoomMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() }
    })
    
    return { success: true }
  }
  
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string; type?: MessageType }
  ) {
    // 메시지 저장
    const message = await this.prisma.message.create({
      data: {
        chatRoomId: data.roomId,
        senderId: client.data.userId,
        content: data.content,
        type: data.type || 'TEXT'
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            profileImage: true
          }
        }
      }
    })
    
    // 채팅방 lastMessageAt 업데이트
    await this.prisma.chatRoom.update({
      where: { id: data.roomId },
      data: { lastMessageAt: new Date() }
    })
    
    // 방의 모든 멤버에게 전송
    this.server.to(data.roomId).emit('message_received', message)
    
    // 오프라인 멤버에게 알림
    const members = await this.prisma.chatRoomMember.findMany({
      where: {
        chatRoomId: data.roomId,
        userId: { not: client.data.userId }
      },
      include: { user: true }
    })
    
    // TODO: 알림 발송
    
    return message
  }
  
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean }
  ) {
    client.to(data.roomId).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping
    })
  }
}
```

#### 5.3 프론트엔드 채팅 UI

```typescript
// hooks/useSocket.ts
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    
    const newSocket = io('http://localhost:3001/chat', {
      auth: { token }
    })
    
    setSocket(newSocket)
    
    return () => {
      newSocket.disconnect()
    }
  }, [])
  
  return socket
}

// app/chat/[roomId]/page.tsx
'use client'

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  const socket = useSocket()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  
  useEffect(() => {
    if (!socket) return
    
    // 방 참가
    socket.emit('join_room', { roomId: params.roomId })
    
    // 메시지 수신
    socket.on('message_received', (message) => {
      setMessages(prev => [...prev, message])
    })
    
    // 타이핑 표시
    socket.on('user_typing', (data) => {
      // TODO: 타이핑 표시 UI
    })
    
    return () => {
      socket.off('message_received')
      socket.off('user_typing')
    }
  }, [socket, params.roomId])
  
  const sendMessage = () => {
    if (!input.trim() || !socket) return
    
    socket.emit('send_message', {
      roomId: params.roomId,
      content: input
    })
    
    setInput('')
  }
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <div key={msg.id} className={msg.senderId === myUserId ? 'text-right' : 'text-left'}>
            <div className="inline-block bg-blue-500 text-white rounded px-4 py-2">
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="메시지를 입력하세요..."
        />
        <button onClick={sendMessage}>전송</button>
      </div>
    </div>
  )
}
```

**완료 기준:**
- [ ] Socket.IO 서버 동작
- [ ] 채팅방 생성 API
- [ ] 실시간 메시지 송수신
- [ ] 읽음 표시
- [ ] 타이핑 표시
- [ ] 프론트엔드 채팅 UI

---

### Week 11-12: 거래 관리 시스템

#### 6.1 거래 요청 생성

```typescript
// transactions/transactions.service.ts
@Injectable()
export class TransactionsService {
  async createRequest(clientId: string, dto: CreateTransactionDto) {
    // 채팅방이 있는지 확인
    let chatRoom = await this.prisma.chatRoom.findFirst({
      where: {
        members: {
          every: {
            userId: { in: [clientId, dto.artistId] }
          }
        }
      }
    })
    
    // 없으면 생성
    if (!chatRoom) {
      chatRoom = await this.prisma.chatRoom.create({
        data: {
          members: {
            create: [
              { userId: clientId },
              { userId: dto.artistId }
            ]
          }
        }
      })
    }
    
    // 거래 생성
    const transaction = await this.prisma.transaction.create({
      data: {
        clientId,
        artistId: dto.artistId,
        chatRoomId: chatRoom.id,
        title: dto.title,
        description: dto.description,
        status: 'REQUESTED'
      }
    })
    
    // 시스템 메시지 전송
    await this.prisma.message.create({
      data: {
        chatRoomId: chatRoom.id,
        senderId: clientId,
        type: 'SYSTEM',
        content: `새 의뢰가 요청되었습니다: ${dto.title}`
      }
    })
    
    // 알림 발송
    // TODO: 작가에게 알림
    
    return transaction
  }
  
  async updateStatus(transactionId: string, userId: string, status: TransactionStatus) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId }
    })
    
    if (!transaction) {
      throw new NotFoundException()
    }
    
    // 권한 확인
    if (transaction.artistId !== userId && transaction.clientId !== userId) {
      throw new ForbiddenException()
    }
    
    // 상태 전환 검증
    if (!this.canTransition(transaction.status, status)) {
      throw new BadRequestException('잘못된 상태 전환입니다')
    }
    
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        ...(status === 'ACCEPTED' && { acceptedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    })
  }
  
  private canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    const transitions = {
      REQUESTED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['REVIEWED'],
      REVIEWED: [],
      CANCELLED: []
    }
    
    return transitions[from]?.includes(to) || false
  }
}
```

**프론트엔드:**

```typescript
// app/artists/[id]/request/page.tsx
'use client'

export default function RequestPage({ params }) {
  const { register, handleSubmit } = useForm()
  
  const onSubmit = async (data) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        artistId: params.id,
        ...data
      })
    })
    
    const transaction = await res.json()
    router.push(`/chat/${transaction.chatRoomId}`)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>의뢰 요청</h1>
      <input {...register('title')} placeholder="제목" required />
      <textarea {...register('description')} placeholder="상세 내용" required />
      <button type="submit">요청 보내기</button>
    </form>
  )
}

// components/TransactionStatusBadge.tsx
export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const labels = {
    REQUESTED: '의뢰 요청',
    ACCEPTED: '수락됨',
    IN_PROGRESS: '작업중',
    COMPLETED: '완료',
    REVIEWED: '평가완료',
    CANCELLED: '취소됨'
  }
  
  return <span className={`badge ${status}`}>{labels[status]}</span>
}
```

**완료 기준:**
- [ ] 거래 요청 생성 API
- [ ] 거래 상태 변경 API
- [ ] 상태 전환 검증
- [ ] 시스템 메시지 전송
- [ ] 프론트엔드 의뢰 요청 폼
- [ ] 거래 상태 표시 UI

---

### Week 13-14: 후기 시스템

#### 7.1 후기 작성

```typescript
// reviews/reviews.service.ts
@Injectable()
export class ReviewsService {
  async create(userId: string, dto: CreateReviewDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: {
        client: true,
        artist: true
      }
    })
    
    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다')
    }
    
    if (transaction.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 거래만 후기를 작성할 수 있습니다')
    }
    
    // 작성자와 대상 확인
    let type: ReviewType
    let targetId: string
    
    if (transaction.clientId === userId) {
      type = 'CLIENT_TO_ARTIST'
      targetId = transaction.artistId
    } else if (transaction.artistId === userId) {
      type = 'ARTIST_TO_CLIENT'
      targetId = transaction.clientId
    } else {
      throw new ForbiddenException()
    }
    
    // 이미 작성했는지 확인
    const existing = await this.prisma.review.findUnique({
      where: {
        transactionId_type: {
          transactionId: dto.transactionId,
          type
        }
      }
    })
    
    if (existing) {
      throw new BadRequestException('이미 후기를 작성했습니다')
    }
    
    // 후기 생성
    const review = await this.prisma.review.create({
      data: {
        transactionId: dto.transactionId,
        type,
        authorId: userId,
        targetId,
        rating: dto.rating,
        content: dto.content
      }
    })
    
    // 평균 평점 업데이트 (작가에게만)
    if (type === 'CLIENT_TO_ARTIST') {
      await this.updateArtistRating(targetId)
    }
    
    // 양측 모두 후기 작성 완료 시 거래 상태 변경
    const reviewCount = await this.prisma.review.count({
      where: { transactionId: dto.transactionId }
    })
    
    if (reviewCount === 2) {
      await this.prisma.transaction.update({
        where: { id: dto.transactionId },
        data: { status: 'REVIEWED' }
      })
    }
    
    return review
  }
  
  private async updateArtistRating(artistId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        targetId: artistId,
        type: 'CLIENT_TO_ARTIST'
      },
      select: { rating: true }
    })
    
    if (reviews.length === 0) return
    
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    await this.prisma.artistProfile.update({
      where: { userId: artistId },
      data: { averageRating: avgRating }
    })
  }
}
```

**프론트엔드:**

```typescript
// app/transactions/[id]/review/page.tsx
'use client'

export default function ReviewPage({ params }) {
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  
  const handleSubmit = async () => {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: params.id,
        rating,
        content
      })
    })
    
    router.push('/transactions')
  }
  
  return (
    <div>
      <h1>후기 작성</h1>
      
      <div>
        <label>별점</label>
        <div>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={star <= rating ? 'text-yellow-500' : 'text-gray-300'}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="후기를 작성해주세요"
      />
      
      <button onClick={handleSubmit}>후기 등록</button>
    </div>
  )
}
```

**완료 기준:**
- [ ] 후기 작성 API
- [ ] 중복 작성 방지
- [ ] 평균 평점 자동 계산
- [ ] 양측 후기 완료 시 상태 변경
- [ ] 프론트엔드 별점 UI
- [ ] 작가 프로필에 후기 목록 표시

---

### Week 15-16: Phase 2 마무리

**테스트 항목:**
- [ ] 전체 거래 플로우 (의뢰 요청 → 수락 → 채팅 → 완료 → 후기)
- [ ] 실시간 채팅 동작
- [ ] 파일 첨부 기능
- [ ] 거래 상태 변경
- [ ] 후기 작성 및 평점 반영

**버그 수정 및 개선:**
- [ ] 에러 처리 강화
- [ ] Validation 보완
- [ ] UI/UX 개선

---

## 📢 Phase 3: 부가 기능 (Week 17-20)

### Week 17-18: 알림 시스템

#### 8.1 인앱 알림

```typescript
// notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  async create(data: CreateNotificationDto) {
    // 사용자 설정 확인
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { userId: data.userId }
    })
    
    if (!settings?.enableInApp) return
    
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        metadata: data.metadata
      }
    })
    
    // 실시간 푸시 (Socket.IO)
    this.notificationGateway.sendToUser(data.userId, notification)
    
    return notification
  }
  
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }
}

// notifications/notifications.gateway.ts
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server
  
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification)
  }
  
  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token
    const payload = this.jwtService.verify(token)
    
    // 사용자 룸에 참가
    client.join(`user:${payload.sub}`)
  }
}
```

#### 8.2 이메일 알림

```typescript
// notifications/email.service.ts
import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private transporter
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }
  
  async send(params: {
    to: string
    subject: string
    html: string
  }) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html
    })
  }
  
  async sendTransactionRequest(user: any, transaction: any) {
    const html = `
      <h1>새로운 의뢰 요청이 도착했습니다</h1>
      <p>${transaction.title}</p>
      <a href="${process.env.FRONTEND_URL}/transactions/${transaction.id}">확인하기</a>
    `
    
    await this.send({
      to: user.email,
      subject: '새로운 의뢰 요청',
      html
    })
  }
}
```

#### 8.3 PWA 푸시 알림

```typescript
// notifications/push.service.ts
import * as webpush from 'web-push'

@Injectable()
export class PushService {
  constructor(private prisma: PrismaService) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
  
  async subscribe(userId: string, subscription: PushSubscription) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      update: {
        lastUsedAt: new Date()
      }
    })
  }
  
  async send(userId: string, payload: any) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId }
    })
    
    const promises = subscriptions.map(sub => 
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as any
        },
        JSON.stringify(payload)
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

// notifications/notifications.controller.ts
@Controller('notifications')
export class NotificationsController {
  @Post('subscribe')
  async subscribe(@CurrentUser() user: User, @Body() subscription: any) {
    return this.pushService.subscribe(user.id, subscription)
  }
}
```

**프론트엔드:**

```typescript
// public/sw.js
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
  
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.openWindow(url)
  )
})

// hooks/useNotifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const socket = useSocket()
  
  useEffect(() => {
    if (!socket) return
    
    socket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev])
      
      // 브라우저 알림
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.content
        })
      }
    })
    
    return () => {
      socket.off('notification')
    }
  }, [socket])
  
  const requestPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      })
      
      // 백엔드에 구독 정보 전송
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      })
    }
  }
  
  return { notifications, requestPermission }
}
```

**완료 기준:**
- [ ] 인앱 알림 실시간 수신
- [ ] 이메일 알림 발송
- [ ] PWA 푸시 알림 동작
- [ ] 알림 목록 페이지
- [ ] 알림 설정 페이지
- [ ] 읽음 표시

---

### Week 19-20: Phase 3 마무리 & PWA 설정

#### 9.1 PWA Manifest

```json
// public/manifest.json
{
  "name": "크리에이터 마켓플레이스",
  "short_name": "크마플",
  "description": "작가와 클라이언트를 연결하는 커미션 플랫폼",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 9.2 Service Worker 등록

```typescript
// app/layout.tsx
'use client'

export default function RootLayout({ children }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])
  
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**완료 기준:**
- [ ] PWA 설치 가능
- [ ] 오프라인 기본 페이지
- [ ] 홈 화면 추가 프롬프트

---

## 🧪 Phase 4: 테스트 & 최적화 (Week 21-24)

### Week 21: 통합 테스트

#### 테스트 시나리오

**시나리오 1: 작가 가입 → 포트폴리오 등록**
1. 카카오 로그인
2. 작가 역할 선택
3. 프로필 작성 (소개, 전문분야, 가격대)
4. 포트폴리오 5장 업로드
5. 작가 목록에 노출 확인

**시나리오 2: 의뢰 요청 → 거래 완료 → 후기**
1. 클라이언트로 로그인
2. 작가 검색 및 선택
3. 의뢰 요청 작성 및 전송
4. 작가 계정으로 로그인
5. 의뢰 수락
6. 채팅으로 협의
7. 거래 완료 처리
8. 양측 후기 작성
9. 평점 반영 확인

**시나리오 3: 실시간 채팅**
1. 두 개의 브라우저/탭에서 각각 로그인
2. 채팅방 생성
3. 메시지 실시간 송수신 확인
4. 읽음 표시 확인
5. 타이핑 표시 확인

**시나리오 4: 알림 시스템**
1. 의뢰 요청 시 알림 발송 확인
2. 인앱 알림 수신
3. 이메일 수신 확인
4. PWA 푸시 알림 확인

---

### Week 22: 성능 최적화

#### 10.1 Database Optimization

```bash
# 인덱스 추가 (migration)
npx prisma migrate dev --name add_indexes
```

```prisma
// schema.prisma에 인덱스 추가
@@index([role, status])
@@index([chatRoomId, createdAt])
@@index([userId, isRead, createdAt])
```

#### 10.2 API 응답 최적화

```typescript
// Prisma select 최적화
const artists = await this.prisma.user.findMany({
  where: { role: 'ARTIST' },
  select: {
    id: true,
    nickname: true,
    profileImage: true,
    artistProfile: {
      select: {
        bio: true,
        averageRating: true,
        portfolios: {
          take: 3,
          select: {
            imageUrl: true
          }
        }
      }
    }
  }
})
```

#### 10.3 이미지 최적화

```typescript
// Sharp로 여러 사이즈 생성
async uploadPortfolio(file: Express.Multer.File): Promise<string> {
  const filename = `${Date.now()}`
  
  // 원본
  await sharp(file.buffer)
    .webp({ quality: 90 })
    .toFile(`${this.UPLOAD_DIR}/portfolio/${filename}-original.webp`)
  
  // 썸네일
  await sharp(file.buffer)
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(`${this.UPLOAD_DIR}/portfolio/${filename}-thumb.webp`)
  
  return `${this.STORAGE_BASE_URL}/uploads/portfolio/${filename}-original.webp`
}
```

**완료 기준:**
- [ ] 모든 쿼리 < 500ms
- [ ] 이미지 최적화 (WebP, 리사이징)
- [ ] N+1 쿼리 제거
- [ ] Database 인덱스 추가

---

### Week 23: 보안 강화

#### 11.1 Rate Limiting

```typescript
// main.ts
import { ThrottlerModule } from '@nestjs/throttler'

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10
    })
  ]
})

// 특정 엔드포인트에 적용
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 1분에 5회
@Post('upload')
async upload() {}
```

#### 11.2 Input Validation

```typescript
// dto/create-transaction.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator'

export class CreateTransactionDto {
  @IsUUID()
  artistId: string
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string
}
```

#### 11.3 XSS 방지

```typescript
// main.ts
import * as helmet from 'helmet'

app.use(helmet())
```

**완료 기준:**
- [ ] Rate Limiting 적용
- [ ] 모든 DTO Validation
- [ ] Helmet 적용
- [ ] CORS 설정 확인
- [ ] JWT 만료 시간 설정

---

### Week 24: 배포 준비

#### 12.1 환경 변수 설정

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@localhost:5432/creator_marketplace"
JWT_SECRET="your-secret-key"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CALLBACK_URL="https://yourdomain.com/api/auth/kakao/callback"
STORAGE_BASE_URL="https://yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
```

#### 12.2 PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'creator-marketplace-api',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log'
    },
    {
      name: 'creator-marketplace-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './frontend',
      instances: 1,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

#### 12.3 배포 스크립트

```bash
#!/bin/bash
# deploy.sh

echo "Starting deployment..."

# 백엔드 빌드
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# 프론트엔드 빌드
cd ../frontend
npm install
npm run build

# PM2 재시작
cd ..
pm2 restart ecosystem.config.js --env production
pm2 save

echo "Deployment complete!"
```

**완료 기준:**
- [ ] Production 환경 변수 설정
- [ ] Database migration 적용
- [ ] PM2로 프로세스 실행
- [ ] Nginx 설정 완료
- [ ] HTTPS 인증서 적용 (Let's Encrypt)
- [ ] 모니터링 설정

---

## 📊 MVP 출시 체크리스트

### 기능 완성도
- [ ] 카카오 로그인
- [ ] 작가/클라이언트 역할 선택
- [ ] 작가 프로필 생성 (포트폴리오 5장 필수)
- [ ] 작가 검색 및 목록
- [ ] 1:1 실시간 채팅
- [ ] 의뢰 요청 → 수락 → 진행 → 완료
- [ ] 후기 시스템 (양방향)
- [ ] 알림 (인앱/이메일/푸시)

### 보안
- [ ] HTTPS 적용
- [ ] JWT 인증
- [ ] Rate Limiting
- [ ] XSS 방지 (Helmet)
- [ ] Input Validation
- [ ] CORS 설정

### 성능
- [ ] Database 인덱스
- [ ] 이미지 최적화
- [ ] API 응답 속도 < 500ms
- [ ] N+1 쿼리 해결

### 법적
- [ ] 개인정보 처리방침
- [ ] 이용약관
- [ ] 쿠키 정책

### 운영
- [ ] 에러 로깅 (Winston)
- [ ] PM2 모니터링
- [ ] Database 백업 스크립트
- [ ] 배포 자동화 스크립트

---

## 🚀 Phase 2 이후 확장 계획

### Phase 2: 수익화 (Month 7-9)
- [ ] 토스페이먼츠 연동
- [ ] 에스크로 시스템 구축
- [ ] 거래 수수료 정산
- [ ] 통신판매업 신고

### Phase 3: 커뮤니티 (Month 10-12)
- [ ] 자유게시판
- [ ] 작가 간 네트워킹
- [ ] 이벤트/공모전

### Phase 4: 고도화 (Month 13+)
- [ ] 태그 기반 검색
- [ ] 필터링 (가격대, 평점, 마감여부)
- [ ] AI 작가 추천
- [ ] 포트폴리오 템플릿

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-02-04  
**작성자**: Sisyphus (OhMyClaude Code)
