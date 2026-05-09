import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { WalletAuthService } from "./wallet-auth.service";

@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(@Inject(WalletAuthService) private readonly auth: WalletAuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.walletAddress = this.auth.authenticate(request.headers.authorization);
    return true;
  }
}
