import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import { CreateUserBody, ReplaceUserBody, UpdateUserBody, UserListQuery } from './users.schema';

const SALT_ROUNDS = 10;

export class UsersService {
  async list(query: UserListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        ...toSkipTake(page, limit),
        orderBy: { [query.sort ?? 'createdAt']: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw Errors.notFound('User');
    }
    return user;
  }

  async create(input: CreateUserBody, actorId: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw Errors.conflict('An account with this email already exists.', 'EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role ?? 'VIEWER',
      },
    });

    await recordAuditLog({ actorId, action: 'CREATE_USER', entity: 'User', entityId: user.id, after: user });
    return user;
  }

  async replace(id: string, input: ReplaceUserBody, actorId: string) {
    const before = await this.getById(id);
    const user = await prisma.user.update({
      where: { id },
      data: { name: input.name, email: input.email, role: input.role, status: input.status },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_USER', entity: 'User', entityId: id, before, after: user });
    return user;
  }

  async update(id: string, input: UpdateUserBody, actorId: string) {
    const before = await this.getById(id);
    const roleChanged = input.role !== undefined && input.role !== before.role;
    const user = await prisma.user.update({ where: { id }, data: input });
    await recordAuditLog({
      actorId,
      action: roleChanged ? 'CHANGE_ROLE' : 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      before,
      after: user,
    });
    return user;
  }

  async remove(id: string, actorId: string) {
    const before = await this.getById(id);
    await prisma.user.delete({ where: { id } });
    await recordAuditLog({ actorId, action: 'DELETE_USER', entity: 'User', entityId: id, before });
  }
}
