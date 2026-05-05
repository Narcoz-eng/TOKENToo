import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";

const buckets = new Map<string, { count: number; resetsAt: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path ?? request.url ?? "unknown";
    const ip = request.headers["x-forwarded-for"]?.toString().split(",")[0] ?? request.ip ?? "local";
    const key = `${ip}:${request.method}:${route}`;
    const now = Date.now();
    const limit = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 120);
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetsAt < now) {
      buckets.set(key, { count: 1, resetsAt: now + 60_000 });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > limit) throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
