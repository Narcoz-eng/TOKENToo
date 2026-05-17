import type { VaultCollection, VaultNft } from "@/lib/types";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type TrustTone = "success" | "warning" | "error" | "idle";
type TrustSource = "live" | "cached";

export type ProtocolTrust = {
  verified: boolean;
  reserveStatus: string;
  reserveTone: TrustTone;
  lastVerifiedAt?: string | null;
  source: TrustSource;
};

export function ProtocolTrustStrip({ trust, compact = false, className }: { trust: ProtocolTrust; compact?: boolean; className?: string }) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4", className)}>
      <TrustBadge tone={trust.verified ? "success" : "warning"} iconAsset={trust.verified ? brandAssets.proofRing : brandAssets.errorGlitch} label={trust.verified ? "On-chain verified" : "Verification pending"} />
      <TrustBadge tone={trust.reserveTone} iconAsset={trust.reserveTone === "error" ? brandAssets.errorGlitch : brandAssets.vaultSafe} label={`Reserve ${normalizeReserveLabel(trust.reserveStatus)}`} />
      <TrustBadge tone={trust.source === "live" ? "success" : "idle"} iconAsset={trust.source === "live" ? brandAssets.energyBeam : brandAssets.vaultSafe} label={trust.source === "live" ? "Live" : "Cached"} />
      <TrustBadge tone={trust.lastVerifiedAt ? "idle" : "warning"} iconAsset={brandAssets.proofRing} label={formatTrustTime(trust.lastVerifiedAt)} />
    </div>
  );
}

export function ProtocolTrustInline({ trust, className }: { trust: ProtocolTrust; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <TrustBadge tone={trust.verified ? "success" : "warning"} iconAsset={trust.verified ? brandAssets.proofRing : brandAssets.errorGlitch} label={trust.verified ? "Verified" : "Pending"} />
      <TrustBadge tone={trust.reserveTone} iconAsset={trust.reserveTone === "error" ? brandAssets.errorGlitch : brandAssets.vaultSafe} label={normalizeReserveLabel(trust.reserveStatus)} />
      <TrustBadge tone={trust.source === "live" ? "success" : "idle"} iconAsset={trust.source === "live" ? brandAssets.energyBeam : brandAssets.vaultSafe} label={trust.source === "live" ? "Live" : "Cached"} />
    </div>
  );
}

export function TrustBadge({ tone, iconAsset, label }: { tone: TrustTone; iconAsset?: string; label: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-black uppercase", trustToneClass(tone))}>
      {iconAsset ? <img src={iconAsset} alt="" className="size-3.5 shrink-0 object-contain" /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function collectionTrust(collection: VaultCollection): ProtocolTrust {
  const lastVerifiedAt = readString(collection, ["lastOnChainVerifiedAt", "lastVerifiedAt", "verifiedAt"]);
  const verified = Boolean(collection.collectionAssetAddress && collection.reserveVaultPda && isConfirmed(collection.launchStatus));
  return {
    verified,
    reserveStatus: collection.reserveHealth ?? statusFromRisk(collection.riskTier),
    reserveTone: reserveTone(collection.reserveHealth ?? collection.riskTier),
    lastVerifiedAt,
    source: lastVerifiedAt ? "live" : "cached"
  };
}

export function vaultTrust(nft: VaultNft, collection?: VaultCollection | null): ProtocolTrust {
  const lastVerifiedAt = readString(nft, ["lastOnChainVerifiedAt", "lastVerifiedAt", "verifiedAt"]) ?? (collection ? collectionTrust(collection).lastVerifiedAt : null);
  const reserveStatus = collection?.reserveHealth ?? (collection ? statusFromRisk(collection.riskTier) : "N/A");
  return {
    verified: Boolean(nft.mint && collection?.collectionAssetAddress),
    reserveStatus,
    reserveTone: reserveTone(reserveStatus),
    lastVerifiedAt,
    source: lastVerifiedAt ? "live" : "cached"
  };
}

export function proofTrust(proof: {
  issues?: unknown[];
  lastVerifiedAt?: string | null;
  verificationResult?: {
    ownerVerificationAvailable?: boolean;
    collectionMatches?: boolean | null;
    reserveVaultStatus?: string | null;
    productionReady?: boolean;
  };
}): ProtocolTrust {
  const reserveStatus = proof.verificationResult?.reserveVaultStatus ?? "N/A";
  const hasBlockingIssues = Array.isArray(proof.issues) && proof.issues.length > 0;
  const verified = Boolean(
    !hasBlockingIssues &&
      proof.verificationResult?.ownerVerificationAvailable &&
      proof.verificationResult?.collectionMatches !== false &&
      proof.verificationResult?.productionReady
  );
  return {
    verified,
    reserveStatus,
    reserveTone: reserveTone(reserveStatus),
    lastVerifiedAt: proof.lastVerifiedAt,
    source: proof.lastVerifiedAt ? "live" : "cached"
  };
}

export function reserveTone(status?: string | null): TrustTone {
  const normalized = (status ?? "").toUpperCase();
  if (["HEALTHY", "ACTIVE", "SAFE", "OK", "READY"].some((value) => normalized.includes(value))) return "success";
  if (["AT_RISK", "WARNING", "MEDIUM", "PAUSED", "PENDING"].some((value) => normalized.includes(value))) return "warning";
  if (["RISK", "HIGH", "EMERGENCY", "FAILED", "INSOLVENT", "ERROR"].some((value) => normalized.includes(value))) return "error";
  return "idle";
}

export function formatTrustTime(value?: string | null) {
  if (!value) return "Last verified N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `Verified ${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function trustToneClass(tone: TrustTone) {
  if (tone === "success") return "border-vault-green/35 bg-vault-green/10 text-vault-green";
  if (tone === "warning") return "border-vault-gold/35 bg-vault-gold/10 text-vault-gold";
  if (tone === "error") return "border-vault-red/35 bg-vault-red/10 text-vault-red";
  return "border-vault-line bg-black/30 text-slate-400";
}

function normalizeReserveLabel(status?: string | null) {
  if (!status) return "N/A";
  return status.replace(/_/g, " ").toLowerCase();
}

function statusFromRisk(riskTier?: string | null) {
  if (riskTier === "SAFE") return "HEALTHY";
  if (riskTier === "MEDIUM") return "WARNING";
  if (riskTier) return "RISK";
  return "N/A";
}

function isConfirmed(status?: string | null) {
  return Boolean(status && ["CONFIRMED", "LAUNCHED", "ACTIVE", "READY"].some((value) => status.toUpperCase().includes(value)));
}

function readString(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
