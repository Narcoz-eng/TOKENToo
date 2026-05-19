"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PhewEmptyState } from "@/components/PhewEmptyState";
import { PhewPageHero } from "@/components/PhewPageHero";
import { PhewSuccessMomentModal } from "@/components/PhewSuccessMomentModal";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type AccessMethod = "CREATION_FEE_SOL" | "WHALE_HOLDER" | "SUBSCRIPTION_STUDIO" | "ADMIN_GRANT";

type TokenScan = {
  mint: string;
  symbol: string;
  name: string;
  description?: string;
  decimals?: number;
  supply?: string | number;
  imageUri?: string;
  metadataUri?: string;
  provider?: string;
  indexed?: boolean;
  liquidityUsd?: number;
  marketCapUsd?: number;
  holders?: number;
  riskScore?: number;
  riskNotes?: string[];
  reasons?: string[];
  persistenceWarning?: string;
};

type CommunitySummary = {
  id: string;
  slug: string;
  name: string;
  tokenMint: string;
  creatorWallet?: string;
  launchStatus: string;
  riskStatus?: string;
  reserveVaultPda?: string | null;
  strategy?: { type: string; status: string; approvedByCreator: boolean };
};

type CreateCommunityResponse = {
  ok?: boolean;
  reused?: boolean;
  accessRequired?: boolean;
  access?: { method: string; status: string; metadata?: Record<string, unknown> };
  collection?: CommunitySummary;
  token?: TokenScan;
  message?: string;
};

type LaunchUnsignedTransaction = {
  base64UnsignedTransaction?: string | null;
  collectionAssetAddress?: string | null;
  onchainProfilePda?: string | null;
  reserveVaultTokenAccount?: string | null;
  tokenVaultAuthority?: string | null;
  tokenVaultStatePda?: string | null;
  feeVaultPda?: string | null;
};

type LaunchResponse = {
  ok?: boolean;
  idempotent?: boolean;
  collection?: CommunitySummary;
  launchUnsignedTransaction?: LaunchUnsignedTransaction | null;
  result?: {
    confirmed?: boolean;
    status?: string;
    txSignature?: string;
    message?: string;
  };
  verification?: {
    verificationAvailable?: boolean;
    passed?: boolean;
    collectionAssetExists?: boolean;
    reserve?: { balance?: string };
    addresses?: Record<string, string>;
    issues?: string[];
  };
};

type ReserveProof = {
  collectionId: string;
  collectionSlug?: string;
  collectionName: string;
  tokenMint: string;
  tokenSymbol: string;
  reserveVaultPda?: string | null;
  feeVaultPda?: string | null;
  totalLocked: string;
  totalRedeemed: string;
  totalStaked: string;
  availableBacking: string;
  reserveRatioBps: number;
  status: string;
  launchStatus: string;
  lastOnChainVerifiedAt?: string | null;
  productionReady?: boolean;
};

type ReserveResponse = {
  ok?: boolean;
  productionReady?: boolean;
  reserve?: ReserveProof;
};

type LaunchStatusResponse = LaunchResponse & {
  launch?: {
    status?: string;
    txSignature?: string | null;
    collectionAssetAddress?: string | null;
    onchainProfilePda?: string | null;
    feeVaultPda?: string | null;
    tokenVaultPda?: string | null;
    launchedAt?: string | null;
    productionReady?: boolean;
  };
};

const accessMethods: Array<{ value: AccessMethod; label: string; help: string }> = [
  { value: "CREATION_FEE_SOL", label: "1 SOL fee", help: "Submit a confirmed transfer signature to the protocol treasury." },
  { value: "WHALE_HOLDER", label: "Whale gate", help: "Backend verifies the connected wallet holds the configured raw threshold." },
  { value: "SUBSCRIPTION_STUDIO", label: "Subscription", help: "Backend checks the configured subscription wallet registry." },
  { value: "ADMIN_GRANT", label: "Admin grant", help: "Protocol admin wallets only." }
];

export default function CreateCommunityPage() {
  const wallet = useWalletAuth();
  const [tokenMint, setTokenMint] = useState("");
  const [accessMethod, setAccessMethod] = useState<AccessMethod>("CREATION_FEE_SOL");
  const [paymentSignature, setPaymentSignature] = useState("");
  const [externalLaunchSignature, setExternalLaunchSignature] = useState("");
  const [scan, setScan] = useState<TokenScan | null>(null);
  const [community, setCommunity] = useState<CreateCommunityResponse | null>(null);
  const [launchBuild, setLaunchBuild] = useState<LaunchResponse | null>(null);
  const [launchSubmit, setLaunchSubmit] = useState<LaunchResponse | null>(null);
  const [launchStatus, setLaunchStatus] = useState<LaunchStatusResponse | null>(null);
  const [accessResult, setAccessResult] = useState<CreateCommunityResponse | null>(null);
  const [reserve, setReserve] = useState<ReserveProof | null>(null);
  const [activeAction, setActiveAction] = useState<"scan" | "create" | "payment" | "whale" | "build" | "submit" | "status" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const collection = launchSubmit?.collection ?? launchBuild?.collection ?? community?.collection ?? null;
  const launchTx = launchBuild?.launchUnsignedTransaction ?? null;
  const collectionAsset = launchSubmit?.verification?.addresses?.collectionAsset ?? launchTx?.collectionAssetAddress ?? null;
  const canLaunch = Boolean(collection?.id);
  const canSubmitLaunch = Boolean(launchTx?.base64UnsignedTransaction || externalLaunchSignature.trim());
  const launchConfirmed = Boolean(launchSubmit?.result?.confirmed || launchStatus?.launch?.status === "CONFIRMED");
  const successMomentKey = launchConfirmed ? launchSubmit?.result?.txSignature ?? launchStatus?.launch?.txSignature ?? collection?.id ?? null : null;
  const [successMomentOpen, setSuccessMomentOpen] = useState(false);
  const [lastSuccessMomentKey, setLastSuccessMomentKey] = useState<string | null>(null);

  const accessHelp = useMemo(() => accessMethods.find((method) => method.value === accessMethod)?.help, [accessMethod]);

  useEffect(() => {
    if (!successMomentKey || successMomentKey === lastSuccessMomentKey) return;
    setLastSuccessMomentKey(successMomentKey);
    setSuccessMomentOpen(true);
  }, [lastSuccessMomentKey, successMomentKey]);

  async function scanToken() {
    const mint = tokenMint.trim();
    if (!mint) return setError("Enter a Solana token mint before scanning.");
    setActiveAction("scan");
    setError(null);
    setScan(null);
    try {
      const response = await apiFetch<TokenScan>(`/tokens/${encodeURIComponent(mint)}/scan`, { timeoutMs: 30_000 });
      const data = unwrapApiData(response) ?? response;
      setScan(data);
      setTokenMint(data.mint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token scan failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function createCommunity() {
    const mint = (scan?.mint ?? tokenMint).trim();
    if (!mint) return setError("Scan or enter a Solana token mint first.");
    setActiveAction("create");
    setError(null);
      setLaunchBuild(null);
      setLaunchSubmit(null);
      setLaunchStatus(null);
      setAccessResult(null);
      setReserve(null);
    try {
      const response = await wallet.authFetch<CreateCommunityResponse>("/communities/from-token", {
        method: "POST",
        body: JSON.stringify({
          tokenMint: mint,
          accessMethod,
          paymentSignature: paymentSignature.trim() || undefined,
          idempotencyKey: `community:${mint}:${wallet.address ?? "wallet"}:${accessMethod}`
        })
      });
      setCommunity(response);
      if (response.token) setScan(response.token);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Community creation failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function verifyPayment() {
    if (!collection?.id) return setError("Create or load a community draft before verifying payment access.");
    if (!paymentSignature.trim()) return setError("Enter a confirmed payment signature first.");
    setActiveAction("payment");
    setError(null);
    try {
      const response = await wallet.authFetch<CreateCommunityResponse>(`/communities/${encodeURIComponent(collection.id)}/access/payment`, {
        method: "POST",
        body: JSON.stringify({ paymentSignature: paymentSignature.trim(), idempotencyKey: `payment:${collection.id}:${wallet.address ?? "wallet"}:${paymentSignature.trim()}` })
      });
      setAccessResult(response);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function verifyWhale() {
    if (!collection?.id) return setError("Create or load a community draft before verifying whale access.");
    setActiveAction("whale");
    setError(null);
    try {
      const response = await wallet.authFetch<CreateCommunityResponse>(`/communities/${encodeURIComponent(collection.id)}/access/verify-whale`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `whale:${collection.id}:${wallet.address ?? "wallet"}` })
      });
      setAccessResult(response);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Whale verification failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function buildLaunch() {
    if (!collection?.id) return setError("Create or load a community draft before launch build.");
    setActiveAction("build");
    setError(null);
    try {
      const response = await wallet.authFetch<LaunchResponse>(`/communities/${encodeURIComponent(collection.id)}/launch/build`, { method: "POST" });
      setLaunchBuild(response);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Community launch build failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function submitLaunch() {
    if (!collection?.id) return setError("Build a community launch transaction first.");
    const txSignature = externalLaunchSignature.trim();
    const base64 = launchTx?.base64UnsignedTransaction;
    if (!txSignature && !base64) return setError("Launch submit requires a wallet-signed transaction or a confirmed devnet signature.");
    setActiveAction("submit");
    setError(null);
    try {
      const signedTransactionBase64 = txSignature ? undefined : await wallet.signTransactionBase64(base64 ?? "");
      const response = await wallet.authFetch<LaunchResponse>(`/communities/${encodeURIComponent(collection.id)}/launch/submit`, {
        method: "POST",
        body: JSON.stringify(txSignature ? { txSignature } : { signedTransactionBase64 })
      });
      setLaunchSubmit(response);
      setLaunchStatus(null);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Community launch submit failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function refreshLaunchStatus() {
    if (!collection?.id) return setError("Create or load a community draft before checking launch status.");
    setActiveAction("status");
    setError(null);
    try {
      const response = await apiFetch<LaunchStatusResponse>(`/communities/${encodeURIComponent(collection.id)}/launch/status`, { cache: "no-store" });
      setLaunchStatus(response);
      if (response.collection?.id) await loadReserve(response.collection.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch status refresh failed");
    } finally {
      setActiveAction(null);
    }
  }

  async function loadReserve(id: string) {
    const response = await apiFetch<ReserveResponse>(`/collections/${encodeURIComponent(id)}/reserve`, { cache: "no-store" });
    setReserve(response.reserve ?? null);
  }

  return (
    <AppShell active="create-community">
      <div className="space-y-4">
        <PhewPageHero
          title="Create Community"
          subtitle="Scan token. Pass access gate. Build. Sign. Submit. All checks and actions are backend-first."
          mascotPose="launch"
          eyebrow={<StatusPill accent="green">Token reserve launch</StatusPill>}
          sidePanel={
            <div className="rounded-lg border border-vault-line bg-black/35 p-4">
              <h2 className="text-base font-black">Wallet Status</h2>
              <StatusLine label="Wallet" ok={wallet.connected} value={wallet.connected ? short(wallet.address, 6) : "Not connected"} />
              <StatusLine label="Network" ok value="Solana Devnet" />
            </div>
          }
        />

        {error ? <p className="rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</p> : null}

        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.08fr_0.95fr]">
          <SectionCard title="1. Token CA / Mint Scanner">
            <p className="mb-4 text-sm text-slate-400">Enter token mint address on Solana.</p>
            <div className="flex gap-2">
              <input value={tokenMint} onChange={(event) => setTokenMint(event.target.value)} className="phew-input h-12 min-w-0 flex-1 rounded-md px-4 text-sm" placeholder="Paste token mint address" />
              <button onClick={scanToken} disabled={activeAction === "scan" || !tokenMint.trim()} className="inline-flex size-12 shrink-0 items-center justify-center rounded-md border border-vault-green bg-vault-green/10 text-vault-green">
                <ActionIcon loading={activeAction === "scan"} asset={brandAssets.proofRing} />
              </button>
            </div>
            <button onClick={scanToken} disabled={activeAction === "scan" || !tokenMint.trim()} className="phew-button phew-button-primary mt-4 inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-black text-black">
              <ActionIcon loading={activeAction === "scan"} asset={brandAssets.proofRing} />
              Scan Token
            </button>
          </SectionCard>

          <SectionCard title="Scan Status">
            <div className="rounded-lg border border-vault-line bg-black/25 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10">
                  <ActionIcon loading={activeAction === "scan"} asset={scan ? brandAssets.rewardBurst : brandAssets.proofRing} />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-white">{activeAction === "scan" ? "Scanning token" : scan ? "Token scanned" : "Awaiting token CA"}</p>
                  <p className="mt-1 text-sm text-slate-400">Backend scan result drives the launch gate.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Fact label="Symbol" value={scan?.symbol ?? "N/A"} />
                <Fact label="Provider" value={scan?.provider ?? "N/A"} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="2. Token Scan Result">
            <div className="space-y-1">
              <Fact label="Token Name" value={scan?.name ?? "N/A"} />
              <Fact label="Symbol" value={scan?.symbol ?? "N/A"} />
              <Fact label="Mint Address" value={scan?.mint ? short(scan.mint, 12) : "N/A"} />
              <Fact label="Decimals" value={String(scan?.decimals ?? "N/A")} />
              <Fact label="Metadata URI" value={scan?.metadataUri ? short(scan.metadataUri, 14) : "N/A"} />
              <Fact label="Image URI" value={scan?.imageUri ? short(scan.imageUri, 14) : "N/A"} />
              <Fact label="Provider" value={scan?.provider ?? "N/A"} />
              <Fact label="Risk Score" value={formatNumber(scan?.riskScore)} />
            </div>
            <span className="mt-4 inline-flex rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{scan ? "Scanned" : "Unscanned"}</span>
          </SectionCard>
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.9fr_0.95fr]">
          <SectionCard title="3. Access Gate Requirements">
            <p className="mb-4 text-sm text-slate-400">All requirements must pass before Launch Build is available.</p>
            <div className="space-y-2">
              {accessMethods.map((method) => (
                <AccessGateRow
                  key={method.value}
                  method={method}
                  selected={accessMethod === method.value}
                  onSelect={() => setAccessMethod(method.value)}
                  onCheck={method.value === "CREATION_FEE_SOL" ? verifyPayment : method.value === "WHALE_HOLDER" ? verifyWhale : undefined}
                  checkDisabled={!collection || (method.value === "CREATION_FEE_SOL" && !paymentSignature.trim()) || activeAction === "payment" || activeAction === "whale"}
                />
              ))}
            </div>
            {accessMethod === "CREATION_FEE_SOL" ? (
              <label className="mt-4 block">
                <span className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
                  Payment Signature (Devnet)
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">Not verified</span>
                </span>
                <input value={paymentSignature} onChange={(event) => setPaymentSignature(event.target.value)} className="phew-input mt-2 h-11 w-full rounded-md px-4 text-sm" placeholder="Paste devnet tx signature" />
              </label>
            ) : (
              <p className="mt-4 rounded-md border border-vault-line bg-black/25 p-3 text-sm text-slate-400">{accessHelp}</p>
            )}
            <button onClick={createCommunity} disabled={activeAction === "create" || !tokenMint.trim()} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-vault-line bg-white/5 text-sm font-black text-slate-400 disabled:cursor-not-allowed disabled:opacity-60">
              <ActionIcon loading={activeAction === "create"} asset={brandAssets.pictograms.community} />
              Create Draft
            </button>
            {accessResult?.access ? <p className="mt-3 rounded-md border border-vault-green/25 bg-vault-green/10 p-3 text-sm text-vault-green">{accessResult.access.method} {accessResult.access.status}</p> : null}
          </SectionCard>

          <SectionCard title="4. Build, Sign & Submit">
            <p className="mb-4 text-sm text-slate-400">Actions become available when gate passes.</p>
            <div className="space-y-3">
              <LaunchAction label="Build Launch" detail="Build launch payload on backend." asset={brandAssets.energyBeam} onClick={buildLaunch} disabled={activeAction === "build" || !canLaunch} loading={activeAction === "build"} />
              <LaunchAction label="Sign Transaction" detail="Sign the payload with your wallet." asset={brandAssets.lockUnlock} onClick={submitLaunch} disabled={activeAction === "submit" || !canSubmitLaunch} loading={activeAction === "submit"} />
              <LaunchAction label="Submit Launch" detail="Submit signed payload to backend." asset={brandAssets.vaultSafe} onClick={refreshLaunchStatus} disabled={activeAction === "status" || !collection} loading={activeAction === "status"} />
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase text-slate-500">External launch signature</span>
              <input value={externalLaunchSignature} onChange={(event) => setExternalLaunchSignature(event.target.value)} className="phew-input mt-2 h-11 w-full rounded-md px-4 text-sm" placeholder="Optional confirmed signature" />
            </label>
            {launchTx?.base64UnsignedTransaction ? <p className="mt-3 break-all rounded-md border border-vault-line bg-black/25 p-3 font-mono text-xs text-slate-400">Unsigned launch tx: {short(launchTx.base64UnsignedTransaction, 64)}</p> : null}
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="5. Reserve Proof (Post-Build)">
              <p className="mb-4 text-sm text-slate-400">Backend will return reserve proof after build.</p>
              <Fact label="Reserve PDA" value={reserve?.reserveVaultPda ?? collection?.reserveVaultPda ?? "N/A"} />
              <Fact label="Lock Amount" value={reserve ? `${reserve.totalLocked} ${reserve.tokenSymbol}` : "N/A"} />
              <Fact label="Unlock Schedule" value="N/A" />
              <Fact label="Proof Status" value={reserve?.status ?? "N/A"} />
              <span className="mt-4 inline-flex rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{reserve ? "Proof returned" : "Not built"}</span>
            </SectionCard>

            <SectionCard title="6. Launch Verification">
              <div className="space-y-1">
                <Fact label="Ownership Verified" value={launchSubmit?.verification?.passed ? "Yes" : "N/A"} />
                <Fact label="Reserve Verified" value={launchSubmit?.verification?.reserve?.balance ?? "N/A"} />
                <Fact label="Access Gates" value={accessResult?.access?.status ?? "N/A"} />
                <Fact label="Launch Status" value={launchStatus?.launch?.status ?? collection?.launchStatus ?? "N/A"} />
              </div>
              <span className="mt-4 inline-flex rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{launchStatus ? "Checked" : "Not submitted"}</span>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="Recent Community Launch Activity">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Token</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Mint</th>
                  <th className="py-2">Requested By</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created At</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="border-t border-vault-line py-6">
                    <PhewEmptyState
                      mascotPose="running"
                      title="No community launches yet"
                      body="Launch activity appears here only after real backend launch rows exist."
                      compact
                      table
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
        {successMomentOpen && successMomentKey ? (
          <PhewSuccessMomentModal
            action="community-launch"
            tokenSymbol={scan?.symbol ?? reserve?.tokenSymbol ?? "TOKEN"}
            nftImage={scan?.imageUri ?? null}
            title="Community launched"
            subtitle="The backend confirmed launch state for the community reserve and collection."
            txSignature={launchSubmit?.result?.txSignature ?? launchStatus?.launch?.txSignature}
            proofUrl={collection?.id ? `/collections/${encodeURIComponent(collection.id)}` : undefined}
            onClose={() => setSuccessMomentOpen(false)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ActionIcon({ asset, loading }: { asset: string; loading: boolean }) {
  return <img src={asset} alt="" className={cn("size-5 object-contain", loading && "animate-spin")} />;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-vault-line py-3 last:border-0">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function AccessGateRow({
  method,
  selected,
  onSelect,
  onCheck,
  checkDisabled
}: {
  method: { value: AccessMethod; label: string; help: string };
  selected: boolean;
  onSelect: () => void;
  onCheck?: () => void;
  checkDisabled?: boolean;
}) {
  const checkAvailable = Boolean(onCheck);
  return (
    <div className={cn("rounded-lg border bg-black/25 p-3 transition", selected ? "border-vault-green/60 shadow-green" : "border-vault-line hover:border-vault-cyan/35")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-md border bg-black/30", selected ? "border-vault-green/55 bg-vault-green/10" : "border-vault-line")}>
            <img src={accessMethodAsset(method.value)} alt="" className="size-7 object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-white">{method.label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">{method.help}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onCheck}
          disabled={!checkAvailable || checkDisabled}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-xs font-black transition",
            checkAvailable ? "border-vault-green/45 bg-vault-green/10 text-vault-green hover:border-vault-green" : "border-vault-line bg-black/25 text-slate-500",
            (!checkAvailable || checkDisabled) && "cursor-not-allowed opacity-55"
          )}
        >
          {checkAvailable ? "Check" : "Backend gate"}
        </button>
      </div>
    </div>
  );
}

function LaunchAction({
  label,
  detail,
  asset,
  onClick,
  disabled,
  loading
}: {
  label: string;
  detail: string;
  asset: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-lg border border-vault-line bg-black/25 p-3 text-left transition hover:border-vault-green/45 hover:bg-vault-green/8",
        disabled && "cursor-not-allowed opacity-55 hover:border-vault-line hover:bg-black/25"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-md border border-vault-green/30 bg-vault-green/10">
          <ActionIcon loading={Boolean(loading)} asset={asset} />
        </span>
        <span className="min-w-0">
          <strong className="block text-sm text-white">{label}</strong>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
        </span>
      </span>
      <img src={brandAssets.energyBeam} alt="" className="size-5 shrink-0 object-contain opacity-60 transition group-hover:opacity-100" />
    </button>
  );
}

function StatusLine({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-vault-line py-3 text-sm last:border-0">
      <span className="text-slate-300">{label}</span>
      <span className={cn("min-w-0 break-words text-right font-bold", ok ? "text-vault-green" : "text-slate-500")}>
        <img src={ok ? brandAssets.rewardBurst : brandAssets.proofRing} alt="" className="mr-1 inline size-4 object-contain align-[-2px]" />
        {value ?? (ok ? "Ready" : "Pending")}
      </span>
    </div>
  );
}

function accessMethodAsset(method: AccessMethod) {
  if (method === "CREATION_FEE_SOL") return brandAssets.tokenObject;
  if (method === "WHALE_HOLDER") return brandAssets.pictograms.lockTokens;
  if (method === "SUBSCRIPTION_STUDIO") return brandAssets.pictograms.strategy;
  return brandAssets.pictograms.proof;
}

function short(value?: string | null, size = 10) {
  if (!value) return "N/A";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function formatNumber(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "N/A";
}

function formatUsd(value: unknown) {
  return typeof value === "number" ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
}

function formatSimulatedTvl(rawAmount: string, scan: TokenScan | null) {
  const trimmed = rawAmount.trim();
  if (!trimmed || !scan) return "N/A";
  if (!/^\d+$/.test(trimmed)) return "Invalid raw amount";
  return `${formatRawAmount(trimmed, scan.decimals ?? 0)} ${scan.symbol || "tokens"}`;
}

function formatRawAmount(rawAmount: string, decimals: number) {
  const normalized = rawAmount.replace(/^0+(?=\d)/, "");
  if (decimals <= 0) return normalized;
  const padded = normalized.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
