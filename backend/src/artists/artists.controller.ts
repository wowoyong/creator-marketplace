import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { CreateArtistProfileDto } from './dto/create-artist-profile.dto';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';
import { GetArtistsDto } from './dto/get-artists.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private artistsService: ArtistsService) {}

  @Get()
  async findAll(@Query() query: GetArtistsDto) {
    return this.artistsService.findAll(query);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.artistsService.getProfile(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async createProfile(@CurrentUser() user: User, @Body() dto: CreateArtistProfileDto) {
    return this.artistsService.createProfile(user.id, dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateArtistProfileDto) {
    return this.artistsService.updateProfile(user.id, dto);
  }
}
