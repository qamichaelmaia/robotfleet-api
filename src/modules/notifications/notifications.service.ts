import { prisma } from '../../database/prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? 'INFO',
      title: input.title,
      message: input.message,
    },
  });
}

export async function notifyRoles(roles: Array<'ADMIN' | 'MANAGER'>, title: string, message: string, type: NotificationType = 'WARNING') {
  const users = await prisma.user.findMany({ where: { role: { in: roles }, status: 'ACTIVE' } });
  await Promise.all(
    users.map((user) => createNotification({ userId: user.id, title, message, type })),
  );
}
