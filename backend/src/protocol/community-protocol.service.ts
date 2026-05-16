import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../db/prisma.service";
import { IdentityEngineService } from "../identity-engine/identity-engine.service";
import { TokenScannerService } from "../token-scanner/token-scanner.service";
import type { TokenScan } from "../types";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { ProtocolAccountingService } from "./protocol-accounting.service";
import { StrategyEngineService } from "./strategy-engine.service";

type AccessMethod = "CREATION_FEE_SOL" | "WHALE_HOLDER" | "SUBSCRIPTION_STUDIO" | "ADMIN_GRANT";

type CreateCommunityInput = {
  tokenMint: string;
  walletAddress: string;
  accessMethod?: AccessMethod;
  paymentSignature?: string;
  idempotencyKey?: string;
  slug?: string;
  name?: string;
};

type SubmitCommunityLaunchInput = {
  signedTransaction?: string;
  txSignature?: string;
};

@Injectable()
export class CommunityProtocolService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenScannerService) private readonly scanner: TokenScannerService,
    @Inject(IdentityEngineService) private readonly identity: IdentityEngineService,
    @Inject(SolanaTransactionAdapterService) private readonly solana: SolanaTransactionAdapterService,
    @Inject(ProtocolAccountingService) private readonly accounting: ProtocolAccountingService,
    @Inject(StrategyEngineService) private readonly strategies: StrategyEngineService
  ) {}

  async createFromToken(input: CreateCommunityInput) {
    const normalized = this.normalize(input);
    const requestHash = this.hash(normalized);
    const existingAccessByKey = normalized.idempotencyKey
      ? await this.prisma.communityCreationAccess.findUnique({ where: { idempotencyKey: normalized.idempotencyKey } })
      : null;
    if (existingAccessByKey?.requestHash && existingAccessByKey.requestHash !== requestHash) {
      throw new ConflictException("idempotencyKey was already used for a different community creation request.");
    }

    const scan = await this.scanner.scanToken(normalized.tokenMint);
    const token = await this.upsertToken(scan);
    const existing = await this.prisma.collection.findUnique({
      where: { tokenId: token.id },
      include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
    });
    if (existing) {
      await this.strategies.ensureDefaultStrategy(existing.id);
      return {
        ok: true,
        reused: true,
        accessRequired: false,
        collection: this.collectionDto(existing),
        token: scan,
        message: "A community for this token already exists; returning the existing collection."
      };
    }

    const access = await this.verifyAccess(normalized, scan, requestHash);
    if (!access.granted) {
      await this.recordAccess({
        input: normalized,
        method: access.method,
        status: access.status,
        requestHash,
        requiredLamports: this.creationFeeLamports(),
        metadata: access.metadata
      });
      throw new ForbiddenException({
        code: access.code,
        message: access.message,
        accessStatus: access.status,
        method: access.method,
        metadata: access.metadata
      });
    }

    const user = await this.prisma.user.upsert({
      where: { walletAddress: normalized.walletAddress },
      update: {},
      create: { walletAddress: normalized.walletAddress, username: normalized.walletAddress.slice(0, 6) }
    });
    const profile = this.identity.createCommunityProfile(scan);
    const slug = await this.uniqueSlug(normalized.slug ?? `${scan.symbol}-vaults`, scan.mint);
    const reserveAddresses = this.reserveAddresses(token.mint, normalized.walletAddress);
    const collection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.collection.create({
        data: {
          tokenId: token.id,
          creatorUserId: user.id,
          name: normalized.name ?? profile.name,
          slug,
          logoUri: scan.imageUri,
          bannerUri: scan.imageUri,
          colorPalette: this.json(profile.palette),
          mascot: profile.mascot,
          theme: profile.theme,
          vibe: profile.vibe,
          lore: scan.description ?? profile.vibe,
          roleNames: this.json(profile.communityTraits.role),
          raidTheme: `${scan.symbol} reserve raids`,
          rarityTable: this.json(profile.rarityTable),
          launchStatus: "DRAFT",
          status: "ACTIVE",
          metadataUri: scan.metadataUri,
          onchainProfilePda: reserveAddresses.collectionProfile,
          feeVaultPda: reserveAddresses.feeVault,
          tokenVaultPda: reserveAddresses.reserveVaultTokenAccount
        }
      });
      await tx.reserveVault.create({
        data: {
          collectionId: created.id,
          tokenMint: token.mint,
          reserveVaultPda: reserveAddresses.reserveVaultTokenAccount,
          totalLocked: "0",
          totalRedeemed: "0",
          totalStaked: "0",
          availableBacking: "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          verificationMetadata: this.json({
            source: "community-draft",
            tokenVaultAuthority: reserveAddresses.tokenVaultAuthority,
            tokenVaultStatePda: reserveAddresses.tokenVaultState,
            warning: "Reserve custody account is deterministic but not production proof until the collection launch transaction is confirmed on-chain."
          })
        }
      });
      await tx.communityCreationAccess.create({
        data: {
          collectionId: created.id,
          walletAddress: normalized.walletAddress,
          tokenMint: token.mint,
          method: access.method,
          status: "GRANTED",
          requiredLamports: access.method === "CREATION_FEE_SOL" ? this.creationFeeLamports() : undefined,
          paymentSignature: normalized.paymentSignature,
          idempotencyKey: normalized.idempotencyKey,
          requestHash,
          verifiedAt: new Date(),
          metadata: this.json(access.metadata)
        }
      });
      return created;
    });

    await this.strategies.ensureDefaultStrategy(collection.id);
    await this.accounting.recalculateReserve(collection.id);
    const hydrated = await this.prisma.collection.findUnique({
      where: { id: collection.id },
      include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
    });
    return {
      ok: true,
      reused: false,
      accessRequired: true,
      access: { method: access.method, status: "GRANTED", metadata: access.metadata },
      collection: this.collectionDto(hydrated ?? collection),
      token: scan,
      message: "Token community draft created. Launch remains blocked until production assets and on-chain collection setup are complete."
    };
  }

  async buildCommunityLaunch(idOrSlug: string, walletAddress: string) {
    const collection = await this.collectionForLaunch(idOrSlug);
    this.assertCreatorOrAdmin(collection, walletAddress);
    if (collection.launchStatus === "CONFIRMED" && collection.collectionAssetAddress && collection.onchainProfilePda && collection.tokenVaultPda) {
      return { ok: true, idempotent: true, collection: this.collectionDto(collection), launchUnsignedTransaction: collection.launchUnsignedTransaction };
    }
    const metadataUri = collection.collectionMetadataUri ?? collection.metadataUri ?? collection.token.metadataUri;
    if (!metadataUri) throw new BadRequestException("Community launch requires pinned collection metadataUri before on-chain initialization.");
    const launchTx = await this.solana.buildCommunityLaunchTransaction({
      walletAddress,
      tokenMint: collection.token.mint,
      collectionName: collection.name,
      metadataUri,
      theme: collection.theme,
      mascot: collection.mascot,
      vibe: collection.vibe
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.collection.update({
        where: { id: collection.id },
        data: {
          collectionMetadataUri: metadataUri,
          metadataUri,
          collectionAssetAddress: launchTx.collectionAssetAddress,
          onchainProfilePda: launchTx.onchainProfilePda,
          feeVaultPda: launchTx.feeVaultPda,
          tokenVaultPda: launchTx.reserveVaultTokenAccount,
          launchUnsignedTransaction: this.json(launchTx),
          launchStatus: launchTx.base64UnsignedTransaction ? "TX_BUILT" : "PENDING"
        },
        include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
      });
      await tx.reserveVault.upsert({
        where: { collectionId: collection.id },
        update: {
          tokenMint: collection.token.mint,
          reserveVaultPda: launchTx.reserveVaultTokenAccount,
          status: "ACTIVE",
          verificationMetadata: this.json({
            source: "community-launch-transaction-built",
            tokenVaultAuthority: launchTx.tokenVaultAuthority,
            tokenVaultStatePda: launchTx.tokenVaultStatePda,
            warning: "Reserve custody is not confirmed until the launch transaction is signed and verified."
          })
        },
        create: {
          collectionId: collection.id,
          tokenMint: collection.token.mint,
          reserveVaultPda: launchTx.reserveVaultTokenAccount,
          totalLocked: "0",
          totalRedeemed: "0",
          totalStaked: "0",
          availableBacking: "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          verificationMetadata: this.json({
            source: "community-launch-transaction-built",
            tokenVaultAuthority: launchTx.tokenVaultAuthority,
            tokenVaultStatePda: launchTx.tokenVaultStatePda,
            warning: "Reserve custody is not confirmed until the launch transaction is signed and verified."
          })
        }
      });
      return row;
    });
    return { ok: true, collection: this.collectionDto(updated), launchUnsignedTransaction: launchTx };
  }

  async verifyPaymentAccess(idOrSlug: string, input: { walletAddress: string; paymentSignature: string; idempotencyKey?: string }) {
    const collection = await this.collectionForLaunch(idOrSlug);
    const normalized = {
      tokenMint: collection.token.mint,
      walletAddress: input.walletAddress.trim(),
      accessMethod: "CREATION_FEE_SOL" as const,
      paymentSignature: input.paymentSignature.trim(),
      idempotencyKey: input.idempotencyKey?.trim()
    };
    const requestHash = this.hash(normalized);
    const access = await this.verifyCreationFee(normalized, requestHash);
    await this.recordAccess({
      input: normalized,
      method: "CREATION_FEE_SOL",
      status: access.granted ? "GRANTED" : access.status,
      collectionId: collection.id,
      requestHash,
      requiredLamports: this.creationFeeLamports(),
      metadata: access.metadata
    });
    if (!access.granted) {
      throw new ForbiddenException({
        code: access.code,
        message: access.message,
        accessStatus: access.status,
        method: access.method,
        metadata: access.metadata
      });
    }
    return { ok: true, collection: this.collectionDto(collection), access: { method: "CREATION_FEE_SOL", status: "GRANTED", metadata: access.metadata } };
  }

  async verifyWhaleAccess(idOrSlug: string, input: { walletAddress: string; idempotencyKey?: string }) {
    const collection = await this.collectionForLaunch(idOrSlug);
    const normalized = {
      tokenMint: collection.token.mint,
      walletAddress: input.walletAddress.trim(),
      accessMethod: "WHALE_HOLDER" as const,
      idempotencyKey: input.idempotencyKey?.trim()
    };
    const requestHash = this.hash(normalized);
    const scan = {
      mint: collection.token.mint,
      symbol: collection.token.symbol,
      name: collection.token.name
    } as TokenScan;
    const access = await this.verifyWhaleGate(normalized, scan);
    await this.recordAccess({
      input: normalized,
      method: "WHALE_HOLDER",
      status: access.granted ? "GRANTED" : access.status,
      collectionId: collection.id,
      requestHash,
      metadata: access.metadata
    });
    if (!access.granted) {
      throw new ForbiddenException({
        code: access.code,
        message: access.message,
        accessStatus: access.status,
        method: access.method,
        metadata: access.metadata
      });
    }
    return { ok: true, collection: this.collectionDto(collection), access: { method: "WHALE_HOLDER", status: "GRANTED", metadata: access.metadata } };
  }

  async submitCommunityLaunch(idOrSlug: string, input: SubmitCommunityLaunchInput, walletAddress: string) {
    const collection = await this.collectionForLaunch(idOrSlug);
    this.assertCreatorOrAdmin(collection, walletAddress);
    const result = await this.solana.submitAndConfirm({
      transactionId: collection.id,
      signedTransaction: input.signedTransaction,
      txSignature: input.txSignature
    });
    if (!result.confirmed) {
      const updated = await this.prisma.collection.update({
        where: { id: collection.id },
        data: { launchStatus: result.status, launchTxSignature: result.txSignature },
        include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
      });
      return { ok: result.status !== "FAILED", collection: this.collectionDto(updated), result };
    }
    const verification = await this.solana.verifyCommunityProfileInitialization({
      walletAddress,
      tokenMint: collection.token.mint,
      collectionAssetAddress: collection.collectionAssetAddress
    });
    if (verification.verificationAvailable && !verification.passed) {
      await this.prisma.collection.update({ where: { id: collection.id }, data: { launchStatus: "FAILED", launchTxSignature: result.txSignature } });
      throw new BadRequestException(`Community launch transaction confirmed but protocol account verification failed: ${verification.issues.join(" ")}`);
    }
    const addresses = verification.addresses ?? this.solana.deriveCommunityAddresses({ tokenMint: collection.token.mint, walletAddress });
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.collection.update({
        where: { id: collection.id },
        data: {
          launchStatus: "CONFIRMED",
          launchTxSignature: result.txSignature,
          launchedAt: new Date(),
          onchainProfilePda: addresses.collectionProfile,
          feeVaultPda: addresses.feeVault,
          tokenVaultPda: addresses.reserveVaultTokenAccount
        },
        include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
      });
      await tx.reserveVault.upsert({
        where: { collectionId: collection.id },
        update: {
          tokenMint: collection.token.mint,
          reserveVaultPda: addresses.reserveVaultTokenAccount,
          availableBacking: verification.reserve?.balance ?? "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          lastOnChainVerifiedAt: verification.verificationAvailable ? new Date() : undefined,
          verificationMetadata: this.json({
            source: "community-launch-post-confirm",
            txSignature: result.txSignature,
            tokenVaultAuthority: addresses.tokenVaultAuthority,
            tokenVaultStatePda: addresses.tokenVaultState,
            collectionAssetExists: verification.collectionAssetExists,
            issues: verification.issues
          })
        },
        create: {
          collectionId: collection.id,
          tokenMint: collection.token.mint,
          reserveVaultPda: addresses.reserveVaultTokenAccount,
          totalLocked: "0",
          totalRedeemed: "0",
          totalStaked: "0",
          availableBacking: verification.reserve?.balance ?? "0",
          reserveRatioBps: 10000,
          status: "ACTIVE",
          lastOnChainVerifiedAt: verification.verificationAvailable ? new Date() : undefined,
          verificationMetadata: this.json({
            source: "community-launch-post-confirm",
            txSignature: result.txSignature,
            tokenVaultAuthority: addresses.tokenVaultAuthority,
            tokenVaultStatePda: addresses.tokenVaultState,
            collectionAssetExists: verification.collectionAssetExists,
            issues: verification.issues
          })
        }
      });
      return row;
    });
    return { ok: true, collection: this.collectionDto(updated), result, verification };
  }

  async launchStatus(idOrSlug: string) {
    const collection = await this.collectionForLaunch(idOrSlug);
    return {
      ok: true,
      collection: this.collectionDto(collection),
      launch: {
        status: collection.launchStatus,
        txSignature: collection.launchTxSignature,
        unsignedTransaction: collection.launchUnsignedTransaction,
        collectionAssetAddress: collection.collectionAssetAddress,
        onchainProfilePda: collection.onchainProfilePda,
        feeVaultPda: collection.feeVaultPda,
        tokenVaultPda: collection.tokenVaultPda,
        launchedAt: collection.launchedAt?.toISOString?.() ?? null,
        productionReady: collection.launchStatus === "CONFIRMED" && Boolean(collection.collectionAssetAddress && collection.onchainProfilePda && collection.tokenVaultPda)
      }
    };
  }

  private async verifyAccess(input: CreateCommunityInput, scan: TokenScan, requestHash: string) {
    const existingGrant = await this.prisma.communityCreationAccess.findFirst({
      where: {
        walletAddress: input.walletAddress,
        tokenMint: scan.mint,
        status: "GRANTED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: "desc" }
    });
    if (existingGrant) {
      return {
        granted: true as const,
        method: existingGrant.method as AccessMethod,
        status: "GRANTED" as const,
        metadata: { source: "existing-access-grant", accessId: existingGrant.id }
      };
    }

    const method = input.accessMethod;
    if (!method) {
      return this.denied("ACCESS_METHOD_REQUIRED", "Create community requires a verified 1 SOL payment, whale holding, subscription, or admin grant.", "DENIED", "CREATION_FEE_SOL", {
        requiredLamports: this.creationFeeLamports(),
        paymentWallet: this.creationFeeWallet()
      });
    }
    if (method === "CREATION_FEE_SOL") return this.verifyCreationFee(input, requestHash);
    if (method === "WHALE_HOLDER") return this.verifyWhaleGate(input, scan);
    if (method === "SUBSCRIPTION_STUDIO") return this.verifySubscription(input);
    if (method === "ADMIN_GRANT") return this.verifyAdminGrant(input);
    return this.denied("ACCESS_METHOD_UNSUPPORTED", "Unsupported community creation access method.", "DENIED", method, {});
  }

  private async verifyCreationFee(input: CreateCommunityInput, requestHash: string) {
    const recipient = this.creationFeeWallet();
    if (!recipient) return this.denied("CREATION_FEE_WALLET_MISSING", "COMMUNITY_CREATION_FEE_WALLET or PROTOCOL_TREASURY_WALLET must be configured before paid creation can be verified.", "DENIED", "CREATION_FEE_SOL", {});
    if (!input.paymentSignature) return this.denied("PAYMENT_SIGNATURE_REQUIRED", "1 SOL community creation requires a verifiable payment signature.", "PENDING", "CREATION_FEE_SOL", { recipient, requiredLamports: this.creationFeeLamports() });
    const proof = await this.solana.verifySolPayment({
      signature: input.paymentSignature,
      payer: input.walletAddress,
      recipient,
      lamports: this.creationFeeLamports()
    });
    if (!proof.verified) {
      return this.denied(proof.verificationAvailable ? "PAYMENT_NOT_FOUND" : "PAYMENT_VERIFICATION_UNAVAILABLE", proof.message, proof.verificationAvailable ? "DENIED" : "PENDING", "CREATION_FEE_SOL", {
        ...proof,
        requestHash
      });
    }
    return { granted: true as const, method: "CREATION_FEE_SOL" as const, status: "GRANTED" as const, metadata: proof };
  }

  private async verifyWhaleGate(input: CreateCommunityInput, scan: TokenScan) {
    const threshold = this.whaleThresholdRaw();
    const proof = await this.solana.verifyWalletTokenBalance({
      walletAddress: input.walletAddress,
      tokenMint: scan.mint,
      requiredAmount: threshold
    });
    if (!proof.verificationAvailable || !proof.sufficient) {
      return this.denied(proof.verificationAvailable ? "WHALE_THRESHOLD_NOT_MET" : "WHALE_VERIFICATION_UNAVAILABLE", proof.issues.join("; ") || "Whale verification did not pass.", "DENIED", "WHALE_HOLDER", {
        thresholdRaw: threshold,
        balance: proof.balance,
        tokenAccount: proof.tokenAccount,
        verificationAvailable: proof.verificationAvailable
      });
    }
    return { granted: true as const, method: "WHALE_HOLDER" as const, status: "GRANTED" as const, metadata: { thresholdRaw: threshold, balance: proof.balance, tokenAccount: proof.tokenAccount } };
  }

  private verifySubscription(input: CreateCommunityInput) {
    const wallets = this.envWalletSet("STUDIO_SUBSCRIPTION_WALLETS", "PHEW_STUDIO_SUBSCRIPTION_WALLETS");
    if (!wallets.has(input.walletAddress)) return this.denied("SUBSCRIPTION_REQUIRED", "Subscription Studio Mode access was not found for this wallet.", "DENIED", "SUBSCRIPTION_STUDIO", {});
    return { granted: true as const, method: "SUBSCRIPTION_STUDIO" as const, status: "GRANTED" as const, metadata: { source: "configured-subscription-registry" } };
  }

  private verifyAdminGrant(input: CreateCommunityInput) {
    if (!this.isAdmin(input.walletAddress)) return this.denied("ADMIN_GRANT_REQUIRED", "Admin grant requires a configured protocol admin wallet.", "DENIED", "ADMIN_GRANT", {});
    return { granted: true as const, method: "ADMIN_GRANT" as const, status: "GRANTED" as const, metadata: { source: "protocol-admin-wallet" } };
  }

  private denied(code: string, message: string, status: "PENDING" | "DENIED", method: AccessMethod, metadata: Record<string, unknown>) {
    return { granted: false as const, code, message, status, method, metadata };
  }

  private async recordAccess(input: { input: CreateCommunityInput; method: AccessMethod; status: "PENDING" | "DENIED" | "GRANTED"; requestHash: string; requiredLamports?: string; metadata: Record<string, unknown>; collectionId?: string }) {
    const data = {
      collectionId: input.collectionId,
      walletAddress: input.input.walletAddress,
      tokenMint: input.input.tokenMint,
      method: input.method,
      status: input.status,
      requiredLamports: input.requiredLamports,
      paymentSignature: input.input.paymentSignature,
      idempotencyKey: input.input.idempotencyKey,
      requestHash: input.requestHash,
      verifiedAt: input.status === "GRANTED" ? new Date() : undefined,
      metadata: this.json(input.metadata)
    };
    if (input.input.idempotencyKey) {
      return this.prisma.communityCreationAccess.upsert({
        where: { idempotencyKey: input.input.idempotencyKey },
        update: data,
        create: data
      });
    }
    return this.prisma.communityCreationAccess.create({ data });
  }

  private async upsertToken(scan: TokenScan) {
    return this.prisma.token.upsert({
      where: { mint: scan.mint },
      update: {
        symbol: scan.symbol,
        name: scan.name,
        decimals: scan.decimals,
        metadataUri: scan.metadataUri,
        imageUri: scan.imageUri,
        liquidityUsd: scan.liquidityUsd,
        marketCapUsd: scan.marketCapUsd,
        volume24hUsd: scan.volume24hUsd,
        holders: scan.holders,
        riskScore: scan.riskScore
      },
      create: {
        mint: scan.mint,
        symbol: scan.symbol,
        name: scan.name,
        decimals: scan.decimals,
        metadataUri: scan.metadataUri,
        imageUri: scan.imageUri,
        liquidityUsd: scan.liquidityUsd,
        marketCapUsd: scan.marketCapUsd,
        volume24hUsd: scan.volume24hUsd,
        holders: scan.holders,
        riskScore: scan.riskScore
      }
    });
  }

  private async uniqueSlug(input: string, mint: string) {
    const base = this.slug(input || "community-vault");
    const existing = await this.prisma.collection.findUnique({ where: { slug: base } });
    if (!existing) return base;
    return `${base}-${mint.slice(0, 4).toLowerCase()}${mint.slice(-4).toLowerCase()}`;
  }

  private collectionDto(collection: any) {
    return {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      tokenMint: collection.token?.mint,
      creatorWallet: collection.creator?.walletAddress,
      launchStatus: collection.launchStatus,
      riskStatus: collection.emergencyFlag ? "EMERGENCY" : collection.status,
      reserveVaultPda: collection.reserveVault?.reserveVaultPda ?? collection.tokenVaultPda,
      strategy: collection.vaultStrategy
        ? {
            type: collection.vaultStrategy.type,
            status: collection.vaultStrategy.status,
            approvedByCreator: collection.vaultStrategy.approvedByCreator
          }
        : { type: "PASSIVE", status: "DRAFT", approvedByCreator: false }
    };
  }

  private async collectionForLaunch(idOrSlug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { token: true, reserveVault: true, vaultStrategy: true, creator: true }
    });
    if (!collection) throw new BadRequestException("Collection not found.");
    return collection as any;
  }

  private assertCreatorOrAdmin(collection: any, walletAddress: string) {
    if (collection.creator?.walletAddress === walletAddress || this.isAdmin(walletAddress)) return;
    throw new ForbiddenException("Only the community creator or protocol admin can launch this community profile.");
  }

  private normalize(input: CreateCommunityInput): CreateCommunityInput {
    if (!input.walletAddress?.trim()) throw new BadRequestException("walletAddress is required.");
    if (!input.tokenMint?.trim()) throw new BadRequestException("tokenMint is required.");
    return {
      ...input,
      tokenMint: input.tokenMint.trim(),
      walletAddress: input.walletAddress.trim(),
      paymentSignature: input.paymentSignature?.trim(),
      idempotencyKey: input.idempotencyKey?.trim(),
      slug: input.slug?.trim(),
      name: input.name?.trim()
    };
  }

  private slug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "community-vault";
  }

  private reserveAddresses(tokenMint: string, walletAddress?: string) {
    try {
      return this.solana.deriveCommunityAddresses({ tokenMint, walletAddress });
    } catch {
      return {
        collectionProfile: `pending_profile_${tokenMint.slice(0, 32)}`,
        feeVault: `pending_fee_${tokenMint.slice(0, 32)}`,
        tokenVaultState: `pending_vault_state_${tokenMint.slice(0, 32)}`,
        tokenVaultAuthority: `pending_vault_authority_${tokenMint.slice(0, 32)}`,
        reserveVaultTokenAccount: `pending_reserve_${tokenMint.slice(0, 32)}`
      };
    }
  }

  private creationFeeLamports() {
    return process.env.COMMUNITY_CREATION_FEE_LAMPORTS ?? "1000000000";
  }

  private creationFeeWallet() {
    return process.env.COMMUNITY_CREATION_FEE_WALLET ?? process.env.PROTOCOL_TREASURY_WALLET;
  }

  private whaleThresholdRaw() {
    return process.env.COMMUNITY_CREATION_WHALE_MIN_RAW ?? "1";
  }

  private isAdmin(wallet: string) {
    return this.envWalletSet("PROTOCOL_ADMIN_WALLETS", "ADMIN_WALLETS").has(wallet);
  }

  private envWalletSet(...keys: string[]) {
    return new Set(keys.flatMap((key) => (process.env[key] ?? "").split(/[,\s]+/).map((value) => value.trim()).filter(Boolean)));
  }

  private hash(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
