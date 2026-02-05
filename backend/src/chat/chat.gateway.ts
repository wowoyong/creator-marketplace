import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string[]>(); // userId -> socketIds

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // 사용자의 모든 채팅방에 join
      const rooms = await this.chatService.getRooms(payload.sub);
      rooms.forEach((room) => {
        client.join(room.id);
      });

      // 연결된 사용자 추적
      const existing = this.connectedUsers.get(payload.sub) || [];
      existing.push(client.id);
      this.connectedUsers.set(payload.sub, existing);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.connectedUsers.get(userId) || [];
      const remaining = sockets.filter((id) => id !== client.id);
      if (remaining.length === 0) {
        this.connectedUsers.delete(userId);
      } else {
        this.connectedUsers.set(userId, remaining);
      }
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    const isMember = await this.chatService.validateMember(data.roomId, userId);

    if (!isMember) {
      return { error: '권한이 없습니다' };
    }

    client.join(data.roomId);
    await this.chatService.markAsRead(data.roomId, userId);

    return { success: true };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE';
      fileUrl?: string;
    },
  ) {
    const userId = client.data.userId;
    const isMember = await this.chatService.validateMember(data.roomId, userId);

    if (!isMember) {
      return { error: '권한이 없습니다' };
    }

    const message = await this.chatService.saveMessage(
      data.roomId,
      userId,
      data.content,
      data.type || 'TEXT',
      data.fileUrl,
    );

    this.server.to(data.roomId).emit('message_received', message);

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    client.to(data.roomId).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    await this.chatService.markAsRead(data.roomId, client.data.userId);
    client.to(data.roomId).emit('messages_read', {
      userId: client.data.userId,
      roomId: data.roomId,
    });
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  sendToRoom(roomId: string, event: string, data: unknown) {
    this.server.to(roomId).emit(event, data);
  }
}
