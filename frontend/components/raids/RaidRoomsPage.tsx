"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiError, apiCapabilities, apiWarnings, unwrapApiData } from "@/lib/api";
import { useApiResource } from "@/hooks/useApiResource";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { backendActionOutcome, type BackendActionResponse } from "@/lib/action-contracts";
import type { TxStatus } from "@/components/TransactionStatus";
import { brandAssets } from "@/lib/brand-assets";
import { computeRaidStats, mergeRaidDetail, missionsForRaid, normalizeRaidRooms, proofStateFor } from "./raid-data";
import { CreateRaidPanel } from "./CreateRaidPanel";
import { RaidCommandHero } from "./RaidCommandHero";
import { RaidDetailPanel } from "./RaidDetailPanel";
import { RaidLeaderboard } from "./RaidLeaderboard";
import { RaidRewardsPanel } from "./RaidRewardsPanel";
import { RaidRoomCard } from "./RaidRoomCard";
import { RaidSuccessMoment } from "./RaidSuccessMoment";
import { RaidPictogram } from "./RaidPictogram";
import type { RaidJoinState, RaidRoomView } from "./raid-types";

const idleJoin: RaidJoinState = { status: "idle", detail: null };

export function RaidRoomsPage() {
  const wallet = useWalletAuth();
  const raidState = useApiResource<unknown>("/product/raids");
  const raids = useMemo(() => normalizeRaidRooms(unwrapApiData<unknown>(raidState.data)), [raidState.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedBase = raids.find((raid) => raid.id === selectedId) ?? raids[0] ?? null;
  const canLoadDetail = Boolean(selectedBase && selectedBase.collectionId !== "N/A");
  const selectedDetailPath = canLoadDetail && selectedBase ? `/product/collections/${encodeURIComponent(selectedBase.collectionId)}/raids/${encodeURIComponent(selectedBase.id)}` : "";
  const detailState = useApiResource<unknown>(selectedDetailPath, { enabled: canLoadDetail });
  const selectedRaid = useMemo(() => mergeRaidDetail(selectedBase, unwrapApiData<unknown>(detailState.data)), [selectedBase, detailState.data]);
  const [joinStates, setJoinStates] = useState<Record<string, RaidJoinState>>({});
  const [openedTargets, setOpenedTargets] = useState<Record<string, boolean>>({});
  const [successRaid, setSuccessRaid] = useState<RaidRoomView | null>(null);
  const warnings = apiWarnings(raidState.data);
  const capabilities = apiCapabilities(raidState.data);
  const unavailable = Boolean(raidState.error);
  const apiVerificationAvailable = Boolean(capabilities?.raidApiVerificationAvailable);
  const stats = computeRaidStats(raids, unavailable);
  const selectedJoin = selectedRaid ? joinStates[selectedRaid.id] ?? idleJoin : idleJoin;
  const selectedOpened = selectedRaid ? Boolean(openedTargets[selectedRaid.id]) : false;
  const joinConfirmed = selectedJoin.status === "confirmed";
  const missions = missionsForRaid(selectedRaid, selectedOpened, joinConfirmed);
  const proofState = proofStateFor(selectedOpened, joinConfirmed);

  function scrollToCreate() {
    document.getElementById("create-raid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectLiveRaid() {
    const live = raids.find((raid) => raid.status === "Live");
    if (live) {
      setSelectedId(live.id);
      document.getElementById("live-raid-rooms")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function markTargetOpened(raid: RaidRoomView | null) {
    if (!raid) return;
    setOpenedTargets((current) => ({ ...current, [raid.id]: true }));
  }

  async function joinRaid(raid: RaidRoomView) {
    if (raid.status !== "Live") {
      setJoinStates((current) => ({ ...current, [raid.id]: { status: "failed", detail: "Only live raid rooms can be joined." } }));
      return;
    }
    if (!wallet.connected) {
      setJoinStates((current) => ({ ...current, [raid.id]: { status: "failed", detail: "Connect and authenticate your wallet before joining a raid." } }));
      return;
    }
    updateJoin(raid.id, "validating", null);
    try {
      updateJoin(raid.id, "pending", "Submitting join request to backend.");
      const response = await wallet.authFetch<BackendActionResponse>(`/raids/${raid.id}/join`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `${wallet.address}:join:${raid.id}` })
      });
      const outcome = backendActionOutcome(response, "Raid join route returned an intent but no completed participant status.");
      const nextStatus: TxStatus = outcome.phase === "confirmed" ? "confirmed" : outcome.phase === "failed" ? "failed" : "pending";
      updateJoin(raid.id, nextStatus, outcome.detail ?? null);
      if (outcome.confirmed) setSuccessRaid(raid);
    } catch (error) {
      updateJoin(raid.id, "failed", error instanceof Error ? error.message : "Join raid failed");
    }
  }

  function updateJoin(raidId: string, status: TxStatus, detail: string | null) {
    setJoinStates((current) => ({ ...current, [raidId]: { status, detail } }));
  }

  return (
    <AppShell active="raids">
      <div className="space-y-5">
        <RaidCommandHero stats={stats} unavailable={unavailable} onCreate={scrollToCreate} onJoinLive={selectLiveRaid} />

        {raidState.error ? <BackendNotice error={raidState.error} onRetry={raidState.reload} /> : null}
        {warnings.length ? <WarningNotice warnings={warnings} /> : null}

        <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(440px,0.9fr)]">
          <section id="live-raid-rooms" className="phew-panel rounded-lg p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase text-white">Live Raid Rooms</h2>
                <p className="mt-1 text-xs text-slate-500">Live data from `/product/raids`; unavailable fields stay N/A.</p>
              </div>
              <RaidPictogram name="room" className="size-8" />
            </div>

            {raidState.loading ? (
              <LoadingRows />
            ) : raids.length ? (
              <div className="space-y-3">
                {raids.map((raid) => (
                  <RaidRoomCard
                    key={raid.id}
                    raid={raid}
                    selected={(selectedRaid?.id ?? selectedBase?.id) === raid.id}
                    joinState={joinStates[raid.id] ?? idleJoin}
                    onSelect={() => setSelectedId(raid.id)}
                    onJoin={() => joinRaid(raid)}
                  />
                ))}
              </div>
            ) : (
              <NoRaidsEmpty onCreate={scrollToCreate} />
            )}
          </section>

          <div className="space-y-5">
            <RaidRewardsPanel raid={selectedRaid} />
            <RaidLeaderboard rows={selectedRaid?.leaderboard ?? []} />
          </div>
        </div>

        <RaidDetailPanel
          raid={selectedRaid}
          missions={missions}
          proofState={proofState}
          joinState={selectedJoin}
          apiVerificationAvailable={apiVerificationAvailable}
          onOpenTarget={() => markTargetOpened(selectedRaid)}
        />

        <CreateRaidPanel endpointAvailable={false} />

        <section className="phew-panel relative overflow-hidden rounded-lg border-vault-green/35 p-4">
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <img src={brandAssets.mascotPoses.running} alt="" className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_0_24px_rgba(186,255,0,0.42)]" />
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">Lead the movement. Earn rewards.</h2>
                <p className="mt-1 text-sm text-slate-400">Create a raid room, define proof rules, and keep every success state backend-confirmed.</p>
              </div>
            </div>
            <button type="button" onClick={scrollToCreate} className="phew-button phew-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black">
              <RaidPictogram name="flag" className="size-5" />
              Create Raid Room
            </button>
          </div>
        </section>
      </div>

      <RaidSuccessMoment open={Boolean(successRaid)} raidName={successRaid?.name ?? "Raid Room"} rewardLabel={successRaid?.rewardPool ? `Reward pool: ${successRaid.rewardPool}.` : undefined} onClose={() => setSuccessRaid(null)} />
    </AppShell>
  );
}

function BackendNotice({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <section className="rounded-lg border border-vault-red/45 bg-vault-red/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <RaidPictogram name="proof" className="size-8" />
          <div>
            <p className="font-black text-vault-red">Raid backend unavailable</p>
            <p className="text-sm text-slate-300">{error.message}</p>
          </div>
        </div>
        <button type="button" onClick={onRetry} className="rounded-md border border-vault-red/50 bg-black/30 px-4 py-2 text-sm font-black text-vault-red">Retry</button>
      </div>
    </section>
  );
}

function WarningNotice({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-lg border border-vault-gold/35 bg-vault-gold/10 p-3 text-sm text-vault-gold">
      {warnings.map((warning) => <p key={warning}>{warning}</p>)}
    </section>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg border border-vault-line bg-black/30" />
      ))}
    </div>
  );
}

function NoRaidsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-vault-green/35 bg-black/30 p-5">
      <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
        <div className="relative mx-auto size-28">
          <span className="absolute inset-x-2 bottom-2 h-4 rounded-full border border-vault-green/65 shadow-green" />
          <img src={brandAssets.mascotPoses.running} alt="" className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_24px_rgba(186,255,0,0.42)]" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">No live raids yet.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Raid rooms will appear here when the backend returns live or scheduled missions.</p>
          <button type="button" onClick={onCreate} className="phew-button phew-button-primary mt-4 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-black text-black">
            <RaidPictogram name="room" className="size-5" />
            Create Raid Room
          </button>
        </div>
      </div>
    </div>
  );
}
