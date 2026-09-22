import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import { CreateTeamBody, ReplaceTeamBody, TeamListQuery, UpdateTeamBody } from './teams.schema';

export class TeamsService {
  async list(query: TeamListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TeamWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.team.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'asc' } }),
      prisma.team.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string) {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw Errors.notFound('Team');
    }
    return team;
  }

  async create(input: CreateTeamBody, actorId: string) {
    const team = await prisma.team.create({
      data: { name: input.name, description: input.description, leaderId: input.leaderId },
    });
    await recordAuditLog({ actorId, action: 'CREATE_TEAM', entity: 'Team', entityId: team.id, after: team });
    return team;
  }

  async replace(id: string, input: ReplaceTeamBody, actorId: string) {
    const before = await this.getById(id);
    const team = await prisma.team.update({
      where: { id },
      data: { name: input.name, description: input.description, leaderId: input.leaderId, status: input.status },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_TEAM', entity: 'Team', entityId: id, before, after: team });
    return team;
  }

  async update(id: string, input: UpdateTeamBody, actorId: string) {
    const before = await this.getById(id);
    const team = await prisma.team.update({ where: { id }, data: input });
    await recordAuditLog({ actorId, action: 'UPDATE_TEAM', entity: 'Team', entityId: id, before, after: team });
    return team;
  }

  async remove(id: string, actorId: string) {
    const before = await this.getById(id);

    const criticalRobots = await prisma.robot.count({
      where: { teamId: id, status: { in: ['RUNNING', 'ASSIGNED'] } },
    });
    if (criticalRobots > 0) {
      throw Errors.conflict(
        'Team cannot be deleted while it has robots with critical operations in progress.',
        'TEAM_HAS_ACTIVE_OPERATIONS',
      );
    }

    await prisma.team.delete({ where: { id } });
    await recordAuditLog({ actorId, action: 'DELETE_TEAM', entity: 'Team', entityId: id, before });
  }

  async listMembers(teamId: string, page: number, limit: number) {
    await this.getById(teamId);
    const [memberships, total] = await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId },
        include: { user: true },
        ...toSkipTake(page, limit),
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.teamMember.count({ where: { teamId } }),
    ]);
    return { items: memberships.map((m) => m.user), pagination: paginationMeta(page, limit, total) };
  }

  async addMember(teamId: string, userId: string, actorId: string) {
    await this.getById(teamId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Errors.notFound('User');
    }

    const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (existing) {
      throw Errors.conflict('User is already a member of this team.', 'TEAM_MEMBER_ALREADY_EXISTS');
    }

    const member = await prisma.teamMember.create({ data: { teamId, userId } });
    await recordAuditLog({ actorId, action: 'ADD_TEAM_MEMBER', entity: 'Team', entityId: teamId, after: member });
    return member;
  }

  async removeMember(teamId: string, userId: string, actorId: string) {
    await this.getById(teamId);
    const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (!existing) {
      throw Errors.notFound('TeamMember');
    }
    await prisma.teamMember.delete({ where: { id: existing.id } });
    await recordAuditLog({ actorId, action: 'REMOVE_TEAM_MEMBER', entity: 'Team', entityId: teamId, before: existing });
  }
}
