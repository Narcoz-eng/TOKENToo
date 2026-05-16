import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Connection, PublicKey } from "@solana/web3.js";
import { requireDbForWrite } from "../db/db-safety";
import { PrismaService } from "../db/prisma.service";
import { AssetStorageService } from "../generator/asset-storage.service";
import { normalizeHeliusConfig, setLastHeliusErrorCode } from "../token-scanner/helius-config";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";

export type TokenMetadataInput = {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  logoDataUri?: string;
  logoUrl?: string;
  externalUrl?: string;
  extensions?: Record<string, string | undefined>;
};

@Injectable()
export class TokenMetadataService {
  constructor(
    @Inject(AssetStorageService) private readonly storage: AssetStorageService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SolanaTransactionAdapterService) private readonly solana: SolanaTransactionAdapterService
  ) {}

  async uploadTokenLogo(input: { mint: string; logoDataUri?: string; logoUrl?: string }) {
    this.assertMint(input.mint);
    if (input.logoUrl) return input.logoUrl;
    if (!input.logoDataUri) throw new BadRequestException("Token logo upload requires logoDataUri or logoUrl.");
    return this.storage.storeFinalNftAsset(`tokens/${input.mint}/logo.svg`, input.logoDataUri);
  }

  async uploadTokenMetadataJson(input: TokenMetadataInput) {
    const image = await this.uploadTokenLogo({ mint: input.mint, logoDataUri: input.logoDataUri, logoUrl: input.logoUrl });
    return this.storage.storeFinalNftMetadata(`tokens/${input.mint}/metadata.json`, {
      name: input.name,
      symbol: input.symbol,
      description: input.description ?? `${input.name} token metadata for Phew.run.`,
      image,
      external_url: input.externalUrl,
      extensions: input.extensions ?? {}
    });
  }

  async createOrUpdateTokenMetadata(input: TokenMetadataInput, walletAddress: string) {
    await requireDbForWrite(this.prisma);
    const uri = await this.uploadTokenMetadataJson(input);
    const token = await this.prisma.token.findUnique({ where: { mint: input.mint } });
    const logoUri = input.logoUrl ?? null;
    const unsignedTransaction = await this.solana.buildTokenMetadataWriteTransaction({
      walletAddress,
      mint: input.mint,
      name: input.name,
      symbol: input.symbol,
      metadataUri: uri
    });
    await this.prisma.tokenMetadataRecord.upsert({
      where: { mint: input.mint },
      update: {
        tokenId: token?.id,
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        logoUri,
        metadataUri: uri,
        provider: "metaplex-token-metadata",
        onChainWriteStatus: unsignedTransaction.base64UnsignedTransaction ? "TX_BUILT" : "PROVIDER_NOT_CONFIGURED",
        metadata: {
          ...(input.extensions ?? {}),
          metadataPda: unsignedTransaction.metadataPda,
          unsignedTransaction
        }
      },
      create: {
        tokenId: token?.id,
        mint: input.mint,
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        logoUri,
        metadataUri: uri,
        provider: "metaplex-token-metadata",
        onChainWriteStatus: unsignedTransaction.base64UnsignedTransaction ? "TX_BUILT" : "PROVIDER_NOT_CONFIGURED",
        metadata: {
          ...(input.extensions ?? {}),
          metadataPda: unsignedTransaction.metadataPda,
          unsignedTransaction
        }
      }
    });
    return {
      ok: Boolean(unsignedTransaction.base64UnsignedTransaction),
      code: unsignedTransaction.base64UnsignedTransaction ? "TOKEN_METADATA_TX_BUILT" : "PROVIDER_NOT_CONFIGURED",
      message: unsignedTransaction.base64UnsignedTransaction
        ? "Token metadata JSON is uploaded and a wallet-signed Metaplex Token Metadata write transaction is ready."
        : "Token metadata JSON is uploaded, but the on-chain write adapter requires SOLANA_TRANSACTION_PROVIDER=devnet.",
      metadataUri: uri,
      unsignedTransaction
    };
  }

  async submitTokenMetadataWrite(mint: string, input: { signedTransaction?: string; txSignature?: string }, walletAddress: string) {
    await requireDbForWrite(this.prisma);
    this.assertMint(mint);
    const record = await this.prisma.tokenMetadataRecord.findUnique({ where: { mint } });
    if (!record?.metadataUri) throw new BadRequestException("Token metadata record must be created before submit.");
    const result = await this.solana.submitAndConfirm({
      transactionId: record.id,
      signedTransaction: input.signedTransaction,
      txSignature: input.txSignature
    });
    if (!result.confirmed) {
      return this.prisma.tokenMetadataRecord.update({
        where: { mint },
        data: {
          onChainWriteStatus: result.status,
          onChainTxSignature: result.txSignature,
          verificationStatus: result.message
        }
      });
    }
    const verification = await this.solana.verifyTokenMetadataAccount({
      mint,
      expectedUri: record.metadataUri,
      expectedName: record.name,
      expectedSymbol: record.symbol
    });
    if (verification.verificationAvailable && !verification.passed) {
      await this.prisma.tokenMetadataRecord.update({
        where: { mint },
        data: {
          onChainWriteStatus: "FAILED",
          onChainTxSignature: result.txSignature,
          verificationStatus: JSON.stringify(verification.issues)
        }
      });
      throw new BadRequestException(`Token metadata transaction confirmed but verification failed: ${verification.issues.join(" ")}`);
    }
    return this.prisma.tokenMetadataRecord.update({
      where: { mint },
      data: {
        onChainWriteStatus: "CONFIRMED",
        onChainTxSignature: result.txSignature,
        indexed: verification.passed,
        verificationStatus: verification.passed ? "verified" : "confirmed_unverified",
        metadata: {
          ...this.record(record.metadata),
          submittedBy: walletAddress,
          verification
        }
      }
    });
  }

  async fetchTokenMetadata(mint: string) {
    this.assertMint(mint);
    const helius = normalizeHeliusConfig();
    if (!helius.heliusApiKey || helius.errorCode) {
      setLastHeliusErrorCode(helius.errorCode ?? "HELIUS_CONFIG_INVALID");
      return {
        ok: true,
        mint,
        metadata: null,
        indexed: false,
        code: helius.errorCode ?? "HELIUS_CONFIG_INVALID",
        warning: helius.errorMessage ?? "Helius API key is not configured; token metadata indexing status is unavailable."
      };
    }
    const legacyUrl = new URL("https://api.helius.xyz/v0/token-metadata");
    legacyUrl.searchParams.set("api-key", helius.heliusApiKey);
    const response = await fetch(legacyUrl.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mintAccounts: [mint], includeOffChain: true, disableCache: false })
    });
    if (response.status === 401 || response.status === 403) {
      setLastHeliusErrorCode("HELIUS_AUTH_FAILED");
      throw new ServiceUnavailableException({ code: "HELIUS_AUTH_FAILED", message: "Helius rejected the configured API key." });
    }
    if (response.status === 429) {
      setLastHeliusErrorCode("HELIUS_RATE_LIMITED");
      throw new ServiceUnavailableException({ code: "HELIUS_RATE_LIMITED", message: "Helius rate limit reached. Retry after the provider window resets." });
    }
    if (!response.ok) {
      setLastHeliusErrorCode("HELIUS_ERROR");
      throw new ServiceUnavailableException({ code: "HELIUS_ERROR", message: `Helius metadata lookup failed with status ${response.status}.` });
    }
    const data = await response.json();
    setLastHeliusErrorCode(undefined);
    return { ok: true, mint, metadata: data, indexed: true };
  }

  async verifyTokenMetadata(mint: string) {
    const chain = await this.fetchTokenMetadata(mint);
    if (!chain.indexed) return { ...chain, status: "created but indexing pending" };
    return { ...chain, status: "verified" };
  }

  async getTokenLogoUrl(mint: string) {
    const metadata = await this.fetchTokenMetadata(mint);
    const first = Array.isArray(metadata.metadata) ? metadata.metadata[0] : metadata.metadata;
    return first?.offChainMetadata?.metadata?.image ?? first?.onChainMetadata?.metadata?.data?.uri ?? null;
  }

  status() {
    return {
      ok: true,
      tokenMetadataAvailable: Boolean(process.env.PROGRAM_ID && (process.env.PINATA_JWT || process.env.IRYS_PRIVATE_KEY || process.env.ARWEAVE_KEY)),
      heliusAvailable: Boolean(normalizeHeliusConfig().heliusApiKey),
      storageAvailable: Boolean(process.env.PINATA_JWT),
      onChainWriteAdapter: (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "devnet",
      warning: (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "devnet" ? undefined : "On-chain token metadata write adapter requires SOLANA_TRANSACTION_PROVIDER=devnet."
    };
  }

  private assertMint(mint: string) {
    try {
      new PublicKey(mint);
    } catch {
      throw new BadRequestException("Invalid Solana mint address.");
    }
  }

  private record(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
