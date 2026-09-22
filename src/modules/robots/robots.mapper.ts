import { Robot } from '@prisma/client';

export function toRobotPublic(robot: Robot) {
  return {
    id: robot.id,
    serialNumber: robot.serialNumber,
    name: robot.name,
    model: robot.model,
    status: robot.status,
    batteryLevel: robot.batteryLevel,
    latitude: robot.latitude,
    longitude: robot.longitude,
    teamId: robot.teamId,
    lastSeenAt: robot.lastSeenAt ? robot.lastSeenAt.toISOString() : null,
    createdAt: robot.createdAt.toISOString(),
    updatedAt: robot.updatedAt.toISOString(),
  };
}
