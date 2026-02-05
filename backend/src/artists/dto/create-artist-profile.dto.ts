import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class CreateArtistProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @IsOptional()
  @IsString()
  priceRange?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceUrls?: string[];
}
