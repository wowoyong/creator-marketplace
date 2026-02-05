import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(userId: string, targetUserId: string) {
    // 기존 1:1 채팅방 확인
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, nickname: true, profileImage: true },
            },
          },
        },
      },
    });

    if (existing) return existing;

    return this.prisma.chatRoom.create({
      data: {
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, nickname: true, profileImage: true },
            },
          },
        },
      },
    });
  }

  async getRooms(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        members: { some: { userId } },
        status: 'ACTIVE',
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, nickname: true, profileImage: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        transaction: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    });
  }

  async getMessages(roomId: string, userId: string, cursor?: string, take = 50) {
    // 권한 확인
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId: roomId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('채팅방에 접근할 수 없습니다');
    }

    const messages = await this.prisma.message.findMany({
      where: { chatRoomId: roomId },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, nickname: true, profileImage: true },
        },
      },
    });

    // 읽음 처리
    await this.prisma.chatRoomMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });

    return messages.reverse();
  }

  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' = 'TEXT',
    fileUrl?: string,
  ) {
    const message = await this.prisma.message.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
        type,
        fileUrl,
      },
      include: {
        sender: {
          select: { id: true, nickname: true, profileImage: true },
        },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async validateMember(roomId: string, userId: string) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId: roomId, userId } },
    });
    return !!member;
  }

  async markAsRead(roomId: string, userId: string) {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { chatRoomId_userId: { chatRoomId: roomId, userId } },
    });
    if (!member) return;

    await this.prisma.chatRoomMember.update({
      where: { id: member.id },
      data: { lastReadAt: new Date() },
    });
  }
}
