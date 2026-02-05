import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';
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
