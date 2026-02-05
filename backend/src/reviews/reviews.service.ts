import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewType } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('거래를 찾을 수 없습니다');
    }

    if (transaction.status !== 'COMPLETED' && transaction.status !== 'REVIEWED') {
      throw new BadRequestException('완료된 거래만 후기를 작성할 수 있습니다');
    }

    // 작성자와 대상 확인
    let type: ReviewType;
    let targetId: string;

    if (transaction.clientId === userId) {
      type = 'CLIENT_TO_ARTIST';
      targetId = transaction.artistId;
    } else if (transaction.artistId === userId) {
      type = 'ARTIST_TO_CLIENT';
      targetId = transaction.clientId;
    } else {
      throw new ForbiddenException('이 거래에 대한 권한이 없습니다');
    }

    // 이미 작성했는지 확인
    const existing = await this.prisma.review.findUnique({
      where: {
        transactionId_type: {
          transactionId: dto.transactionId,
          type,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('이미 후기를 작성했습니다');
    }

    // 작성자 정보
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    // 후기 생성
    const review = await this.prisma.review.create({
      data: {
        transactionId: dto.transactionId,
        type,
        authorId: userId,
        targetId,
        rating: dto.rating,
        content: dto.content,
      },
      include: {
        author: {
          select: { id: true, nickname: true, profileImage: true },
        },
        target: {
          select: { id: true, nickname: true, profileImage: true },
        },
      },
    });

    // 작가에 대한 후기일 경우 평균 평점 업데이트
    if (type === 'CLIENT_TO_ARTIST') {
      await this.updateArtistRating(targetId);
    }

    // 양측 모두 후기 작성 완료 시 거래 상태 변경
    const reviewCount = await this.prisma.review.count({
      where: { transactionId: dto.transactionId },
    });

    if (reviewCount === 2) {
      await this.prisma.transaction.update({
        where: { id: dto.transactionId },
        data: { status: 'REVIEWED' },
      });
    }

    // 알림: 대상에게 후기 알림
    await this.notificationsService.notifyReviewReceived(
      targetId,
      author?.nickname || '사용자',
      dto.rating,
      dto.transactionId,
    );

    return review;
  }

  async getByTarget(targetId: string, skip = 0, take = 20) {
    return this.prisma.review.findMany({
      where: { targetId, type: 'CLIENT_TO_ARTIST' },
      include: {
        author: {
          select: { id: true, nickname: true, profileImage: true },
        },
        transaction: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getByTransaction(transactionId: string) {
    return this.prisma.review.findMany({
      where: { transactionId },
      include: {
        author: {
          select: { id: true, nickname: true, profileImage: true },
        },
      },
    });
  }

  private async updateArtistRating(artistId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { targetId: artistId, type: 'CLIENT_TO_ARTIST' },
      select: { rating: true },
    });

    if (reviews.length === 0) return;

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.prisma.artistProfile.update({
      where: { userId: artistId },
      data: {
        averageRating: avgRating,
        totalTransactions: reviews.length,
      },
    });
  }
}
