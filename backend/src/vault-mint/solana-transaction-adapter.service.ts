import { Injectable } from "@nestjs/common";
import { burnV1, createCollection, createV1, fetchAssetV1, fetchCollectionV1 } from "@metaplex-foundation/mpl-core";
import { createNoopSigner, createSignerFromKeypair, publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, Keypair, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "node:crypto";

const GLOBAL_CONFIG_SEED = "global-config";
const COLLECTION_SEED = "collection";
const FEE_VAULT_SEED = "fee-vault";
const POSITION_SEED = "position";
const TOKEN_VAULT_STATE_SEED = "token-vault-state";
const TOKEN_VAULT_AUTHORITY_SEED = "token-vault-authority";
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const PLACEHOLDER_PROGRAM_ID = "11111111111111111111111111111111";

@Injectable()
export class SolanaTransactionAdapterService {
  deriveCommunityAddresses(input: { tokenMint: string; walletAddress?: string }) {
    const programId = this.programIdOrPlaceholder();
    const tokenMint = new PublicKey(input.tokenMint);
    const [globalConfig] = PublicKey.findProgramAddressSync([Buffer.from(GLOBAL_CONFIG_SEED)], programId);
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [feeVault] = PublicKey.findProgramAddressSync([Buffer.from(FEE_VAULT_SEED), collectionProfile.toBuffer()], programId);
    const [tokenVaultState] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_STATE_SEED), collectionProfile.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const reserveVaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const creatorTokenAccount = input.walletAddress ? this.associatedTokenAddress(tokenMint, new PublicKey(input.walletAddress)) : null;
    return {
      programId: programId.toBase58(),
      tokenMint: tokenMint.toBase58(),
      globalConfig: globalConfig.toBase58(),
      collectionProfile: collectionProfile.toBase58(),
      feeVault: feeVault.toBase58(),
      tokenVaultState: tokenVaultState.toBase58(),
      tokenVaultAuthority: tokenVaultAuthority.toBase58(),
      reserveVaultTokenAccount: reserveVaultTokenAccount.toBase58(),
      creatorTokenAccount: creatorTokenAccount?.toBase58() ?? null
    };
  }

  async buildCommunityLaunchTransaction(input: {
    walletAddress: string;
    tokenMint: string;
    collectionName: string;
    metadataUri: string;
    theme: string;
    mascot: string;
    vibe: string;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const addresses = this.deriveCommunityAddresses({ tokenMint: input.tokenMint, walletAddress: input.walletAddress });
    const collectionKeypair = this.deterministicKeypair(`collection:${input.walletAddress}:${input.collectionName}:${input.metadataUri}`);
    const base = {
      provider,
      network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
      standard: "METAPLEX_CORE",
      requiredSigner: input.walletAddress,
      collectionAssetAddress: collectionKeypair.publicKey.toBase58(),
      onchainProfilePda: addresses.collectionProfile,
      feeVaultPda: addresses.feeVault,
      tokenVaultStatePda: addresses.tokenVaultState,
      tokenVaultAuthority: addresses.tokenVaultAuthority,
      reserveVaultTokenAccount: addresses.reserveVaultTokenAccount
    };
    if (provider !== "devnet") {
      return {
        ...base,
        base64UnsignedTransaction: null,
        warning: "Community launch transaction is only serialized when SOLANA_TRANSACTION_PROVIDER=devnet.",
        instructions: [
          "initialize_platform_if_missing",
          "create_creator_token_ata_idempotent",
          "create_reserve_token_ata_idempotent",
          "create_collection_profile_if_missing",
          "create_metaplex_core_collection_if_missing"
        ]
      };
    }

    const programId = this.programId();
    const connection = this.connection();
    const payer = new PublicKey(input.walletAddress);
    const tokenMint = new PublicKey(input.tokenMint);
    const globalConfig = new PublicKey(addresses.globalConfig);
    const collectionProfile = new PublicKey(addresses.collectionProfile);
    const feeVault = new PublicKey(addresses.feeVault);
    const tokenVaultState = new PublicKey(addresses.tokenVaultState);
    const tokenVaultAuthority = new PublicKey(addresses.tokenVaultAuthority);
    const creatorTokenAccount = new PublicKey(addresses.creatorTokenAccount!);
    const reserveVaultTokenAccount = new PublicKey(addresses.reserveVaultTokenAccount);
    const blockhash = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash.blockhash });

    const [globalInfo, collectionInfo, collectionAssetInfo] = await Promise.all([
      connection.getAccountInfo(globalConfig, "confirmed"),
      connection.getAccountInfo(collectionProfile, "confirmed"),
      connection.getAccountInfo(collectionKeypair.publicKey, "confirmed")
    ]);

    if (!globalInfo) {
      tx.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: globalConfig, isSigner: false, isWritable: true },
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
          ],
          data: this.initializePlatformData(payer)
        })
      );
    }

    tx.add(
      this.createAssociatedTokenAccountIdempotentInstruction(payer, creatorTokenAccount, payer, tokenMint),
      this.createAssociatedTokenAccountIdempotentInstruction(payer, reserveVaultTokenAccount, tokenVaultAuthority, tokenMint)
    );

    if (!collectionInfo) {
      tx.add(
        new TransactionInstruction({
          programId,
          keys: [
            { pubkey: globalConfig, isSigner: false, isWritable: false },
            { pubkey: collectionProfile, isSigner: false, isWritable: true },
            { pubkey: feeVault, isSigner: false, isWritable: true },
            { pubkey: tokenVaultState, isSigner: false, isWritable: true },
            { pubkey: tokenVaultAuthority, isSigner: false, isWritable: false },
            { pubkey: tokenMint, isSigner: false, isWritable: false },
            { pubkey: creatorTokenAccount, isSigner: false, isWritable: false },
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
          ],
          data: this.createCollectionProfileData(input.theme, input.mascot, input.vibe)
        })
      );
    }

    let collectionAssetCreatedByThisTransaction = false;
    if (!collectionAssetInfo) {
      const umi = createUmi(this.rpcUrl());
      const builder = createCollection(umi, {
        collection: createSignerFromKeypair(umi, fromWeb3JsKeypair(collectionKeypair)),
        updateAuthority: publicKey(payer.toBase58()),
        payer: createNoopSigner(publicKey(payer.toBase58())),
        name: input.collectionName.slice(0, 32),
        uri: input.metadataUri
      });
      for (const instruction of builder.getInstructions()) {
        tx.add(this.umiInstructionToWeb3(instruction));
      }
      tx.partialSign(collectionKeypair);
      collectionAssetCreatedByThisTransaction = true;
    }

    return {
      ...base,
      base64UnsignedTransaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      requiredSigners: collectionAssetCreatedByThisTransaction ? [payer.toBase58(), collectionKeypair.publicKey.toBase58()] : [payer.toBase58()],
      recentBlockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      transactionSummary: {
        initializedPlatform: !globalInfo,
        initializedCollectionProfile: !collectionInfo,
        initializedReserveTokenAccount: true,
        createdCollectionAsset: collectionAssetCreatedByThisTransaction,
        tokenMint: input.tokenMint,
        metadataUri: input.metadataUri,
        collectionName: input.collectionName
      }
    };
  }

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

    const programId = this.programId();
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
    const proof = await this.getCoreAssetProof({
      assetAddress: input.assetAddress,
      collectionAssetAddress: input.collectionAssetAddress
    });
    if (!proof.verificationAvailable) {
      return {
        ownerMatches: true,
        collectionMatches: true,
        asset: proof.asset,
        currentOwner: proof.currentOwner,
        verificationAvailable: false,
        productionReady: false,
        mode: proof.mode,
        issues: proof.issues
      };
    }
    return {
      ownerMatches: proof.currentOwner === input.owner,
      collectionMatches: proof.collectionMatches,
      asset: proof.asset,
      currentOwner: proof.currentOwner,
      verificationAvailable: true,
      productionReady: proof.productionReady,
      mode: proof.mode,
      issues: proof.issues
    };
  }

  async getCoreAssetProof(input: { assetAddress: string; collectionAssetAddress?: string | null }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        productionReady: false,
        mode: provider,
        currentOwner: null as string | null,
        collectionMatches: null as boolean | null,
        asset: null as unknown,
        issues: [`Live Core asset ownership verification is unavailable with SOLANA_TRANSACTION_PROVIDER=${provider}.`]
      };
    }
    const umi = createUmi(this.rpcUrl());
    const asset = await fetchAssetV1(umi, publicKey(input.assetAddress));
    const currentOwner = String(asset.owner);
    const updateAuthority = JSON.stringify(asset.updateAuthority ?? {});
    const collectionMatches = input.collectionAssetAddress ? updateAuthority.includes(input.collectionAssetAddress) : null;
    const issues = [input.collectionAssetAddress && !collectionMatches ? "Core asset does not belong to the expected collection." : null].filter(Boolean) as string[];
    return {
      verificationAvailable: true,
      productionReady: issues.length === 0,
      mode: "devnet",
      currentOwner,
      collectionMatches,
      asset,
      issues
    };
  }

  async verifyWalletTokenBalance(input: { walletAddress: string; tokenMint: string; requiredAmount: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        sufficient: null as boolean | null,
        balance: null as string | null,
        tokenAccount: null as string | null,
        issues: [`Live wallet token balance verification is unavailable with SOLANA_TRANSACTION_PROVIDER=${provider}.`]
      };
    }
    const owner = new PublicKey(input.walletAddress);
    const mint = new PublicKey(input.tokenMint);
    const tokenAccount = this.associatedTokenAddress(mint, owner);
    const balance = await this.tokenBalance(this.connection(), tokenAccount);
    const sufficient = BigInt(balance) >= BigInt(input.requiredAmount);
    return {
      verificationAvailable: true,
      sufficient,
      balance,
      tokenAccount: tokenAccount.toBase58(),
      issues: sufficient ? [] : ["Wallet token balance is below the requested lock amount."]
    };
  }

  async discoverWalletTokenBalances(input: { walletAddress: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        provider,
        tokens: [] as Array<{
          mint: string;
          tokenAccount: string;
          amount: string;
          decimals: number;
          uiAmountString: string;
        }>,
        issues: [`Wallet token discovery requires SOLANA_TRANSACTION_PROVIDER=devnet, current provider is ${provider}.`]
      };
    }

    const owner = new PublicKey(input.walletAddress);
    const accounts = await this.connection().getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, "confirmed");
    const tokens = accounts.value
      .map((account) => {
        const info = (account.account.data as any)?.parsed?.info;
        const amount = String(info?.tokenAmount?.amount ?? "0");
        return {
          mint: String(info?.mint ?? ""),
          tokenAccount: account.pubkey.toBase58(),
          amount,
          decimals: Number(info?.tokenAmount?.decimals ?? 0),
          uiAmountString: String(info?.tokenAmount?.uiAmountString ?? info?.tokenAmount?.uiAmount ?? "0")
        };
      })
      .filter((token) => token.mint && BigInt(token.amount || "0") > 0n);

    return {
      verificationAvailable: true,
      provider,
      tokens,
      issues: [] as string[]
    };
  }

  async verifySolPayment(input: { signature: string; payer: string; recipient: string; lamports: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        verified: false,
        signature: input.signature,
        message: `Live SOL payment verification is unavailable with SOLANA_TRANSACTION_PROVIDER=${provider}.`,
        issues: [`SOL payment verification requires SOLANA_TRANSACTION_PROVIDER=devnet and a confirmed signature.`]
      };
    }
    const connection = this.connection();
    const tx = await connection.getParsedTransaction(input.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!tx) {
      return {
        verificationAvailable: true,
        verified: false,
        signature: input.signature,
        message: "Payment transaction was not found or is not confirmed.",
        issues: ["Transaction signature not found at confirmed commitment."]
      };
    }
    const transfer = tx.transaction.message.instructions.find((instruction: any) => {
      const parsed = instruction.parsed;
      return parsed?.type === "transfer" &&
        parsed.info?.source === input.payer &&
        parsed.info?.destination === input.recipient &&
        BigInt(String(parsed.info?.lamports ?? 0)) >= BigInt(input.lamports);
    }) as any;
    const verified = Boolean(transfer);
    return {
      verificationAvailable: true,
      verified,
      signature: input.signature,
      payer: input.payer,
      recipient: input.recipient,
      requiredLamports: input.lamports,
      slot: tx.slot,
      message: verified ? "Community creation fee payment verified on-chain." : "Payment transaction did not contain the required transfer.",
      issues: verified ? [] : ["No matching SystemProgram transfer from payer to treasury for the required lamports."]
    };
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

    const programId = this.programId();
    const connection = this.connection();
    const tokenMint = new PublicKey(input.tokenMint);
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const positionProof = await this.verifyVaultPositionPda({
      walletAddress: input.walletAddress,
      tokenMint: input.tokenMint,
      nftAssetAddress: input.nftAssetAddress,
      vaultPositionPda: input.vaultPositionPda,
      expectedAmount: input.expectedAmount,
      expectedRedeemed: false,
      expectedStaked: false
    });
    let vaultBalanceAmount = "0";
    let vaultBalanceError: string | null = null;
    const vaultTokenProof = await this.tokenAccountProof(connection, vaultTokenAccount);
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
      ...positionProof.issues,
      vaultBalanceError ? `Vault token account balance could not be fetched: ${vaultBalanceError}` : null,
      !vaultTokenProof.exists ? "Vault token account does not exist after mint." : null,
      vaultTokenProof.mint && vaultTokenProof.mint !== input.tokenMint ? "Vault token account mint does not match the collection token mint." : null,
      vaultTokenProof.owner && vaultTokenProof.owner !== tokenVaultAuthority.toBase58() ? "Vault token account is not owned by the token vault authority PDA." : null,
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
      vaultPosition: positionProof.position,
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
    const programId = this.programId();
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const [tokenVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId);
    const vaultTokenAccount = this.associatedTokenAddress(tokenMint, tokenVaultAuthority);
    const positionProof = await this.verifyVaultPositionPda({
      walletAddress: input.walletAddress,
      tokenMint: input.tokenMint,
      nftAssetAddress: input.nftAssetAddress,
      vaultPositionPda: input.vaultPositionPda,
      expectedAmount: input.lockedAmount,
      expectedRedeemed: true,
      expectedStaked: false
    });
    const redeemed = Boolean(positionProof.position?.redeemed);
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
      ...positionProof.issues,
      !userIncreased ? "User token balance did not increase by the locked amount." : null,
      !vaultDecreased ? "Vault token balance did not decrease by the locked amount." : null,
      coreAssetStillExists ? "Core asset still exists after redeem; NFT was not invalidated/burned." : null
    ].filter(Boolean);
    return {
      passed: issues.length === 0,
      issues,
      vaultPositionPda: input.vaultPositionPda,
      redeemed,
      vaultPosition: positionProof.position,
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
    const programId = this.programId();

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
      return this.confirmExternalSignature(input.txSignature!);
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

  async verifyCommunityProfileInitialization(input: { tokenMint: string; collectionAssetAddress?: string | null; walletAddress?: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        passed: false,
        issues: [`Community profile verification requires SOLANA_TRANSACTION_PROVIDER=devnet, current provider is ${provider}.`],
        addresses: this.deriveCommunityAddresses({ tokenMint: input.tokenMint, walletAddress: input.walletAddress }),
        reserve: null,
        collectionAssetExists: false
      };
    }
    const connection = this.connection();
    const addresses = this.deriveCommunityAddresses({ tokenMint: input.tokenMint, walletAddress: input.walletAddress });
    const [globalInfo, profileInfo, feeInfo, tokenVaultStateInfo, reserveProof] = await Promise.all([
      connection.getAccountInfo(new PublicKey(addresses.globalConfig), "confirmed"),
      connection.getAccountInfo(new PublicKey(addresses.collectionProfile), "confirmed"),
      connection.getAccountInfo(new PublicKey(addresses.feeVault), "confirmed"),
      connection.getAccountInfo(new PublicKey(addresses.tokenVaultState), "confirmed"),
      this.verifyReserveCustody({ tokenMint: input.tokenMint, expectedBackingAmount: "0" })
    ]);
    let collectionAssetExists = true;
    let collectionAssetIssue: string | null = null;
    if (input.collectionAssetAddress) {
      try {
        await fetchCollectionV1(createUmi(this.rpcUrl()), publicKey(input.collectionAssetAddress));
      } catch (error) {
        collectionAssetExists = false;
        collectionAssetIssue = `Core collection asset could not be fetched: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    const issues = [
      !globalInfo ? "Global platform config PDA is missing." : null,
      !profileInfo ? "Collection profile PDA is missing." : null,
      !feeInfo ? "Fee vault PDA is missing." : null,
      !tokenVaultStateInfo ? "Token vault state PDA is missing." : null,
      ...reserveProof.issues,
      collectionAssetIssue,
      input.collectionAssetAddress && !collectionAssetExists ? "Core collection asset is missing." : null
    ].filter(Boolean) as string[];
    return {
      verificationAvailable: true,
      passed: issues.length === 0,
      issues,
      addresses,
      reserve: reserveProof,
      collectionAssetExists
    };
  }

  async verifyReserveCustody(input: { tokenMint: string; expectedBackingAmount?: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const addresses = this.deriveCommunityAddresses({ tokenMint: input.tokenMint });
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        passed: false,
        balance: null as string | null,
        addresses,
        issues: [`Reserve custody verification requires SOLANA_TRANSACTION_PROVIDER=devnet, current provider is ${provider}.`]
      };
    }
    const connection = this.connection();
    const proof = await this.tokenAccountProof(connection, new PublicKey(addresses.reserveVaultTokenAccount));
    const expected = BigInt(input.expectedBackingAmount ?? "0");
    const balance = BigInt(proof.amount ?? "0");
    const issues = [
      !proof.exists ? "Reserve token account does not exist." : null,
      proof.mint && proof.mint !== input.tokenMint ? "Reserve token account mint does not match collection token mint." : null,
      proof.owner && proof.owner !== addresses.tokenVaultAuthority ? "Reserve token account owner is not the token vault authority PDA." : null,
      balance < expected ? "Reserve custody balance is below outstanding backing obligations." : null
    ].filter(Boolean) as string[];
    return {
      verificationAvailable: true,
      passed: issues.length === 0,
      balance: proof.amount ?? "0",
      addresses,
      tokenAccount: proof,
      issues
    };
  }

  async verifyVaultPositionPda(input: {
    walletAddress?: string;
    tokenMint: string;
    nftAssetAddress: string;
    vaultPositionPda: string;
    expectedAmount?: string;
    expectedRedeemed?: boolean;
    expectedStaked?: boolean;
  }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        passed: false,
        position: null as ReturnType<SolanaTransactionAdapterService["decodeVaultPosition"]> | null,
        issues: [`Vault position PDA verification requires SOLANA_TRANSACTION_PROVIDER=devnet, current provider is ${provider}.`]
      };
    }
    const programId = this.programId();
    const tokenMint = new PublicKey(input.tokenMint);
    const nftAsset = new PublicKey(input.nftAssetAddress);
    const expectedPda = PublicKey.findProgramAddressSync([Buffer.from(POSITION_SEED), nftAsset.toBuffer()], programId)[0];
    const [collectionProfile] = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId);
    const connection = this.connection();
    const accountInfo = await connection.getAccountInfo(new PublicKey(input.vaultPositionPda), "confirmed");
    const position = accountInfo ? this.decodeVaultPosition(accountInfo.data) : null;
    const issues = [
      expectedPda.toBase58() !== input.vaultPositionPda ? "Vault position PDA does not match the NFT asset seed." : null,
      !accountInfo ? "Vault position PDA account is missing." : null,
      position && position.collection !== collectionProfile.toBase58() ? "Vault position collection PDA does not match token mint." : null,
      position && input.walletAddress && position.owner !== input.walletAddress ? "Vault position owner does not match wallet." : null,
      position && position.tokenMint !== input.tokenMint ? "Vault position token mint does not match." : null,
      position && position.nftMint !== input.nftAssetAddress ? "Vault position NFT mint/Core asset does not match." : null,
      position && input.expectedAmount !== undefined && position.amount !== input.expectedAmount ? "Vault position locked amount does not match." : null,
      position && input.expectedRedeemed !== undefined && position.redeemed !== input.expectedRedeemed ? `Vault position redeemed flag expected ${input.expectedRedeemed}.` : null,
      position && input.expectedStaked !== undefined && position.staked !== input.expectedStaked ? `Vault position staked flag expected ${input.expectedStaked}.` : null
    ].filter(Boolean) as string[];
    return {
      verificationAvailable: true,
      passed: issues.length === 0,
      expectedPda: expectedPda.toBase58(),
      position,
      issues
    };
  }

  async buildTokenMetadataWriteTransaction(input: { walletAddress: string; mint: string; name: string; symbol: string; metadataUri: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const mint = new PublicKey(input.mint);
    const payer = new PublicKey(input.walletAddress);
    const metadataPda = this.metadataPda(mint);
    if (provider !== "devnet") {
      return {
        provider,
        base64UnsignedTransaction: null,
        metadataPda: metadataPda.toBase58(),
        warning: "Token metadata write transaction is only serialized when SOLANA_TRANSACTION_PROVIDER=devnet."
      };
    }
    const connection = this.connection();
    const blockhash = await connection.getLatestBlockhash("confirmed");
    const metadataInfo = await connection.getAccountInfo(metadataPda, "confirmed");
    const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash.blockhash });
    tx.add(
      metadataInfo
        ? this.updateTokenMetadataInstruction({ metadataPda, updateAuthority: payer, name: input.name, symbol: input.symbol, uri: input.metadataUri })
        : this.createTokenMetadataInstruction({ metadataPda, mint, payer, mintAuthority: payer, updateAuthority: payer, name: input.name, symbol: input.symbol, uri: input.metadataUri })
    );
    return {
      provider: "devnet",
      network: "devnet",
      program: TOKEN_METADATA_PROGRAM_ID.toBase58(),
      action: metadataInfo ? "UPDATE_METADATA_ACCOUNT_V2" : "CREATE_METADATA_ACCOUNT_V3",
      metadataPda: metadataPda.toBase58(),
      base64UnsignedTransaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      requiredSigners: [payer.toBase58()],
      recentBlockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      transactionSummary: {
        mint: input.mint,
        metadataUri: input.metadataUri,
        name: input.name,
        symbol: input.symbol
      }
    };
  }

  async verifyTokenMetadataAccount(input: { mint: string; expectedUri?: string; expectedName?: string; expectedSymbol?: string }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    const mint = new PublicKey(input.mint);
    const metadataPda = this.metadataPda(mint);
    if (provider !== "devnet") {
      return {
        verificationAvailable: false,
        passed: false,
        metadataPda: metadataPda.toBase58(),
        issues: [`Token metadata verification requires SOLANA_TRANSACTION_PROVIDER=devnet, current provider is ${provider}.`]
      };
    }
    const info = await this.connection().getAccountInfo(metadataPda, "confirmed");
    const parsed = info ? this.decodeMetaplexMetadata(info.data) : null;
    const issues = [
      !info ? "Metaplex token metadata account is missing." : null,
      parsed && parsed.mint !== input.mint ? "Metadata account mint does not match." : null,
      parsed && input.expectedUri && parsed.uri !== input.expectedUri ? "Metadata URI does not match expected URI." : null,
      parsed && input.expectedName && parsed.name !== input.expectedName ? "Metadata name does not match expected name." : null,
      parsed && input.expectedSymbol && parsed.symbol !== input.expectedSymbol ? "Metadata symbol does not match expected symbol." : null
    ].filter(Boolean) as string[];
    return {
      verificationAvailable: true,
      passed: issues.length === 0,
      metadataPda: metadataPda.toBase58(),
      metadata: parsed,
      issues
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

  private initializePlatformData(defaultTreasury: PublicKey) {
    const treasury = new PublicKey(process.env.PROTOCOL_TREASURY_WALLET ?? process.env.COMMUNITY_CREATION_FEE_WALLET ?? process.env.DEVNET_TEST_WALLET_PUBLIC_KEY ?? defaultTreasury.toBase58());
    return Buffer.concat([
      this.discriminator("initialize_platform"),
      this.u64(process.env.COMMUNITY_CREATION_FEE_LAMPORTS ?? "1000000000"),
      this.u64(process.env.COMMUNITY_CREATION_MIN_CREATOR_TOKEN_BALANCE_RAW ?? "0"),
      treasury.toBuffer()
    ]);
  }

  private createCollectionProfileData(theme: string, mascot: string, vibe: string) {
    return Buffer.concat([
      this.discriminator("create_collection_profile"),
      this.stringArg(theme, 64),
      this.stringArg(mascot, 64),
      this.stringArg(vibe, 128)
    ]);
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

  private decodeVaultPosition(data: Buffer) {
    let offset = 8;
    const pubkey = () => {
      const value = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
      offset += 32;
      return value;
    };
    const u64 = () => {
      const value = data.readBigUInt64LE(offset).toString();
      offset += 8;
      return value;
    };
    const i64 = () => {
      const value = data.readBigInt64LE(offset).toString();
      offset += 8;
      return value;
    };
    const collection = pubkey();
    const owner = pubkey();
    const tokenMint = pubkey();
    const nftMint = pubkey();
    const positionId = u64();
    const amount = u64();
    const lockedAt = i64();
    const unlockTs = i64();
    const redeemed = data[offset++] === 1;
    const staked = data[offset++] === 1;
    const bump = data[offset];
    return { collection, owner, tokenMint, nftMint, positionId, amount, lockedAt, unlockTs, redeemed, staked, bump };
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

  private async confirmExternalSignature(txSignature: string) {
    const connection = this.connection();
    const status = await connection.getSignatureStatus(txSignature, { searchTransactionHistory: true });
    if (!status.value) {
      return {
        status: "SUBMITTED" as const,
        txSignature,
        confirmed: false,
        message: "External devnet signature was not found at confirmed commitment yet."
      };
    }
    if (status.value.err) {
      return {
        status: "FAILED" as const,
        txSignature,
        confirmed: false,
        message: JSON.stringify(status.value.err)
      };
    }
    const confirmed = status.value.confirmationStatus === "confirmed" || status.value.confirmationStatus === "finalized";
    return {
      status: confirmed ? ("CONFIRMED" as const) : ("SUBMITTED" as const),
      txSignature,
      confirmed,
      message: confirmed ? "External devnet transaction confirmed." : "External devnet signature found but not confirmed yet."
    };
  }

  private async tokenAccountProof(connection: Connection, tokenAccount: PublicKey) {
    const account = await connection.getParsedAccountInfo(tokenAccount, "confirmed");
    const parsed = (account.value?.data as any)?.parsed?.info;
    return {
      exists: Boolean(account.value),
      owner: typeof parsed?.owner === "string" ? parsed.owner : null,
      mint: typeof parsed?.mint === "string" ? parsed.mint : null,
      amount: typeof parsed?.tokenAmount?.amount === "string" ? parsed.tokenAmount.amount : null
    };
  }

  private metadataPda(mint: PublicKey) {
    return PublicKey.findProgramAddressSync([Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM_ID)[0];
  }

  private createTokenMetadataInstruction(input: { metadataPda: PublicKey; mint: PublicKey; payer: PublicKey; mintAuthority: PublicKey; updateAuthority: PublicKey; name: string; symbol: string; uri: string }) {
    return new TransactionInstruction({
      programId: TOKEN_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: input.metadataPda, isSigner: false, isWritable: true },
        { pubkey: input.mint, isSigner: false, isWritable: false },
        { pubkey: input.mintAuthority, isSigner: true, isWritable: false },
        { pubkey: input.payer, isSigner: true, isWritable: true },
        { pubkey: input.updateAuthority, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([Buffer.from([33]), this.metadataDataV2(input.name, input.symbol, input.uri), Buffer.from([1, 0])])
    });
  }

  private updateTokenMetadataInstruction(input: { metadataPda: PublicKey; updateAuthority: PublicKey; name: string; symbol: string; uri: string }) {
    return new TransactionInstruction({
      programId: TOKEN_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: input.metadataPda, isSigner: false, isWritable: true },
        { pubkey: input.updateAuthority, isSigner: true, isWritable: false }
      ],
      data: Buffer.concat([Buffer.from([15, 1]), this.metadataDataV2(input.name, input.symbol, input.uri), Buffer.from([0, 0, 1, 1])])
    });
  }

  private metadataDataV2(name: string, symbol: string, uri: string) {
    const sellerFeeBasisPoints = Buffer.alloc(2);
    sellerFeeBasisPoints.writeUInt16LE(0);
    return Buffer.concat([
      this.stringArg(name, 32),
      this.stringArg(symbol, 10),
      this.stringArg(uri, 200),
      sellerFeeBasisPoints,
      Buffer.from([0, 0, 0])
    ]);
  }

  private decodeMetaplexMetadata(data: Buffer) {
    let offset = 1;
    const updateAuthority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;
    const mint = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
    offset += 32;
    const readString = () => {
      const length = data.readUInt32LE(offset);
      offset += 4;
      const value = data.subarray(offset, offset + length).toString("utf8").replace(/\0+$/g, "");
      offset += length;
      return value;
    };
    return {
      updateAuthority,
      mint,
      name: readString(),
      symbol: readString(),
      uri: readString()
    };
  }

  private discriminator(name: string) {
    return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
  }

  private u64(value: string) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  }

  private stringArg(value: string, maxBytes?: number) {
    let bytes = Buffer.from(String(value ?? "").trim(), "utf8");
    if (maxBytes && bytes.length > maxBytes) bytes = bytes.subarray(0, maxBytes);
    const length = Buffer.alloc(4);
    length.writeUInt32LE(bytes.length);
    return Buffer.concat([length, bytes]);
  }

  private programId() {
    const programId = new PublicKey(process.env.PROGRAM_ID ?? PLACEHOLDER_PROGRAM_ID);
    if (programId.equals(SystemProgram.programId)) throw new Error("PROGRAM_ID must be configured for devnet protocol transactions.");
    return programId;
  }

  private programIdOrPlaceholder() {
    return new PublicKey(process.env.PROGRAM_ID ?? PLACEHOLDER_PROGRAM_ID);
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
