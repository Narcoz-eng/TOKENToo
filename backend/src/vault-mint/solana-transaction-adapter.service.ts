import { Injectable } from "@nestjs/common";

@Injectable()
export class SolanaTransactionAdapterService {
  buildVaultMintTransaction(input: {
    walletAddress: string;
    collectionId: string;
    tokenMint: string;
    amount: string;
    lockDurationDays: number;
    metadataUri: string;
  }) {
    return {
      provider: process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock",
      network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
      standard: process.env.METAPLEX_NFT_STANDARD ?? "METAPLEX_CORE",
      requiredSigner: input.walletAddress,
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
        (process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock") === "mock"
          ? "This is a transaction plan, not a serialized production Solana transaction. Configure the real Solana adapter before launch."
          : undefined
    };
  }

  async submitAndConfirm(input: { transactionId: string; txSignature?: string; confirmMock?: boolean }) {
    const provider = process.env.SOLANA_TRANSACTION_PROVIDER ?? "mock";
    if (provider !== "mock") {
      return {
        status: "SUBMITTED" as const,
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
}
