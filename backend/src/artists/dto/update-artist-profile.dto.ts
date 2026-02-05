import { PartialType } from '@nestjs/mapped-types';
import { CreateArtistProfileDto } from './create-artist-profile.dto';

export class UpdateArtistProfileDto extends PartialType(CreateArtistProfileDto) {}
