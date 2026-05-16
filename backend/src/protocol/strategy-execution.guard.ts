import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { WalletAuthService } from "../auth/wallet-auth.service";

@Injectable()
export class StrategyExecutionGuard implements CanActivate {
  constructor(@Inject(WalletAuthService) private readonly auth: WalletAuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const workerSecret = this.firstHeader(request, "x-strategy-worker-secret", "x-worker-secret");
    if (workerSecret && this.matchesWorkerSecret(workerSecret)) {
      request.strategyActor = { worker: true };
      return true;
    }
    try {
      const walletAddress = this.auth.authenticate(request.headers.authorization);
      request.walletAddress = walletAddress;
      request.strategyActor = { walletAddress, worker: false };
      return true;
    } catch {
      throw new UnauthorizedException("Strategy execution requires an admin wallet bearer token or configured worker secret.");
    }
  }

  private firstHeader(request: any, ...names: string[]) {
    for (const name of names) {
      const value = request.headers?.[name];
      if (Array.isArray(value)) return value[0];
      if (typeof value === "string") return value;
    }
    return undefined;
  }

  private matchesWorkerSecret(value: string) {
    const expected = process.env.STRATEGY_WORKER_SECRET;
    if (!expected || value.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  }
}
