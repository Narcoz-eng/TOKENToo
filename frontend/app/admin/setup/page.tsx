"use client";

import { CheckCircle2, CircleAlert, Database, Image as ImageIcon, KeyRound, Layers3, RadioTower, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ErrorState, LoadingState, SetupWarning } from "@/components/ApiState";
import { TransactionFlow } from "@/components/TransactionFlow";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { useApiResource } from "@/hooks/useApiResource";
import { cn } from "@/lib/utils";

type SetupMode = {
  id: string;
  label: string;
  ready: boolean;
  output: string;
  missing: string[];
  blockedBy: string[];
};

type SetupChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  requiredFor?: string[];
  fix?: string;
};

type CapabilitiesResponse = {
  ok?: boolean;
  mode?: string;
  cluster?: string;
  rpcUrl?: string;
  setupModes?: SetupMode[];
  setupChecklist?: {
    storageProvider?: string;
    creativePreviewReady?: boolean;
    devnetLaunchReady?: boolean;
    productionLaunchReady?: boolean;
    items?: SetupChecklistItem[];
  };
  publicReadiness?: {
    professionalPreviewReady?: boolean;
    launchAvailable?: boolean;
    mintingAvailable?: boolean;
    creatorSetupRequired?: boolean;
    messages?: string[];
  };
  capabilities?: Record<string, boolean>;
  warnings?: string[];
};

type ImageProvidersResponse = {
  ok?: boolean;
  active?: ImageProviderStatus;
  providers?: ImageProviderStatus[];
};

type ImageProviderStatus = {
  provider: string;
  authPresent?: boolean;
  selectedModel?: string;
  supportedModels?: string[];
  unsupportedModels?: string[];
  disabledModels?: string[];
  quotaStatus?: string;
  lastProbeResult?: string;
  lastErrorCode?: string;
  canGenerateStudioBible?: boolean;
};

const capabilityRows = [
  { key: "databaseAvailable", label: "Database", icon: Database },
  { key: "heliusAvailable", label: "Helius token scan", icon: RadioTower },
  { key: "solanaTransactionProviderDevnet", label: "Devnet transactions", icon: ShieldCheck },
  { key: "permanentStorageConfigured", label: "Permanent storage", icon: KeyRound },
  { key: "approvedLayerPackAvailable", label: "Layer pack", icon: Layers3 },
  { key: "tokenMetadataAvailable", label: "Token metadata", icon: ImageIcon }
];

export default function AdminSetupPage() {
  const capabilities = useApiResource<CapabilitiesResponse>("/system/capabilities");
  const imageProviders = useApiResource<ImageProvidersResponse>("/system/image-providers");
  const data = capabilities.data;
  const providers = imageProviders.data?.providers ?? [];
  const readyCount = data?.setupChecklist?.items?.filter((item) => item.ok).length ?? 0;
  const totalCount = data?.setupChecklist?.items?.length ?? 0;
  const productionBlockers = productionBlockerRows(data);

  return (
    <AppShell active="setup">
      <div className="space-y-6">
        <section className="phew-panel phew-hero-canvas relative overflow-hidden rounded-lg p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(186,255,0,0.2),transparent_30%),linear-gradient(120deg,#020806_0%,#06110f_62%,#020806_100%)]" />
          <div className="absolute inset-0 grid-mask opacity-30" />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusPill accent="green">Admin Setup</StatusPill>
                <StatusPill accent="cyan">{data?.cluster ?? "N/A"}</StatusPill>
                <StatusPill accent={data?.publicReadiness?.launchAvailable ? "green" : "gold"}>{data?.publicReadiness?.launchAvailable ? "Launch available" : "Launch gated"}</StatusPill>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Backend readiness, provider gates, and Studio generation controls.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300">
                This dashboard only reads system routes. It does not trigger image generation, retries, or paid provider calls on render.
              </p>
            </div>
            <TransactionFlow
              state={data?.publicReadiness?.professionalPreviewReady ? "success" : "idle"}
              moment="studio"
              title="Setup readiness"
              description="Read-only system status. No image generation, retries, or paid provider calls are triggered."
              tokenSymbol="SETUP"
              detail={data?.warnings?.[0] ?? null}
              compact
            />
          </div>
        </section>

        {capabilities.loading ? <LoadingState /> : null}
        {capabilities.error ? <ErrorState error={capabilities.error} retry={capabilities.reload} /> : null}

        {!capabilities.loading && !capabilities.error && data ? (
          <>
            <SetupWarning warnings={data.warnings} />

            <div className="grid gap-4 md:grid-cols-4">
              <SetupStat label="Mode" value={data.mode ?? "N/A"} />
              <SetupStat label="RPC" value={data.rpcUrl ?? "N/A"} />
              <SetupStat label="Storage" value={data.setupChecklist?.storageProvider ?? "N/A"} />
              <SetupStat label="Checklist" value={totalCount ? `${readyCount}/${totalCount}` : "N/A"} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
              <main className="space-y-6">
                <SectionCard title="Provider Status">
                  <div className="grid gap-3 md:grid-cols-3">
                    <SetupReadiness label="Active image provider" ok={Boolean(imageProviders.data?.active?.provider)} value={imageProviders.data?.active?.provider ?? "N/A"} />
                    <SetupReadiness label="Provider auth" ok={Boolean(imageProviders.data?.active?.authPresent)} value={imageProviders.data?.active?.authPresent ? "Present" : "N/A"} />
                    <SetupReadiness label="Studio Bible generation" ok={Boolean(imageProviders.data?.active?.canGenerateStudioBible)} value={imageProviders.data?.active?.canGenerateStudioBible ? "Available" : "Gated"} />
                  </div>
                </SectionCard>

                <SectionCard title="Setup Modes">
                  <div className="grid gap-3 md:grid-cols-3">
                    {(data.setupModes ?? []).map((mode) => (
                      <div key={mode.id} className={cn("rounded-lg border p-4", mode.ready ? "border-vault-green/45 bg-vault-green/10" : "border-vault-line bg-black/25")}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{mode.label}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-400">{mode.output}</p>
                          </div>
                          {mode.ready ? <CheckCircle2 className="size-5 text-vault-green" /> : <CircleAlert className="size-5 text-vault-gold" />}
                        </div>
                        <p className="mt-4 text-xs font-black uppercase text-slate-500">Missing</p>
                        <p className="mt-1 text-sm text-slate-300">{mode.missing.length ? mode.missing.join(", ") : "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Checklist">
                  <div className="grid gap-3">
                    {(data.setupChecklist?.items ?? []).map((item) => (
                      <div key={item.key} className="rounded-lg border border-vault-line bg-black/25 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{item.label}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.requiredFor?.join(" / ") || "N/A"}</p>
                          </div>
                          <StatusPill accent={item.ok ? "green" : "gold"}>{item.ok ? "Ready" : "Required"}</StatusPill>
                        </div>
                        {item.fix ? <p className="mt-3 text-sm leading-6 text-slate-400">{item.fix}</p> : null}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </main>

              <aside className="space-y-6">
                <SectionCard title="Staking Readiness">
                  <div className="grid gap-2">
                    <ReadinessLine label="Devnet transaction provider" ok={Boolean(data.capabilities?.solanaTransactionProviderDevnet)} />
                    <ReadinessLine label="Program configured" ok={Boolean(data.capabilities?.devnetProgramConfigured)} />
                    <ReadinessLine label="Program executable" ok={Boolean(data.capabilities?.programAccountExecutable)} />
                    <ReadinessLine label="Minting available" ok={Boolean(data.publicReadiness?.mintingAvailable)} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Production staking remains gated by backend policy until live custody and VaultPosition verification are enabled.</p>
                </SectionCard>

                <SectionCard title="Storage Readiness">
                  <div className="grid gap-2">
                    <ReadinessLine label="Permanent storage" ok={Boolean(data.capabilities?.permanentStorageConfigured)} />
                    <ReadinessLine label="Production storage" ok={Boolean(data.capabilities?.productionStorageAvailable)} />
                    <ReadinessLine label="Approved layer pack" ok={Boolean(data.capabilities?.approvedLayerPackAvailable)} />
                    <ReadinessLine label="Token metadata writes" ok={Boolean(data.capabilities?.tokenMetadataAvailable)} />
                  </div>
                </SectionCard>

                <SectionCard title="Production Blockers">
                  {productionBlockers.length ? (
                    <div className="grid gap-3">
                      {productionBlockers.map((blocker) => (
                        <div key={blocker} className="rounded-md border border-vault-gold/35 bg-vault-gold/10 p-3 text-sm text-vault-gold">{blocker}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-vault-green/35 bg-vault-green/10 p-3 text-sm text-vault-green">No production blockers reported by the current system route.</p>
                  )}
                </SectionCard>

                <SectionCard title="Core Capabilities">
                  <div className="grid gap-2">
                    {capabilityRows.map((row) => {
                      const Icon = row.icon;
                      const ok = Boolean(data.capabilities?.[row.key]);
                      return (
                        <div key={row.key} className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
                          <span className="inline-flex items-center gap-2 text-slate-300"><Icon className="size-4 text-vault-green" /> {row.label}</span>
                          <span className={ok ? "text-vault-green" : "text-vault-gold"}>{ok ? "Ready" : "N/A"}</span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard title="Image Providers">
                  {imageProviders.loading ? <div className="text-sm text-slate-400">Loading provider status...</div> : null}
                  {imageProviders.error ? (
                    <div className="rounded-md border border-vault-red/35 bg-vault-red/10 p-3 text-sm text-vault-red">
                      {imageProviders.error.message}
                      <button type="button" onClick={imageProviders.reload} className="mt-3 block rounded-md border border-vault-red/40 px-3 py-1 text-xs font-black">Retry</button>
                    </div>
                  ) : null}
                  {!imageProviders.loading && !imageProviders.error ? (
                    providers.length ? (
                      <div className="space-y-3">
                        {providers.map((provider) => (
                          <div key={provider.provider} className="rounded-lg border border-vault-line bg-black/25 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-black">{provider.provider}</p>
                              <StatusPill accent={provider.canGenerateStudioBible ? "green" : "gold"}>{provider.canGenerateStudioBible ? "Available" : "Gated"}</StatusPill>
                            </div>
                            <div className="mt-3 space-y-2 text-sm text-slate-400">
                              <ProviderRow label="Auth" value={provider.authPresent ? "Present" : "N/A"} />
                              <ProviderRow label="Model" value={provider.selectedModel ?? "N/A"} />
                              <ProviderRow label="Quota" value={provider.quotaStatus ?? "N/A"} />
                              <ProviderRow label="Probe" value={provider.lastProbeResult ?? provider.lastErrorCode ?? "N/A"} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">N/A</p>
                    )
                  ) : null}
                </SectionCard>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function SetupStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="phew-panel relative rounded-lg p-4">
      <p className="relative text-xs uppercase text-slate-500">{label}</p>
      <p className="relative mt-2 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function SetupReadiness({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className={cn("rounded-lg border p-4", ok ? "border-vault-green/35 bg-vault-green/10" : "border-vault-line bg-black/25")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase text-slate-500">{label}</p>
          <p className="mt-2 break-words text-sm font-black text-white">{value}</p>
        </div>
        {ok ? <CheckCircle2 className="size-5 shrink-0 text-vault-green" /> : <CircleAlert className="size-5 shrink-0 text-vault-gold" />}
      </div>
    </div>
  );
}

function ReadinessLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-vault-line bg-black/25 p-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-vault-green" : "text-vault-gold"}>{ok ? "Ready" : "N/A"}</span>
    </div>
  );
}

function ProviderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-vault-line py-2 last:border-0">
      <span>{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function productionBlockerRows(data?: CapabilitiesResponse | null) {
  const blockers = new Set<string>();
  for (const warning of data?.warnings ?? []) blockers.add(warning);
  for (const mode of data?.setupModes ?? []) {
    if (!mode.ready) {
      for (const blocker of mode.blockedBy) blockers.add(`${mode.label}: ${blocker}`);
    }
  }
  for (const item of data?.setupChecklist?.items ?? []) {
    const productionRequired = item.requiredFor?.some((value) => /production|launch|mint/i.test(value)) ?? false;
    if (!item.ok && productionRequired) blockers.add(item.fix ? `${item.label}: ${item.fix}` : item.label);
  }
  return [...blockers];
}
