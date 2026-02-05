import { NotificationType, Prisma } from '@prisma/client';

export class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Prisma.InputJsonValue;
}
