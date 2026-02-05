import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateArtistProfileDto } from './dto/create-artist-profile.dto';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';
import { GetArtistsDto } from './dto/get-artists.dto';

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreateArtistProfileDto) {
    const existing = await this.prisma.artistProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('이미 작가 프로필이 존재합니다');
    }

    return this.prisma.artistProfile.create({
      data: {
        userId,
        bio: dto.bio,
        specialties: dto.specialties,
        priceRange: dto.priceRange,
        referenceUrls: dto.referenceUrls || [],
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateArtistProfileDto) {
    return this.prisma.artistProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImage: true,
          },
        },
        portfolios: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('작가 프로필을 찾을 수 없습니다');
    }

    return profile;
  }

  async findAll(query: GetArtistsDto) {
    const { search, skip = 0, take = 20 } = query;

    return this.prisma.user.findMany({
      where: {
        role: 'ARTIST',
        status: 'ACTIVE',
        ...(search && {
          OR: [
            { nickname: { contains: search, mode: 'insensitive' as const } },
            { artistProfile: { bio: { contains: search, mode: 'insensitive' as const } } },
          ],
        }),
      },
      include: {
        artistProfile: {
          include: {
            portfolios: {
              take: 5,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        receivedReviews: {
          where: { type: 'CLIENT_TO_ARTIST' },
          select: { rating: true },
          take: 10,
        },
      },
      skip,
      take,
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: {
          include: {
            portfolios: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        receivedReviews: {
          where: { type: 'CLIENT_TO_ARTIST' },
          include: {
            author: {
              select: {
                nickname: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user || user.role !== 'ARTIST') {
      throw new NotFoundException('작가를 찾을 수 없습니다');
    }

    return user;
  }
}
