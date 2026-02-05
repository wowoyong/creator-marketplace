import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePortfolioDto) {
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (!artistProfile) {
      throw new BadRequestException('작가 프로필이 없습니다');
    }

    const count = await this.prisma.portfolio.count({
      where: { artistProfileId: artistProfile.id },
    });

    if (count >= 20) {
      throw new BadRequestException('포트폴리오는 최대 20개까지 등록할 수 있습니다');
    }

    return this.prisma.portfolio.create({
      data: {
        artistProfileId: artistProfile.id,
        imageUrl: dto.imageUrl,
        title: dto.title,
        description: dto.description,
        displayOrder: count,
      },
    });
  }

  async findByArtist(artistProfileId: string) {
    return this.prisma.portfolio.findMany({
      where: { artistProfileId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async delete(userId: string, portfolioId: string) {
    const artistProfile = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (!artistProfile) {
      throw new NotFoundException('작가 프로필을 찾을 수 없습니다');
    }

    return this.prisma.portfolio.delete({
      where: {
        id: portfolioId,
        artistProfileId: artistProfile.id,
      },
    });
  }
}
