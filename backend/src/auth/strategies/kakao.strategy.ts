import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get<string>('KAKAO_CLIENT_ID')!,
      callbackURL: config.get<string>('KAKAO_CALLBACK_URL')!,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { _json } = profile;
    return {
      kakaoId: profile.id,
      email: _json.kakao_account?.email,
      nickname: profile.displayName,
      profileImage: _json.properties?.profile_image,
    };
  }
}
