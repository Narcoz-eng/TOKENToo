import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual, verify } from "node:crypto";

type TokenPayload = {
  walletAddress: string;
  exp: number;
};

@Injectable()
export class WalletAuthService {
  createChallenge(walletAddress: string) {
    const wallet = this.requireWallet(walletAddress);
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const message = [
      "VaultX wallet login",
      `Wallet: ${wallet}`,
      `Nonce: ${nonce}`,
      `Expires: ${new Date(expiresAt).toISOString()}`,
      "Only sign this message on vaultx.io or your local VaultX dev server."
    ].join("\n");
    const challengeToken = this.sign({ walletAddress: wallet, exp: expiresAt, nonce });
    return { walletAddress: wallet, message, challengeToken, expiresAt };
  }

  async verifyLogin(input: { walletAddress: string; message: string; signature: string; challengeToken: string }) {
    const walletAddress = this.requireWallet(input.walletAddress);
    const challenge = this.verifySignedPayload<{ walletAddress: string; exp: number; nonce: string }>(input.challengeToken);
    if (challenge.walletAddress !== walletAddress) throw new UnauthorizedException("Challenge wallet mismatch");
    if (challenge.exp < Date.now()) throw new UnauthorizedException("Challenge expired");
    if (!input.message.includes(`Wallet: ${walletAddress}`) || !input.message.includes(`Nonce: ${challenge.nonce}`)) {
      throw new UnauthorizedException("Challenge message mismatch");
    }
    if (!(await this.verifyEd25519(walletAddress, input.message, input.signature))) throw new UnauthorizedException("Invalid wallet signature");
    return {
      walletAddress,
      accessToken: this.sign({ walletAddress, exp: Date.now() + 24 * 60 * 60 * 1000 }),
      tokenType: "Bearer",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
  }

  authenticate(authHeader?: string) {
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Missing bearer token");
    const payload = this.verifySignedPayload<TokenPayload>(token);
    if (payload.exp < Date.now()) throw new UnauthorizedException("Token expired");
    return payload.walletAddress;
  }

  private async verifyEd25519(walletAddress: string, message: string, signature: string) {
    try {
      const { default: bs58 } = await import("bs58");
      const publicKey = bs58.decode(walletAddress);
      const sig = bs58.decode(signature);
      const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKey)]);
      return verify(null, Buffer.from(message), { key: spki, format: "der", type: "spki" }, Buffer.from(sig));
    } catch {
      return false;
    }
  }

  private sign(payload: Record<string, unknown>) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this.hmac(body);
    return `${body}.${signature}`;
  }

  private verifySignedPayload<T>(token: string): T {
    const [body, signature] = token.split(".");
    if (!body || !signature) throw new UnauthorizedException("Invalid token");
    const expected = this.hmac(body);
    if (signature.length !== expected.length) throw new UnauthorizedException("Invalid token signature");
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new UnauthorizedException("Invalid token signature");
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  }

  private hmac(body: string) {
    return createHmac("sha256", process.env.WALLET_AUTH_SECRET ?? process.env.GENERATOR_SEED_SALT ?? "vaultx-dev-secret")
      .update(body)
      .digest("base64url");
  }

  private requireWallet(walletAddress: string) {
    const wallet = walletAddress?.trim();
    if (!wallet) throw new BadRequestException("walletAddress is required");
    return wallet;
  }
}
