import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { WalletAuthService } from "./wallet-auth.service";

@Module({
  controllers: [AuthController],
  providers: [WalletAuthService],
  exports: [WalletAuthService]
})
export class AuthModule {}
