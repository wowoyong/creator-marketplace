import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import type { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto) {
    // 사용자 알림 설정 확인
    const settings = await this.getOrCreateSettings(dto.userId);

    if (!settings.enableInApp) return null;

    // 타입별 설정 확인
    if (this.isMessageType(dto.type) && !settings.notifyOnMessage) return null;
    if (this.isTransactionType(dto.type) && !settings.notifyOnTransaction)
      return null;
    if (dto.type === 'REVIEW_RECEIVED' && !settings.notifyOnReview) return null;

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        metadata: dto.metadata || undefined,
        sentChannels: ['IN_APP'],
      },
    });

    // 실시간 전송
    this.gateway.sendToUser(dto.userId, notification);

    // 읽지 않은 알림 수 전송
    const unreadCount = await this.getUnreadCount(dto.userId);
    this.gateway.sendUnreadCount(dto.userId, unreadCount);

    return notification;
  }

  async getNotifications(userId: string, skip = 0, take = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { notifications, total };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    this.gateway.sendUnreadCount(userId, 0);

    return { success: true };
  }

  async getSettings(userId: string) {
    return this.getOrCreateSettings(userId);
  }

  async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    const settings = await this.getOrCreateSettings(userId);

    return this.prisma.notificationSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }

  private async getOrCreateSettings(userId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  private isMessageType(type: NotificationType): boolean {
    return type === 'CHAT_MESSAGE';
  }

  private isTransactionType(type: NotificationType): boolean {
    return [
      'TRANSACTION_REQUEST',
      'TRANSACTION_ACCEPT',
      'TRANSACTION_COMPLETE',
    ].includes(type);
  }

  // === 편의 메서드 (다른 모듈에서 호출) ===

  async notifyTransactionRequest(
    artistId: string,
    clientNickname: string,
    transactionTitle: string,
    transactionId: string,
  ) {
    return this.create({
      userId: artistId,
      type: 'TRANSACTION_REQUEST',
      title: '새 의뢰 요청',
      content: `${clientNickname}님이 "${transactionTitle}" 의뢰를 요청했습니다`,
      metadata: { transactionId } as Prisma.InputJsonValue,
    });
  }

  async notifyTransactionAccept(
    clientId: string,
    artistNickname: string,
    transactionTitle: string,
    transactionId: string,
  ) {
    return this.create({
      userId: clientId,
      type: 'TRANSACTION_ACCEPT',
      title: '의뢰 수락됨',
      content: `${artistNickname}님이 "${transactionTitle}" 의뢰를 수락했습니다`,
      metadata: { transactionId } as Prisma.InputJsonValue,
    });
  }

  async notifyTransactionComplete(
    clientId: string,
    artistNickname: string,
    transactionTitle: string,
    transactionId: string,
  ) {
    return this.create({
      userId: clientId,
      type: 'TRANSACTION_COMPLETE',
      title: '작업 완료',
      content: `${artistNickname}님이 "${transactionTitle}" 작업을 완료했습니다`,
      metadata: { transactionId } as Prisma.InputJsonValue,
    });
  }

  async notifyReviewReceived(
    targetId: string,
    authorNickname: string,
    rating: number,
    transactionId: string,
  ) {
    return this.create({
      userId: targetId,
      type: 'REVIEW_RECEIVED',
      title: '새 후기',
      content: `${authorNickname}님이 ${rating}점 후기를 남겼습니다`,
      metadata: { transactionId } as Prisma.InputJsonValue,
    });
  }

  async notifyChatMessage(
    userId: string,
    senderNickname: string,
    content: string,
    chatRoomId: string,
  ) {
    return this.create({
      userId,
      type: 'CHAT_MESSAGE',
      title: '새 메시지',
      content: `${senderNickname}: ${content.substring(0, 50)}`,
      metadata: { chatRoomId } as Prisma.InputJsonValue,
    });
  }
}
