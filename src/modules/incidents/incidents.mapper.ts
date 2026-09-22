import { Incident } from '@prisma/client';

export function toIncidentPublic(incident: Incident) {
  return {
    id: incident.id,
    robotId: incident.robotId,
    jobId: incident.jobId,
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    status: incident.status,
    createdAt: incident.createdAt.toISOString(),
    resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    resolvedBy: incident.resolvedBy,
  };
}
