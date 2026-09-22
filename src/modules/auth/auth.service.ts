import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { AppError, Errors } from '../../shared/errors/app-error';
import { LoginBody, RegisterBody } from './auth.schema';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async register(input: RegisterBody) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError({
        type: 'https://api.robotfleet.dev/errors/email-already-registered',
        title: 'Email Already Registered',
        status: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        detail: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    });

    return user;
  }

  async login(input: LoginBody) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw Errors.unauthorized('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw Errors.unauthorized('Invalid email or password.');
    }

    if (user.status === 'SUSPENDED') {
      throw Errors.forbidden('User account is suspended.');
    }
    if (user.status === 'INACTIVE') {
      throw Errors.forbidden('User account is inactive.');
    }

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.app.jwt.verify(refreshToken, { key: env.jwtRefreshSecret } as never);
    } catch {
      throw Errors.unauthorized('Invalid or expired refresh token.');
    }

    if (payload.type !== 'refresh') {
      throw Errors.unauthorized('Token is not a valid refresh token.');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Errors.unauthorized('Refresh token has been revoked or expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      throw Errors.unauthorized('User no longer exists.');
    }
    if (user.status !== 'ACTIVE') {
      throw Errors.forbidden('User account is not active.');
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    }
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Errors.notFound('User');
    }
    return user;
  }

  private async issueTokens(userId: string, role: string) {
    const accessToken = this.app.jwt.sign(
      { sub: userId, role, type: 'access' },
      { expiresIn: env.jwtExpiresIn },
    );

    const refreshToken = this.app.jwt.sign(
      { sub: userId, type: 'refresh', jti: randomUUID() },
      { key: env.jwtRefreshSecret, expiresIn: env.jwtRefreshExpiresIn } as never,
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + env.jwtRefreshExpiresIn * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.jwtExpiresIn,
    };
  }
}
