import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import type { User } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.createRequest(user.id, dto);
  }

  @Get()
  async getMyTransactions(
    @CurrentUser() user: User,
    @Query('role') role: 'client' | 'artist' = 'client',
  ) {
    return this.transactionsService.getMyTransactions(user.id, role);
  }

  @Get(':id')
  async getTransaction(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.transactionsService.getTransaction(id, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(id, user.id, dto.status);
  }
}
