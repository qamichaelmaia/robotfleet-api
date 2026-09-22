import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '3000')),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtExpiresIn: Number(required('JWT_EXPIRES_IN', '900')),
  jwtRefreshExpiresIn: Number(required('JWT_REFRESH_EXPIRES_IN', '604800')),
  corsOrigin: required('CORS_ORIGIN', '*'),
  rateLimitMax: Number(required('RATE_LIMIT_MAX', '100')),
  rateLimitWindow: Number(required('RATE_LIMIT_WINDOW', '60000')),
  authRateLimitMax: Number(required('AUTH_RATE_LIMIT_MAX', '5')),
  authRateLimitWindow: Number(required('AUTH_RATE_LIMIT_WINDOW', '60000')),
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
};
