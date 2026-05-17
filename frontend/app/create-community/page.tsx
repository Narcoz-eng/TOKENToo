"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { apiFetch, unwrapApiData } from "@/lib/api";
import { brandAssets } from "@/lib/brand-assets";
import { TransactionFlow, type TransactionFlowState } from "@/components/TransactionFlow";
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
  const [simulatedLockAmount, setSimulatedLockAmount] = useState("");
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
  const launchFlowState: TransactionFlowState = !wallet.connected ? "wallet-disconnected" : communityFlowState(error, activeAction, launchSubmit, launchStatus);

  const accessHelp = useMemo(() => accessMethods.find((method) => method.value === accessMethod)?.help, [accessMethod]);

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
      <div className="space-y-6">
        <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg p-5">
          <img src={brandAssets.launchHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020806] via-[#020806]/92 to-[#020806]/42" />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-center">
            <div>
              <StatusPill accent="green">Create Community</StatusPill>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Launch your economy from a real token reserve.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300">
                Scan the token, pass access, create the draft, then initialize the reserve through backend launch routes. No generation or paid provider work runs from this page.
              </p>
            </div>
            <TransactionFlow
              state={launchFlowState}
              moment="community-launch"
              title="Community launch"
              description="Token scan, access verification, launch transaction, and reserve proof all come from backend state."
              image={scan?.imageUri ?? null}
              tokenSymbol={scan?.symbol ?? collection?.name ?? "PHEW"}
              detail={error ?? launchSubmit?.result?.message ?? launchStatus?.launch?.status ?? null}
              compact
            />
          </div>
        </section>

        {error ? <p className="rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">{error}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-6">
            <SectionCard title="CA Scan">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Token CA / mint</span>
                  <input value={tokenMint} onChange={(event) => setTokenMint(event.target.value)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm" placeholder="Solana token mint address" />
                </label>
                <button onClick={scanToken} disabled={activeAction === "scan" || !tokenMint.trim()} className="phew-button phew-button-primary mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
                  <ActionIcon loading={activeAction === "scan"} asset={brandAssets.proofRing} />
                  Scan
                </button>
              </div>
              {scan ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-lg border border-vault-line bg-black/25 p-4">
                    <img src={scan.imageUri || brandAssets.mascot} alt="" className="mx-auto size-24 rounded-lg border border-vault-line bg-black/40 object-contain p-2" />
                    <p className="mt-4 text-center text-lg font-black text-white">{scan.name || "N/A"}</p>
                    <p className="text-center text-sm font-black text-vault-green">{scan.symbol || "N/A"}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Fact label="Mint" value={short(scan.mint)} />
                    <Fact label="Supply" value={String(scan.supply ?? "N/A")} />
                    <Fact label="Decimals" value={String(scan.decimals ?? "N/A")} />
                    <Fact label="Risk score" value={formatNumber(scan.riskScore)} />
                    <Fact label="Metadata URI" value={scan.metadataUri ? short(scan.metadataUri, 18) : "N/A"} />
                    <Fact label="Provider" value={scan.provider ?? "N/A"} />
                    <Fact label="Indexed" value={scan.indexed ? "Yes" : "No"} />
                    <Fact label="Holders" value={formatNumber(scan.holders)} />
                    <Fact label="Liquidity" value={formatUsd(scan.liquidityUsd)} />
                    <Fact label="Market cap" value={formatUsd(scan.marketCapUsd)} />
                  </div>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard title="TVL Simulation">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Raw token amount to lock</span>
                  <input
                    value={simulatedLockAmount}
                    onChange={(event) => setSimulatedLockAmount(event.target.value)}
                    className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm"
                    inputMode="numeric"
                    placeholder="Example: 1000000000"
                  />
                </label>
                <div className="rounded-lg border border-vault-line bg-black/25 p-4">
                  <p className="text-xs uppercase text-slate-500">Simulated TVL</p>
                  <p className="mt-2 break-words text-lg font-black text-white">{formatSimulatedTvl(simulatedLockAmount, scan)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Simulation is a frontend estimate of the raw token reserve only. USD TVL stays N/A unless the backend scan returns market context and the actual launch route confirms reserve balances.
              </p>
            </SectionCard>

            <SectionCard title="Vault Mechanics">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ["1", "Token scan", "Backend reads metadata, risk notes, and market context for the submitted mint."],
                  ["2", "Draft economy", "The community draft binds the creator wallet, token mint, and selected access method."],
                  ["3", "Reserve launch", "The launch transaction creates the collection asset and reserve addresses."],
                  ["4", "Vault NFTs", "Future mints lock tokens into reserve and expose proof before stake or redeem actions."]
                ].map(([step, heading, body]) => (
                  <div key={step} className="rounded-lg border border-vault-line bg-black/25 p-4">
                    <span className="flex size-8 items-center justify-center rounded-md border border-vault-green/35 bg-vault-green/10 text-sm font-black text-vault-green">{step}</span>
                    <p className="mt-4 font-black">{heading}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Access Gate">
              {!wallet.connected ? <p className="mb-4 rounded-md border border-vault-green/25 bg-vault-green/10 p-3 text-sm text-slate-300">Connect and authenticate a wallet before creation. The backend ties the access grant to that wallet.</p> : null}
              <div className="grid gap-2 md:grid-cols-4">
                {accessMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setAccessMethod(method.value)}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm transition",
                      accessMethod === method.value ? "border-vault-green bg-vault-green/12 text-white shadow-green" : "border-vault-line bg-black/25 text-slate-400 hover:border-vault-cyan/40"
                    )}
                  >
                    <span className="block font-black">{method.label}</span>
                    <span className="mt-1 block text-xs">{method.help}</span>
                  </button>
                ))}
              </div>
              {accessMethod === "CREATION_FEE_SOL" ? (
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase text-slate-500">Confirmed 1 SOL payment signature</span>
                  <input value={paymentSignature} onChange={(event) => setPaymentSignature(event.target.value)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm" placeholder="Transfer signature verified by backend" />
                </label>
              ) : (
                <p className="mt-4 rounded-md border border-vault-line bg-black/25 p-3 text-sm text-slate-400">{accessHelp}</p>
              )}
              <button onClick={createCommunity} disabled={activeAction === "create" || !tokenMint.trim()} className="phew-button phew-button-primary mt-5 inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-black text-black">
                <ActionIcon loading={activeAction === "create"} asset={brandAssets.tokenObject} />
                Create Draft
              </button>
              {collection ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={verifyPayment} disabled={activeAction === "payment" || !paymentSignature.trim()} className="inline-flex h-10 items-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">
                    <ActionIcon loading={activeAction === "payment"} asset={brandAssets.tokenObject} />
                    Verify Payment
                  </button>
                  <button onClick={verifyWhale} disabled={activeAction === "whale"} className="inline-flex h-10 items-center gap-2 rounded-md border border-vault-cyan/45 bg-vault-cyan/10 px-4 text-sm font-bold text-vault-cyan">
                    <ActionIcon loading={activeAction === "whale"} asset={brandAssets.proofRing} />
                    Verify Whale
                  </button>
                </div>
              ) : null}
              {accessResult?.access ? <p className="mt-3 rounded-md border border-vault-green/25 bg-vault-green/10 p-3 text-sm text-vault-green">{accessResult.access.method} {accessResult.access.status}</p> : null}
            </SectionCard>

            {collection ? (
              <SectionCard title="Launch Community">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Fact label="Collection" value={collection.name} />
                  <Fact label="Launch status" value={collection.launchStatus} />
                  <Fact label="Reserve PDA" value={collection.reserveVaultPda ?? reserve?.reserveVaultPda ?? "Pending"} />
                  <Fact label="Collection asset" value={collectionAsset ? short(collectionAsset) : "Pending build"} />
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase text-slate-500">External launch signature (optional)</span>
                  <input value={externalLaunchSignature} onChange={(event) => setExternalLaunchSignature(event.target.value)} className="phew-input mt-2 h-12 w-full rounded-md px-4 text-sm" placeholder="Use if the devnet transaction was signed elsewhere" />
                </label>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={buildLaunch} disabled={activeAction === "build" || !canLaunch} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">
                    <ActionIcon loading={activeAction === "build"} asset={brandAssets.energyBeam} />
                    Build Launch Tx
                  </button>
                  <button onClick={submitLaunch} disabled={activeAction === "submit" || !canSubmitLaunch} className="phew-button phew-button-primary inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-black text-black">
                    <ActionIcon loading={activeAction === "submit"} asset={brandAssets.vaultSafe} />
                    Sign + Submit Launch
                  </button>
                  <button onClick={refreshLaunchStatus} disabled={activeAction === "status"} className="inline-flex h-11 items-center gap-2 rounded-md border border-vault-line bg-black/25 px-4 text-sm font-bold text-slate-300">
                    <ActionIcon loading={activeAction === "status"} asset={brandAssets.proofRing} />
                    Refresh Status
                  </button>
                </div>
                {launchTx?.base64UnsignedTransaction ? <p className="mt-3 break-all rounded-md border border-vault-line bg-black/25 p-3 font-mono text-xs text-slate-400">Unsigned launch tx: {short(launchTx.base64UnsignedTransaction, 80)}</p> : null}
                {launchSubmit?.result?.txSignature ? (
                  <a href={`https://explorer.solana.com/tx/${launchSubmit.result.txSignature}?cluster=devnet`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-vault-green/45 bg-vault-green/10 px-4 text-sm font-bold text-vault-green">
                    View launch transaction <img src={brandAssets.energyBeam} alt="" className="size-5 object-contain" />
                  </a>
                ) : null}
              </SectionCard>
            ) : null}
          </main>

          <aside className="space-y-6">
            <SectionCard title="Current State">
              <div className="space-y-3">
                <StatusLine label="Token scan" ok={Boolean(scan)} />
                <StatusLine label="Access grant" ok={Boolean(community?.ok)} />
                <StatusLine label="Launch tx built" ok={Boolean(launchTx?.base64UnsignedTransaction || launchBuild?.idempotent)} />
                <StatusLine label="Launch status checked" ok={Boolean(launchStatus)} />
                <StatusLine label="Reserve verified" ok={Boolean(reserve?.lastOnChainVerifiedAt || launchSubmit?.verification?.passed)} />
              </div>
              {community?.message ? <p className="mt-4 rounded-md border border-vault-line bg-black/25 p-3 text-sm text-slate-300">{community.message}</p> : null}
              {launchStatus?.launch ? <p className="mt-4 rounded-md border border-vault-line bg-black/25 p-3 text-sm text-slate-300">Launch status: {launchStatus.launch.status ?? "N/A"}{launchStatus.launch.productionReady ? " - production ready" : ""}</p> : null}
            </SectionCard>

            <SectionCard title="Verified Reserve">
              {reserve ? (
                <div className="space-y-3">
                  <Fact label="Reserve PDA" value={reserve.reserveVaultPda ?? "N/A"} />
                  <Fact label="Token mint" value={short(reserve.tokenMint)} />
                  <Fact label="Available backing" value={`${reserve.availableBacking} ${reserve.tokenSymbol}`} />
                  <Fact label="Total locked" value={`${reserve.totalLocked} ${reserve.tokenSymbol}`} />
                  <Fact label="Status" value={reserve.status} />
                  <Fact label="On-chain verified" value={reserve.lastOnChainVerifiedAt ?? "N/A"} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Reserve proof appears after a community draft exists and after launch submit refreshes the collection reserve.</p>
              )}
            </SectionCard>

            {launchSubmit?.verification ? (
              <SectionCard title="Launch Verification">
                <div className="space-y-3">
                  <StatusLine label="Verification available" ok={Boolean(launchSubmit.verification.verificationAvailable)} />
                  <StatusLine label="Verification passed" ok={Boolean(launchSubmit.verification.passed)} />
                  <StatusLine label="Collection asset exists" ok={Boolean(launchSubmit.verification.collectionAssetExists)} />
                  <Fact label="Reserve balance" value={launchSubmit.verification.reserve?.balance ?? "N/A"} />
                </div>
                {launchSubmit.verification.issues?.length ? <p className="mt-4 text-sm text-vault-gold">{launchSubmit.verification.issues.join("; ")}</p> : null}
              </SectionCard>
            ) : null}
          </aside>
        </div>
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

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-vault-line py-3 text-sm last:border-0">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : "text-slate-500"}>
        <img src={ok ? brandAssets.rewardBurst : brandAssets.proofRing} alt="" className="inline size-4 object-contain align-[-2px]" /> {ok ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

function communityFlowState(error: string | null, activeAction: string | null, launchSubmit: LaunchResponse | null, launchStatus: LaunchStatusResponse | null): TransactionFlowState {
  if (error) return "error";
  if (launchSubmit?.result?.confirmed || launchStatus?.launch?.status === "CONFIRMED") return "success";
  if (activeAction === "submit") return "signing";
  if (activeAction) return "preparing";
  return "idle";
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
