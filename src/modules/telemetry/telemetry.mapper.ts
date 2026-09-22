import { Telemetry } from '@prisma/client';

export function toTelemetryPublic(record: Telemetry) {
  return {
    id: record.id,
    robotId: record.robotId,
    batteryLevel: record.batteryLevel,
    temperature: record.temperature,
    latitude: record.latitude,
    longitude: record.longitude,
    speed: record.speed,
    recordedAt: record.recordedAt.toISOString(),
  };
}
