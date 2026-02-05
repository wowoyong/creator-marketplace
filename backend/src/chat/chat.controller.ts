import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  async getRooms(@CurrentUser() user: User) {
    return this.chatService.getRooms(user.id);
  }

  @Post('rooms')
  async createRoom(
    @CurrentUser() user: User,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.chatService.createRoom(user.id, targetUserId);
  }

  @Get('rooms/:roomId/messages')
  async getMessages(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.chatService.getMessages(
      roomId,
      user.id,
      cursor,
      take ? parseInt(take) : 50,
    );
  }
}
