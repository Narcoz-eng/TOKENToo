import { Injectable } from "@nestjs/common";
import { burnV1, createCollection, createV1, fetchAssetV1 } from "@metaplex-foundation/mpl-core";
import { createNoopSigner, createSignerFromKeypair, publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "node:crypto";

const GLOBAL_CONFIG_SEED = "global-config";
const COLLECTION_SEED = "collection";
const POSITION_SEED = "position";
const TOKEN_VAULT_AUTHORITY_SEED = "token-vault-authority";
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

@Injectable()
export class SolanaTransactionAdapterService {
  async buildVaultMintTransaction(input: {
    transactionId: string;
    walletAddress: string;
    collectionId: string;
    tokenMint: string;
    amount: string;
    lockDurationDays: number;
    metadataUri: string;
    collectionName: string;
    collectionAssetAddress?: string | null;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const standard = this.nftStandard();
    if (provider === "devnet") {
      if (standard !== "METAPLEX_CORE") {
        throw new Error("TOKEN_METADATA fallback is planned but not implemented in this build. Use METAPLEX_CORE.");
      }
      return this.buildDevnetCoreVaultMintTransaction(input);
    }
    return {
      provider,
      network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
      standard,
      requiredSigner: input.walletAddress,
      base64UnsignedTransaction: null,
      recentBlockhash: null,
      nftAssetAddress: null,
      vaultPositionPda: null,
      instructions: [
        {
          program: "vaultx_anchor",
          name: "deposit_and_mint_vault_nft",
          params: {
            collectionId: input.collectionId,
            tokenMint: input.tokenMint,
            amount: input.amount,
            lockDurationDays: input.lockDurationDays,
            metadataUri: input.metadataUri
          }
        },
        {
          program: "metaplex_core",
          name: "create_asset_and_verify_collection",
          params: {
            metadataUri: input.metadataUri,
            collectionId: input.collectionId
          }
        }
      ],
      warning:
        provider === "mock"
          ? "This is a transaction plan, not a serialized production Solana transaction. Configure the real Solana adapter before launch."
          : undefined
    };
  }

  async buildRedeemTransaction(input: {
    transactionId: string;
    walletAddress: string;
    tokenMint: string;
    nftAssetAddress: string;
    collectionAssetAddress: string;
    vaultPositionPda: string;
    lockedAmount: string;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        provider,
        base64UnsignedTransaction: null,
        warning: "Redeem transaction is only built when SOLANA_TRANSACTION_PROVIDER=devnet."
      };
    }

    const programId = new PublicKey(process.env.PROGRAM_ID ?? "11111111111111111111111111111111");
    if (programId.equals(SystemProgram.programId)) throw new Error("PROGRAM_ID must be configured for devnet redeem.");
    const connection = this.connection();
    const owner = new PublicKey(input.walletAddress);
    const tokenMint = new PublicKey(input.tokenMint);
    const nftAsset = new PublicKey(input.nftAssetAddress);
    const collectionAsset = new PublicKey(input.collectionAssetAddress);
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const ownerTokenAccount = this.associatedTokenAddress(tokenMint, owner);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const preRedeemUserTokenBalance = await this.tokenBalance(connection, ownerTokenAccount);
    const preRedeemVaultTokenBalance = await this.tokenBalance(connection, vaultTokenAccount);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash.blockhash });
    const umi = createUmi(this.rpcUrl());

    const burnBuilder = burnV1(umi, {
      asset: publicKey(nftAsset.toBase58()),
      collection: publicKey(collectionAsset.toBase58()),
      payer: createNoopSigner(publicKey(owner.toBase58())),
      authority: createNoopSigner(publicKey(owner.toBase58()))
    });
    for (const instruction of burnBuilder.getInstructions()) {
      tx.add(this.umiInstructionToWeb3(instruction));
    }

    tx.add(
      new TransactionInstruction({
        programId,
        keys: [
          { pubkey: new PublicKey(input.vaultPositionPda), isSigner: false, isWritable: true },
          { pubkey: collectionProfile, isSigner: false, isWritable: false },
          { pubkey: tokenMint, isSigner: false, isWritable: false },
          { pubkey: nftAsset, isSigner: false, isWritable: false },
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenVaultAuthority, isSigner: false, isWritable: false },
          { pubkey: owner, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
        ],
        data: createHash("sha256").update("global:redeem_vault_nft").digest().subarray(0, 8)
      })
    );

    return {
      provider: "devnet",
      network: "devnet",
      standard: "METAPLEX_CORE",
      base64UnsignedTransaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      requiredSigners: [owner.toBase58()],
      recentBlockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      transactionSummary: {
        tokenMint: input.tokenMint,
        nftAssetAddress: input.nftAssetAddress,
        collectionAssetAddress: input.collectionAssetAddress,
        vaultPositionPda: input.vaultPositionPda,
        lockedAmount: input.lockedAmount,
        preRedeemUserTokenBalance,
        preRedeemVaultTokenBalance,
        action: "Burn Metaplex Core asset and redeem vault custody atomically."
      }
    };
  }

  async verifyCoreAssetOwnerAndCollection(input: { assetAddress: string; owner: string; collectionAssetAddress: string }) {
    const umi = createUmi(this.rpcUrl());
    const asset = await fetchAssetV1(umi, publicKey(input.assetAddress));
    const ownerMatches = String(asset.owner) === input.owner;
    const updateAuthority = JSON.stringify(asset.updateAuthority ?? {});
    const collectionMatches = updateAuthority.includes(input.collectionAssetAddress);
    return { ownerMatches, collectionMatches, asset };
  }

  async verifyMintFinalization(input: {
    walletAddress: string;
    tokenMint: string;
    expectedAmount: string;
    nftAssetAddress: string;
    collectionAssetAddress: string;
    vaultPositionPda: string;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") return { passed: true, checks: ["non-devnet adapter does not support chain finalization checks"] };

    const programId = new PublicKey(process.env.PROGRAM_ID ?? "11111111111111111111111111111111");
    const connection = this.connection();
    const tokenMint = new PublicKey(input.tokenMint);
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const vaultPositionInfo = await connection.getAccountInfo(new PublicKey(input.vaultPositionPda), "confirmed");
    let vaultBalanceAmount = "0";
    let vaultBalanceError: string | null = null;
    try {
      const vaultBalance = await connection.getTokenAccountBalance(vaultTokenAccount, "confirmed");
      vaultBalanceAmount = vaultBalance.value.amount;
    } catch (error) {
      vaultBalanceError = error instanceof Error ? error.message : String(error);
    }
    const core = await this.verifyCoreAssetOwnerAndCollection({
      assetAddress: input.nftAssetAddress,
      owner: input.walletAddress,
      collectionAssetAddress: input.collectionAssetAddress
    });
    const vaultHasAmount = BigInt(vaultBalanceAmount) >= BigInt(input.expectedAmount);
    const issues = [
      !vaultPositionInfo ? "Vault position PDA does not exist after confirmation." : null,
      vaultBalanceError ? `Vault token account balance could not be fetched: ${vaultBalanceError}` : null,
      !vaultHasAmount ? "Vault token account balance is below the locked amount." : null,
      !core.ownerMatches ? "Core asset owner does not match minting wallet." : null,
      !core.collectionMatches ? "Core asset collection does not match launched collection." : null
    ].filter(Boolean);
    return {
      passed: issues.length === 0,
      issues,
      vaultPositionPda: input.vaultPositionPda,
      vaultTokenAccount: vaultTokenAccount.toBase58(),
      vaultTokenBalance: vaultBalanceAmount,
      ownerMatches: core.ownerMatches,
      collectionMatches: core.collectionMatches
    };
  }

  async verifyRedeemFinalization(input: {
    walletAddress: string;
    tokenMint: string;
    nftAssetAddress: string;
    vaultPositionPda: string;
    lockedAmount: string;
    preRedeemUserTokenBalance?: string;
    preRedeemVaultTokenBalance?: string;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") return { passed: true, checks: ["non-devnet adapter does not support chain finalization checks"] };

    const connection = this.connection();
    const tokenMint = new PublicKey(input.tokenMint);
    const owner = new PublicKey(input.walletAddress);
    const ownerTokenAccount = this.associatedTokenAddress(tokenMint, owner);
    const programId = new PublicKey(process.env.PROGRAM_ID ?? "11111111111111111111111111111111");
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const vaultPositionInfo = await connection.getAccountInfo(new PublicKey(input.vaultPositionPda), "confirmed");
    const redeemed = vaultPositionInfo ? this.decodeVaultPositionRedeemed(vaultPositionInfo.data) : false;
    const postRedeemUserTokenBalance = await this.tokenBalance(connection, ownerTokenAccount);
    const postRedeemVaultTokenBalance = await this.tokenBalance(connection, vaultTokenAccount);
    const userIncreased =
      input.preRedeemUserTokenBalance === undefined ||
      BigInt(postRedeemUserTokenBalance) >= BigInt(input.preRedeemUserTokenBalance) + BigInt(input.lockedAmount);
    const vaultDecreased =
      input.preRedeemVaultTokenBalance === undefined ||
      BigInt(postRedeemVaultTokenBalance) + BigInt(input.lockedAmount) <= BigInt(input.preRedeemVaultTokenBalance);
    let coreAssetStillExists = true;
    try {
      await fetchAssetV1(createUmi(this.rpcUrl()), publicKey(input.nftAssetAddress));
    } catch {
      coreAssetStillExists = false;
    }
    const issues = [
      !vaultPositionInfo ? "Vault position PDA is missing after redeem confirmation." : null,
      vaultPositionInfo && !redeemed ? "Vault position did not decode as redeemed=true after confirmation." : null,
      !userIncreased ? "User token balance did not increase by the locked amount." : null,
      !vaultDecreased ? "Vault token balance did not decrease by the locked amount." : null,
      coreAssetStillExists ? "Core asset still exists after redeem; NFT was not invalidated/burned." : null
    ].filter(Boolean);
    return {
      passed: issues.length === 0,
      issues,
      vaultPositionPda: input.vaultPositionPda,
      redeemed,
      preRedeemUserTokenBalance: input.preRedeemUserTokenBalance,
      postRedeemUserTokenBalance,
      preRedeemVaultTokenBalance: input.preRedeemVaultTokenBalance,
      postRedeemVaultTokenBalance,
      coreAssetInvalidated: !coreAssetStillExists
    };
  }

  async buildCollectionAssetTransaction(input: { walletAddress: string; name: string; metadataUri: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const collectionKeypair = this.deterministicKeypair(`collection:${input.walletAddress}:${input.name}:${input.metadataUri}`);
    if (provider !== "devnet") {
      return {
        provider,
        collectionAssetAddress: collectionKeypair.publicKey.toBase58(),
        base64UnsignedTransaction: null,
        warning: "Collection asset transaction is only built when SOLANA_TRANSACTION_PROVIDER=devnet."
      };
    }
    const connection = this.connection();
    const payer = new PublicKey(input.walletAddress);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    const umi = createUmi(this.rpcUrl());
    const builder = createCollection(umi, {
      collection: createSignerFromKeypair(umi, fromWeb3JsKeypair(collectionKeypair)),
      updateAuthority: publicKey(payer.toBase58()),
      payer: createNoopSigner(publicKey(payer.toBase58())),
      name: input.name.slice(0, 32),
      uri: input.metadataUri
    });
    const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash.blockhash });
    for (const instruction of builder.getInstructions()) {
      tx.add(this.umiInstructionToWeb3(instruction));
    }
    tx.partialSign(collectionKeypair);
    return {
      provider,
      standard: "METAPLEX_CORE",
      collectionAssetAddress: collectionKeypair.publicKey.toBase58(),
      base64UnsignedTransaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      requiredSigners: [payer.toBase58(), collectionKeypair.publicKey.toBase58()],
      recentBlockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
    };
  }

  private async buildDevnetCoreVaultMintTransaction(input: {
    transactionId: string;
    walletAddress: string;
    collectionId: string;
    tokenMint: string;
    amount: string;
    lockDurationDays: number;
    metadataUri: string;
    collectionName: string;
    collectionAssetAddress?: string | null;
  }) {
    if (!input.collectionAssetAddress) {
      throw new Error("Collection is missing a Metaplex Core collection asset address. Build and confirm the collection asset before minting.");
    }
    const programId = new PublicKey(process.env.PROGRAM_ID ?? "11111111111111111111111111111111");
    if (programId.equals(SystemProgram.programId)) throw new Error("PROGRAM_ID must be configured for devnet minting.");

    const connection = this.connection();
    const owner = new PublicKey(input.walletAddress);
    const tokenMint = new PublicKey(input.tokenMint);
    const nftAsset = this.deterministicKeypair(`vault-asset:${input.transactionId}`);
    const [globalConfig] = PublicKey.findProgramAddressSync([Buffer.from(GLOBAL_CONFIG_SEED)], programId);
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [vaultPositionPda] = PublicKey.findProgramAddressSync([Buffer.from(POSITION_SEED), nftAsset.publicKey.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const ownerTokenAccount = this.associatedTokenAddress(tokenMint, owner);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash.blockhash });

    tx.add(
      this.createAssociatedTokenAccountIdempotentInstruction(owner, ownerTokenAccount, owner, tokenMint),
      this.createAssociatedTokenAccountIdempotentInstruction(owner, vaultTokenAccount, tokenVaultAuthority, tokenMint)
    );

    tx.add(
      new TransactionInstruction({
        programId,
        keys: [
          { pubkey: globalConfig, isSigner: false, isWritable: false },
          { pubkey: collectionProfile, isSigner: false, isWritable: true },
          { pubkey: vaultPositionPda, isSigner: false, isWritable: true },
          { pubkey: tokenMint, isSigner: false, isWritable: false },
          { pubkey: nftAsset.publicKey, isSigner: false, isWritable: false },
          { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenVaultAuthority, isSigner: false, isWritable: false },
          { pubkey: owner, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        data: this.depositAndMintData(input.amount, input.lockDurationDays * 24 * 60 * 60)
      })
    );

    const umi = createUmi(this.rpcUrl());
    const coreBuilder = createV1(umi, {
      asset: createSignerFromKeypair(umi, fromWeb3JsKeypair(nftAsset)),
      collection: publicKey(input.collectionAssetAddress),
      authority: createNoopSigner(publicKey(owner.toBase58())),
      payer: createNoopSigner(publicKey(owner.toBase58())),
      owner: publicKey(owner.toBase58()),
      name: `${input.collectionName} Vault`.slice(0, 32),
      uri: input.metadataUri
    });
    for (const instruction of coreBuilder.getInstructions()) {
      tx.add(this.umiInstructionToWeb3(instruction));
    }
    tx.partialSign(nftAsset);

    return {
      provider: "devnet",
      network: "devnet",
      standard: "METAPLEX_CORE",
      base64UnsignedTransaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      requiredSigners: [owner.toBase58(), nftAsset.publicKey.toBase58()],
      recentBlockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      nftAssetAddress: nftAsset.publicKey.toBase58(),
      vaultPositionPda: vaultPositionPda.toBase58(),
      transactionSummary: {
        tokenMint: input.tokenMint,
        amountLocked: input.amount,
        unlockDate: new Date(Date.now() + input.lockDurationDays * 24 * 60 * 60 * 1000).toISOString(),
        metadataUri: input.metadataUri,
        collection: input.collectionName,
        collectionAssetAddress: input.collectionAssetAddress,
        estimatedFees: "network rent + transaction fee"
      }
    };
  }

  async submitAndConfirm(input: { transactionId: string; txSignature?: string; signedTransaction?: string; confirmMock?: boolean }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider === "devnet") {
      if (!input.signedTransaction && !input.txSignature) {
        return {
          status: "FAILED" as const,
          txSignature: undefined,
          confirmed: false,
          message: "Devnet submission requires signedTransaction or txSignature."
        };
      }
      if (input.signedTransaction) {
        const connection = new Connection(process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
        const txSignature = await connection.sendRawTransaction(Buffer.from(input.signedTransaction, "base64"), { skipPreflight: false });
        const confirmation = await connection.confirmTransaction(txSignature, "confirmed");
        const confirmed = !confirmation.value.err;
        return {
          status: confirmed ? ("CONFIRMED" as const) : ("FAILED" as const),
          txSignature,
          confirmed,
          message: confirmed ? "Devnet transaction confirmed." : JSON.stringify(confirmation.value.err)
        };
      }
      return {
        status: "SUBMITTED" as const,
        txSignature: input.txSignature,
        confirmed: false,
        message: "External devnet signature recorded. Submit signedTransaction for backend confirmation."
      };
    }
    if (provider !== "mock") {
      return {
        status: "FAILED" as const,
        txSignature: input.txSignature,
        confirmed: false,
        message: `${provider} Solana adapter is not implemented in this build.`
      };
    }

    const txSignature = input.txSignature ?? `mock_${input.transactionId.replace(/-/g, "").slice(0, 32)}`;
    return {
      status: input.confirmMock === false ? ("SUBMITTED" as const) : ("CONFIRMED" as const),
      txSignature,
      confirmed: input.confirmMock !== false,
      message: "Mock Solana confirmation used for local/dev flow only."
    };
  }

  private depositAndMintData(amount: string, lockDurationSeconds: number) {
    const discriminator = createHash("sha256").update("global:deposit_and_mint_vault_nft").digest().subarray(0, 8);
    const data = Buffer.alloc(24);
    discriminator.copy(data, 0);
    data.writeBigUInt64LE(BigInt(amount), 8);
    data.writeBigInt64LE(BigInt(lockDurationSeconds), 16);
    return data;
  }

  private deterministicKeypair(seed: string) {
    return Keypair.fromSeed(createHash("sha256").update(`${process.env.GENERATOR_SEED_SALT ?? "vaultx"}:${seed}`).digest().subarray(0, 32));
  }

  private umiInstructionToWeb3(instruction: any) {
    return new TransactionInstruction({
      programId: new PublicKey(String(instruction.programId)),
      keys: instruction.keys.map((key: any) => ({
        pubkey: new PublicKey(String(key.pubkey)),
        isSigner: Boolean(key.isSigner),
        isWritable: Boolean(key.isWritable)
      })),
      data: Buffer.from(instruction.data)
    });
  }

  private associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
    return PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
  }

  private async tokenBalance(connection: Connection, tokenAccount: PublicKey) {
    try {
      const balance = await connection.getTokenAccountBalance(tokenAccount, "confirmed");
      return balance.value.amount;
    } catch {
      return "0";
    }
  }

  private decodeVaultPositionRedeemed(data: Buffer) {
    const redeemedOffset = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8;
    return data.length > redeemedOffset && data[redeemedOffset] === 1;
  }

  private createAssociatedTokenAccountIdempotentInstruction(payer: PublicKey, ata: PublicKey, owner: PublicKey, mint: PublicKey) {
    return new TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: Buffer.from([1])
    });
  }

  private connection() {
    return new Connection(this.rpcUrl(), "confirmed");
  }

  private rpcUrl() {
    return process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  }

  private nftStandard() {
    const value = (process.env.METAPLEX_NFT_STANDARD ?? process.env.NFT_STANDARD ?? "METAPLEX_CORE").toUpperCase();
    return value === "METAPLEX_CORE" ? "METAPLEX_CORE" : value;
  }
}
