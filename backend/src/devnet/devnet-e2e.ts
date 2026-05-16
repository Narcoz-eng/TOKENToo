import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadLocalEnv } from "../env/load-local-env";
import { SolanaTransactionAdapterService } from "../vault-mint/solana-transaction-adapter.service";
import { validateDevnetEnv } from "./devnet-env";

const GLOBAL_CONFIG_SEED = "global-config";
const COLLECTION_SEED = "collection";
const FEE_VAULT_SEED = "fee-vault";
const TOKEN_VAULT_STATE_SEED = "token-vault-state";
const TOKEN_VAULT_AUTHORITY_SEED = "token-vault-authority";
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

async function main() {
  loadLocalEnv();
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const programId = process.env.PROGRAM_ID;
  const tokenMint = process.env.DEVNET_TEST_TOKEN_MINT;
  const wallet = process.env.DEVNET_TEST_WALLET_PUBLIC_KEY;

  const missing = validateDevnetEnv();
  if (missing.length) {
    console.log(
      JSON.stringify(
        {
          status: "SKIPPED",
          reason: "Devnet E2E requires a deployed program, funded wallet, test SPL token, and final metadata storage env.",
          missing
        },
        null,
        2
      )
    );
    return;
  }

  const payer = loadKeypair();
  if (payer.publicKey.toBase58() !== wallet) {
    throw new Error("ANCHOR_WALLET does not match DEVNET_TEST_WALLET_PUBLIC_KEY.");
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const adapter = new SolanaTransactionAdapterService();
  const program = new PublicKey(programId!);
  const mint = new PublicKey(tokenMint!);
  const owner = new PublicKey(wallet!);
  const amount = "1";

  const communityLaunch = await ensureCommunityLaunch(adapter, payer, mint);
  const collectionAssetAddress = communityLaunch.collectionAssetAddress;
  const ownerTokenAccount = associatedTokenAddress(mint, owner);
  const collectionProfile = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), mint.toBuffer()], program)[0];
  const tokenVaultAuthority = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], program)[0];
  const vaultTokenAccount = associatedTokenAddress(mint, tokenVaultAuthority);
  const preMintUserTokenBalance = await tokenBalance(connection, ownerTokenAccount);
  const preMintVaultTokenBalance = await tokenBalance(connection, vaultTokenAccount);

  const transactionId = Keypair.generate().publicKey.toBase58();
  const mintTx = await adapter.buildVaultMintTransaction({
    transactionId,
    walletAddress: owner.toBase58(),
    collectionId: "devnet-e2e",
    tokenMint: mint.toBase58(),
    amount,
    lockDurationDays: 0,
    metadataUri: "ipfs://devnet-e2e-placeholder",
    collectionName: "Phew.run Devnet E2E",
    collectionAssetAddress
  });
  if (!mintTx.base64UnsignedTransaction || !mintTx.nftAssetAddress || !mintTx.vaultPositionPda) {
    throw new Error("Mint transaction builder did not return a complete signable devnet transaction.");
  }

  const signedMint = signBase64Transaction(mintTx.base64UnsignedTransaction, payer);
  const mintResult = await adapter.submitAndConfirm({ transactionId, signedTransaction: signedMint });
  if (!mintResult.confirmed || !mintResult.txSignature) throw new Error(`Mint transaction failed: ${mintResult.message}`);

  const postMintUserTokenBalance = await tokenBalance(connection, ownerTokenAccount);
  const postMintVaultTokenBalance = await tokenBalance(connection, vaultTokenAccount);
  const mintVerification = await retryPassed(
    () =>
      adapter.verifyMintFinalization({
        walletAddress: owner.toBase58(),
        tokenMint: mint.toBase58(),
        expectedAmount: amount,
        nftAssetAddress: mintTx.nftAssetAddress,
        collectionAssetAddress,
        vaultPositionPda: mintTx.vaultPositionPda
      }),
    30,
    2000
  );

  const redeemTransactionId = Keypair.generate().publicKey.toBase58();
  const redeemTx = await adapter.buildRedeemTransaction({
    transactionId: redeemTransactionId,
    walletAddress: owner.toBase58(),
    tokenMint: mint.toBase58(),
    nftAssetAddress: mintTx.nftAssetAddress,
    collectionAssetAddress,
    vaultPositionPda: mintTx.vaultPositionPda,
    lockedAmount: amount
  });
  if (!redeemTx.base64UnsignedTransaction) throw new Error("Redeem transaction builder did not return a signable devnet transaction.");

  const signedRedeem = signBase64Transaction(redeemTx.base64UnsignedTransaction, payer);
  const redeemResult = await adapter.submitAndConfirm({ transactionId: redeemTransactionId, signedTransaction: signedRedeem });
  if (!redeemResult.confirmed || !redeemResult.txSignature) throw new Error(`Redeem transaction failed: ${redeemResult.message}`);

  const redeemSummary = redeemTx.transactionSummary as { preRedeemUserTokenBalance?: string; preRedeemVaultTokenBalance?: string } | undefined;
  const redeemVerification = await retryPassed(
    () =>
      adapter.verifyRedeemFinalization({
        walletAddress: owner.toBase58(),
        tokenMint: mint.toBase58(),
        nftAssetAddress: mintTx.nftAssetAddress,
        vaultPositionPda: mintTx.vaultPositionPda,
        lockedAmount: amount,
        preRedeemUserTokenBalance: redeemSummary?.preRedeemUserTokenBalance,
        preRedeemVaultTokenBalance: redeemSummary?.preRedeemVaultTokenBalance
      }),
    30,
    2000
  );
  if (!redeemVerification.postRedeemUserTokenBalance || !redeemVerification.postRedeemVaultTokenBalance) {
    throw new Error("Redeem verification did not return post-redeem token balances.");
  }

  let doubleRedeemFailed = false;
  let doubleRedeemError: string | null = null;
  try {
    const doubleRedeemTx = await adapter.buildRedeemTransaction({
      transactionId: Keypair.generate().publicKey.toBase58(),
      walletAddress: owner.toBase58(),
      tokenMint: mint.toBase58(),
      nftAssetAddress: mintTx.nftAssetAddress,
      collectionAssetAddress,
      vaultPositionPda: mintTx.vaultPositionPda,
      lockedAmount: amount
    });
    if (!doubleRedeemTx.base64UnsignedTransaction) throw new Error("Double redeem builder did not return a transaction.");
    const signedDoubleRedeem = signBase64Transaction(doubleRedeemTx.base64UnsignedTransaction, payer);
    await adapter.submitAndConfirm({ transactionId: Keypair.generate().publicKey.toBase58(), signedTransaction: signedDoubleRedeem });
  } catch (error) {
    doubleRedeemFailed = true;
    doubleRedeemError = error instanceof Error ? error.message : String(error);
  }

  const proof = {
    status: "PASSED",
    PROGRAM_ID: program.toBase58(),
    DEVNET_TEST_TOKEN_MINT: mint.toBase58(),
    DEVNET_TEST_COLLECTION_ASSET: collectionAssetAddress,
    platformInitialized: communityLaunch.initializedPlatform,
    collectionProfileInitialized: communityLaunch.initializedCollectionProfile,
    reserveVaultTokenAccount: communityLaunch.reserveVaultTokenAccount,
    mintTxSignature: mintResult.txSignature,
    redeemTxSignature: redeemResult.txSignature,
    nftAssetAddress: mintTx.nftAssetAddress,
    vaultPositionPda: mintTx.vaultPositionPda,
    balances: {
      preMintUserTokenBalance,
      postMintUserTokenBalance,
      preMintVaultTokenBalance,
      postMintVaultTokenBalance,
      postRedeemUserTokenBalance: redeemVerification.postRedeemUserTokenBalance,
      postRedeemVaultTokenBalance: redeemVerification.postRedeemVaultTokenBalance
    },
    checks: {
      vaultTokenBalanceIncreasedAfterMint: BigInt(postMintVaultTokenBalance) >= BigInt(preMintVaultTokenBalance) + BigInt(amount),
      userTokenBalanceDecreasedAfterMint: BigInt(postMintUserTokenBalance) + BigInt(amount) <= BigInt(preMintUserTokenBalance),
      userTokenBalanceRestoredAfterRedeem: BigInt(redeemVerification.postRedeemUserTokenBalance) >= BigInt(preMintUserTokenBalance),
      coreAssetBurnedOrInvalidated: redeemVerification.coreAssetInvalidated,
      doubleRedeemFailed
    },
    doubleRedeemError
  };

  console.log(JSON.stringify(proof, null, 2));
}

async function ensureCommunityLaunch(adapter: SolanaTransactionAdapterService, payer: Keypair, mint: PublicKey) {
  const launch = await adapter.buildCommunityLaunchTransaction({
    walletAddress: payer.publicKey.toBase58(),
    tokenMint: mint.toBase58(),
    collectionName: "Phew.run Devnet E2E",
    metadataUri: "ipfs://devnet-e2e-collection",
    theme: "devnet",
    mascot: "test",
    vibe: "e2e"
  });
  if (!launch.base64UnsignedTransaction) throw new Error("Community launch builder did not return a signable devnet transaction.");
  const signed = signBase64Transaction(launch.base64UnsignedTransaction, payer);
  const result = await adapter.submitAndConfirm({ transactionId: "devnet-community-launch", signedTransaction: signed });
  if (!result.confirmed || !result.txSignature) throw new Error(`Community launch transaction failed: ${result.message}`);
  const verification = await retryPassed(
    () =>
      adapter.verifyCommunityProfileInitialization({
        walletAddress: payer.publicKey.toBase58(),
        tokenMint: mint.toBase58(),
        collectionAssetAddress: launch.collectionAssetAddress
      }),
    30,
    2000
  );
  return {
    collectionAssetAddress: launch.collectionAssetAddress,
    reserveVaultTokenAccount: launch.reserveVaultTokenAccount,
    initializedPlatform: Boolean((launch.transactionSummary as any)?.initializedPlatform),
    initializedCollectionProfile: Boolean((launch.transactionSummary as any)?.initializedCollectionProfile),
    verification
  };
}

function loadKeypair() {
  const walletPath = process.env.ANCHOR_WALLET ?? `${process.env.USERPROFILE}\\.config\\solana\\id.json`;
  const secret = JSON.parse(readFileSync(walletPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function ensurePlatform(connection: Connection, payer: Keypair, programId: PublicKey) {
  const globalConfig = PublicKey.findProgramAddressSync([Buffer.from(GLOBAL_CONFIG_SEED)], programId)[0];
  if (await connection.getAccountInfo(globalConfig, "confirmed")) return { initialized: false, globalConfig: globalConfig.toBase58() };

  const data = Buffer.concat([discriminator("initialize_platform"), u64(0), u64(0), payer.publicKey.toBuffer()]);
  const tx = new Transaction().add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: globalConfig, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    })
  );
  await sendAndConfirm(connection, tx, payer);
  return { initialized: true, globalConfig: globalConfig.toBase58() };
}

async function ensureCollectionProfile(connection: Connection, payer: Keypair, programId: PublicKey, tokenMint: PublicKey) {
  const globalConfig = PublicKey.findProgramAddressSync([Buffer.from(GLOBAL_CONFIG_SEED)], programId)[0];
  const collectionProfile = PublicKey.findProgramAddressSync([Buffer.from(COLLECTION_SEED), tokenMint.toBuffer()], programId)[0];
  if (await connection.getAccountInfo(collectionProfile, "confirmed")) return { initialized: false, collectionProfile };

  const feeVault = PublicKey.findProgramAddressSync([Buffer.from(FEE_VAULT_SEED), collectionProfile.toBuffer()], programId)[0];
  const tokenVaultState = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_STATE_SEED), collectionProfile.toBuffer()], programId)[0];
  const tokenVaultAuthority = PublicKey.findProgramAddressSync([Buffer.from(TOKEN_VAULT_AUTHORITY_SEED), collectionProfile.toBuffer()], programId)[0];
  const creatorTokenAccount = associatedTokenAddress(tokenMint, payer.publicKey);
  const data = Buffer.concat([discriminator("create_collection_profile"), stringArg("devnet"), stringArg("test"), stringArg("e2e")]);
  const tx = new Transaction().add(
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
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    })
  );
  await sendAndConfirm(connection, tx, payer);
  return { initialized: true, collectionProfile };
}

async function sendAndConfirm(connection: Connection, tx: Transaction, payer: Keypair) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.sign(payer);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  return signature;
}

function signBase64Transaction(base64UnsignedTransaction: string, payer: Keypair) {
  const tx = Transaction.from(Buffer.from(base64UnsignedTransaction, "base64"));
  tx.partialSign(payer);
  return tx.serialize().toString("base64");
}

async function tokenBalance(connection: Connection, tokenAccount: PublicKey) {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount, "confirmed");
    return balance.value.amount;
  } catch {
    return "0";
  }
}

async function retry<T>(operation: () => Promise<T>, attempts: number, delayMs: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function retryPassed<T extends { passed: boolean; issues?: unknown }>(operation: () => Promise<T>, attempts: number, delayMs: number) {
  let lastResult: T | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await operation();
      if (result.passed) return result;
      lastResult = result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (lastResult) throw new Error(`Finalization failed: ${JSON.stringify(lastResult.issues ?? lastResult)}`);
  throw lastError;
}

function associatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];
}

function discriminator(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function u64(value: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function stringArg(value: string) {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
