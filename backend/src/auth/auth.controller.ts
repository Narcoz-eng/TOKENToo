import { Body, Controller, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { WalletAuthService } from "./wallet-auth.service";

const challengeSchema = z.object({ walletAddress: z.string().min(32) });
const loginSchema = z.object({
  walletAddress: z.string().min(32),
  message: z.string().min(20),
  signature: z.string().min(32),
  challengeToken: z.string().min(20)
});

@Controller("auth")
export class AuthController {
  constructor(@Inject(WalletAuthService) private readonly auth: WalletAuthService) {}

  @Post("challenge")
  challenge(@Body() body: unknown) {
    const input = challengeSchema.parse(body);
    return this.auth.createChallenge(input.walletAddress);
  }

  @Post("login")
  login(@Body() body: unknown) {
    return this.auth.verifyLogin(loginSchema.parse(body));
  }
}
