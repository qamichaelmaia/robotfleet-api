import { Team } from '@prisma/client';

export function toTeamPublic(team: Team) {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    leaderId: team.leaderId,
    status: team.status,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}
