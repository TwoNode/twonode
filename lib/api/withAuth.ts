import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { Platform } from "@/utils/platform";
import {
  UnauthenticatedError,
  ForbiddenError,
  EmailVerificationRequiredError,
  handleApiError,
} from "@/lib/api/errors";

export type Session<TRole extends string> = {
  sub: string;
  role: TRole;
  platform: Platform;
  emailVerified: boolean;
  mustVerifyNow: boolean;
};

type Handler<TRole extends string> = (
  req: NextRequest,
  ctx: { session: Session<TRole> },
  routeCtx?: any
) => Promise<NextResponse>;

/**
 * Wraps a route handler with session + role checks, and funnels any thrown
 * ApiError (or Prisma error) through the shared error handler — individual
 * routes never write their own try/catch for that. Generic over each
 * product's own role type (RevaRole | SurfboardRole | GBCRole, from
 * utils/platform.ts) since there's no single shared Role across products.
 */
export function withAuth<TRole extends string>(
  handler: Handler<TRole>,
  opts: { platform: Platform; roles?: TRole[]; allowUnverified?: boolean }
) {
  return async (req: NextRequest, routeCtx?: any) => {
    const context: Record<string, unknown> = {
      route: req.nextUrl.pathname,
      method: req.method,
    };
    try {
      const jwtSession = await getServerSession(opts.platform);
      if (!jwtSession) throw new UnauthenticatedError();

      const session: Session<TRole> = {
        sub: jwtSession.sub,
        role: jwtSession.role as TRole,
        platform: jwtSession.platform,
        emailVerified: jwtSession.emailVerified,
        mustVerifyNow: jwtSession.mustVerifyNow,
      };
      context.userId = session.sub;
      context.role = session.role;
      context.platform = session.platform;

      if (!opts.allowUnverified && session.mustVerifyNow && !session.emailVerified) {
        throw new EmailVerificationRequiredError();
      }

      if (opts.roles && !opts.roles.includes(session.role)) {
        throw new ForbiddenError();
      }

      return await handler(req, { session }, routeCtx);
    } catch (err) {
      return handleApiError(err, context);
    }
  };
}
