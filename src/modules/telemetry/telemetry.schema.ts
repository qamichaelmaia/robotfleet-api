import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const TelemetrySchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    robotId: Type.String({ format: 'uuid' }),
    batteryLevel: Type.Integer({ minimum: 0, maximum: 100 }),
    temperature: Type.Number(),
    latitude: Type.Number(),
    longitude: Type.Number(),
    speed: Type.Number({ minimum: 0 }),
    recordedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'Telemetry' },
);

export const TelemetryListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
});
export type TelemetryListQuery = Static<typeof TelemetryListQuerySchema>;

export const TelemetryListResponseSchema = paginatedResponse(TelemetrySchema);

export const CreateTelemetryBodySchema = Type.Object({
  batteryLevel: Type.Integer({ minimum: 0, maximum: 100 }),
  temperature: Type.Number({ minimum: -50, maximum: 150 }),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  speed: Type.Number({ minimum: 0, maximum: 50 }),
  recordedAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type CreateTelemetryBody = Static<typeof CreateTelemetryBodySchema>;
