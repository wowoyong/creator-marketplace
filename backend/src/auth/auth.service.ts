import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async kakaoLogin(kakaoUser: any) {
    let user = await this.prisma.user.findUnique({
      where: { kakaoId: String(kakaoUser.kakaoId) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kakaoId: String(kakaoUser.kakaoId),
          email: kakaoUser.email,
          nickname: kakaoUser.nickname,
          profileImage: kakaoUser.profileImage,
          role: 'CLIENT',
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: true,
        clientProfile: true,
      },
    });
  }
}
