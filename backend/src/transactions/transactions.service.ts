import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import type { TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createRequest(clientId: string, dto: CreateTransactionDto) {
    // 작가 확인
    const artist = await this.prisma.user.findUnique({
      where: { id: dto.artistId },
    });
    if (!artist || artist.role !== 'ARTIST') {
      throw new BadRequestException('유효하지 않은 작가입니다');
    }

    // 채팅방 생성 또는 가져오기
    const chatRoom = await this.chatService.createRoom(clientId, dto.artistId);

    // 거래 생성
    const transaction = await this.prisma.transaction.create({
      data: {
        clientId,
        artistId: dto.artistId,
        chatRoomId: chatRoom.id,
        title: dto.title,
        description: dto.description,
        agreedPrice: dto.agreedPrice,
        status: 'REQUESTED',
      },
      include: {
        client: { select: { id: true, nickname: true, profileImage: true } },
        artist: { select: { id: true, nickname: true, profileImage: true } },
      },
    });

    // 시스템 메시지 전송
    const systemMessage = await this.chatService.saveMessage(
      chatRoom.id,
      clientId,
      `새 의뢰가 요청되었습니다: ${dto.title}`,
      'SYSTEM',
    );

    this.chatGateway.sendToRoom(chatRoom.id, 'message_received', systemMessage);
    this.chatGateway.sendToRoom(chatRoom.id, 'transaction_created', transaction);

    return transaction;
  }

  async updateStatus(
    transactionId: string,
    userId: string,
    newStatus: TransactionStatus,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다');
    }

    // 권한 확인
    if (transaction.artistId !== userId && transaction.clientId !== userId) {
      throw new ForbiddenException('이 거래에 대한 권한이 없습니다');
    }

    // 상태 전환 검증
    if (!this.canTransition(transaction.status, newStatus, userId, transaction)) {
      throw new BadRequestException('잘못된 상태 전환입니다');
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: newStatus,
        ...(newStatus === 'ACCEPTED' && { acceptedAt: new Date() }),
        ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
        ...(newStatus === 'CANCELLED' && { cancelledAt: new Date() }),
      },
      include: {
        client: { select: { id: true, nickname: true, profileImage: true } },
        artist: { select: { id: true, nickname: true, profileImage: true } },
      },
    });

    // 시스템 메시지 전송
    const statusLabels: Record<string, string> = {
      ACCEPTED: '의뢰가 수락되었습니다',
      IN_PROGRESS: '작업이 시작되었습니다',
      COMPLETED: '작업이 완료되었습니다',
      CANCELLED: '의뢰가 취소되었습니다',
    };

    if (statusLabels[newStatus]) {
      const systemMessage = await this.chatService.saveMessage(
        transaction.chatRoomId,
        userId,
        statusLabels[newStatus],
        'SYSTEM',
      );
      this.chatGateway.sendToRoom(
        transaction.chatRoomId,
        'message_received',
        systemMessage,
      );
    }

    this.chatGateway.sendToRoom(
      transaction.chatRoomId,
      'transaction_updated',
      updated,
    );

    return updated;
  }

  async getMyTransactions(userId: string, role: 'client' | 'artist') {
    const where =
      role === 'client' ? { clientId: userId } : { artistId: userId };

    return this.prisma.transaction.findMany({
      where,
      include: {
        client: { select: { id: true, nickname: true, profileImage: true } },
        artist: { select: { id: true, nickname: true, profileImage: true } },
        reviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransaction(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        client: { select: { id: true, nickname: true, profileImage: true } },
        artist: { select: { id: true, nickname: true, profileImage: true } },
        chatRoom: true,
        reviews: {
          include: {
            author: {
              select: { id: true, nickname: true, profileImage: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다');
    }

    if (transaction.clientId !== userId && transaction.artistId !== userId) {
      throw new ForbiddenException('이 거래에 대한 권한이 없습니다');
    }

    return transaction;
  }

  private canTransition(
    from: TransactionStatus,
    to: TransactionStatus,
    userId: string,
    transaction: { artistId: string; clientId: string },
  ): boolean {
    const transitions: Record<string, TransactionStatus[]> = {
      REQUESTED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      REVIEWED: [],
      CANCELLED: [],
    };

    if (!transitions[from]?.includes(to)) return false;

    // ACCEPTED, IN_PROGRESS는 작가만 가능
    if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(to)) {
      return userId === transaction.artistId;
    }

    return true;
  }
}
