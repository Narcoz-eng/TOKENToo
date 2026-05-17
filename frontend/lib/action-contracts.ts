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
  { action: "MINT_VAULT", method: "POST", path: "/vaults/mint/intent", implemented: true, requiresWallet: true },
  { action: "STAKE_VAULT", method: "POST", path: "/vaults/:mint/stake", implemented: true, requiresWallet: true },
  { action: "UNSTAKE_VAULT", method: "POST", path: "/vaults/:mint/unstake", implemented: true, requiresWallet: true },
  { action: "CLAIM_REWARDS", method: "POST", path: "/staking/claim-rewards/intents", implemented: false, requiresWallet: true },
  { action: "JOIN_RAID", method: "POST", path: "/raids/:raidRoomId/join", implemented: false, requiresWallet: true },
  { action: "CREATE_MARKETPLACE_LISTING", method: "POST", path: "/marketplace/listings", implemented: true, requiresWallet: true },
  { action: "PURCHASE_LISTING", method: "POST", path: "/marketplace/purchases/intents", implemented: false, requiresWallet: true },
  { action: "INSTANT_SELL_QUOTE", method: "POST", path: "/marketplace/instant-sell/quotes", implemented: true, requiresWallet: true }
];

export type BackendActionResponse = {
  ok?: boolean;
  success?: boolean;
  status?: string | null;
  state?: string | null;
  phase?: string | null;
  code?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  payoutStatus?: string | null;
  action?: ActionContract["action"] | string | null;
  vaultStatus?: string | null;
  confirmed?: boolean | null;
  completed?: boolean | null;
  txSignature?: string | null;
  position?: {
    status?: string | null;
  } | null;
  result?: {
    status?: string | null;
    message?: string | null;
    confirmed?: boolean | null;
    completed?: boolean | null;
    txSignature?: string | null;
  } | null;
  data?: unknown;
};

export type BackendActionOutcome = {
  phase: TransactionPhase;
  confirmed: boolean;
  backendStatus: string;
  detail?: string;
};

const completedPattern = /\b(CONFIRMED|COMPLETE|COMPLETED|SUCCESS|SUCCEEDED|SETTLED|APPROVED|JOINED|CLAIMED|MINTED|REDEEMED|STAKED|UNSTAKED|PAID)\b/;
const failedPattern = /\b(FAILED|FAILURE|ERROR|REJECTED|CANCELLED|CANCELED|SKIPPED|NOT_IMPLEMENTED|UNAVAILABLE|DISABLED|BLOCKED|DENIED|NEEDS_[A-Z_]+|NOT_PAID|NO_ADAPTER|ACCOUNTED_NOT_PAID)\b/;
const pendingPattern = /\b(PENDING|PROCESSING|SUBMITTED|SUBMITTING|BUILT|BUILD_READY|READY|INTENT|CREATED|VALIDATING|QUEUED)\b/;

export function backendActionOutcome(result: unknown, fallbackDetail = "Backend accepted the request but did not return a completed action status."): BackendActionOutcome {
  const payload = actionPayload(result);
  const statusText = backendStatusText(result, payload);
  const detail = backendActionDetail(result, payload) ?? fallbackDetail;
  const explicitFailure = payload.ok === false || payload.success === false;
  const explicitConfirmed = payload.confirmed === true || payload.completed === true || payload.result?.confirmed === true || payload.result?.completed === true;
  const actionCompleted = completedByActionContract(payload);

  if (explicitFailure || failedPattern.test(statusText)) {
    return { phase: "failed", confirmed: false, backendStatus: statusText, detail };
  }

  if (explicitConfirmed || actionCompleted || completedPattern.test(statusText)) {
    return { phase: "confirmed", confirmed: true, backendStatus: statusText, detail: backendActionDetail(result, payload) };
  }

  if (pendingPattern.test(statusText) || payload.ok === true || payload.success === true || Boolean(statusText)) {
    return { phase: "pending", confirmed: false, backendStatus: statusText, detail };
  }

  return { phase: "pending", confirmed: false, backendStatus: statusText, detail };
}

export function assertBackendActionCompleted(result: unknown, fallbackDetail?: string): BackendActionOutcome {
  const outcome = backendActionOutcome(result, fallbackDetail);
  if (!outcome.confirmed) {
    throw new Error(outcome.detail ?? "Backend did not confirm a completed action.");
  }
  return outcome;
}

function actionPayload(result: unknown): BackendActionResponse {
  if (!result || typeof result !== "object") return {};
  const record = result as BackendActionResponse;
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return { ...record, ...(record.data as BackendActionResponse) };
  }
  return record;
}

function backendStatusText(root: unknown, payload: BackendActionResponse) {
  return [
    payload.status,
    payload.state,
    payload.phase,
    payload.payoutStatus,
    payload.code,
    payload.action,
    payload.vaultStatus,
    payload.position?.status,
    payload.result?.status,
    root && typeof root === "object" ? (root as BackendActionResponse).status : null,
    root && typeof root === "object" ? (root as BackendActionResponse).payoutStatus : null
  ]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .join(" ")
    .toUpperCase();
}

function backendActionDetail(root: unknown, payload: BackendActionResponse) {
  const rootRecord = root && typeof root === "object" ? (root as BackendActionResponse) : {};
  return [payload.message, payload.errorMessage, payload.result?.message, rootRecord.message, rootRecord.errorMessage]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
}

function completedByActionContract(payload: BackendActionResponse) {
  const action = String(payload.action ?? "").toUpperCase();
  const positionStatus = String(payload.position?.status ?? "").toUpperCase();
  const vaultStatus = String(payload.vaultStatus ?? "").toUpperCase();
  if (action === "STAKE_VAULT") return positionStatus === "ACTIVE";
  if (action === "UNSTAKE_VAULT") return ["UNSTAKED", "INACTIVE", "CLOSED", "REDEEMED"].includes(positionStatus) || ["LOCKED", "REDEEMABLE", "REDEEMED"].includes(vaultStatus);
  return false;
}
