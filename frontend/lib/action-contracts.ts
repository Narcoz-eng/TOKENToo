export type TransactionPhase = "idle" | "validating" | "signing" | "pending" | "confirmed" | "failed";

export type ActionContract = {
  action:
    | "MINT_VAULT"
    | "STAKE_VAULT"
    | "UNSTAKE_VAULT"
    | "CLAIM_REWARDS"
    | "JOIN_RAID"
    | "CREATE_MARKETPLACE_LISTING"
    | "PURCHASE_LISTING"
    | "INSTANT_SELL_QUOTE";
  method: "POST";
  path: string;
  implemented: boolean;
  requiresWallet: boolean;
};

export const actionContracts: ActionContract[] = [
  { action: "MINT_VAULT", method: "POST", path: "/vault/mint/intents", implemented: true, requiresWallet: true },
  { action: "STAKE_VAULT", method: "POST", path: "/staking/stake/intents", implemented: false, requiresWallet: true },
  { action: "UNSTAKE_VAULT", method: "POST", path: "/staking/unstake/intents", implemented: false, requiresWallet: true },
  { action: "CLAIM_REWARDS", method: "POST", path: "/staking/claim-rewards/intents", implemented: false, requiresWallet: true },
  { action: "JOIN_RAID", method: "POST", path: "/raids/:raidRoomId/join", implemented: false, requiresWallet: true },
  { action: "CREATE_MARKETPLACE_LISTING", method: "POST", path: "/marketplace/listings", implemented: true, requiresWallet: true },
  { action: "PURCHASE_LISTING", method: "POST", path: "/marketplace/purchases/intents", implemented: false, requiresWallet: true },
  { action: "INSTANT_SELL_QUOTE", method: "POST", path: "/marketplace/instant-sell/quotes", implemented: true, requiresWallet: true }
];
