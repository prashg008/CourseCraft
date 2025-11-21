import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  username: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // cast through unknown to satisfy strict no-unsafe-return checks
    return (request.user as unknown as UserPayload) ?? null;
  },
);
