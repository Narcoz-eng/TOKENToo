"use client";

import type { RaidJoinState, RaidMissionView, RaidProofState, RaidRoomView } from "./raid-types";
import { PlatformPictogram, RaidPictogram } from "./RaidPictogram";
import { RaidMissionChecklist } from "./RaidMissionChecklist";
import { RaidProofPanel } from "./RaidProofPanel";

export function RaidDetailPanel({
  raid,
  missions,
  proofState,
  joinState,
  apiVerificationAvailable,
  onOpenTarget
}: {
  raid: RaidRoomView | null;
  missions: RaidMissionView[];
  proofState: RaidProofState;
  joinState: RaidJoinState;
  apiVerificationAvailable: boolean;
  onOpenTarget: () => void;
}) {
  const progress = raid ? progressFromMissions(missions) : 0;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
      <div className="space-y-4">
        <section className="phew-panel rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase text-white">Raid Detail Panel</h2>
            <span className="rounded border border-vault-green/45 bg-vault-green/10 px-2 py-1 text-xs font-black uppercase text-vault-green">{raid?.status ?? "N/A"}</span>
          </div>
          <div className="rounded-lg border border-vault-line bg-black/30 p-4">
            {raid ? (
              <div className="grid gap-4 md:grid-cols-[72px_minmax(0,1fr)]">
                <div className="grid size-16 place-items-center rounded-full border border-vault-green/40 bg-vault-green/10">
                  <PlatformPictogram platform={raid.platform} className="size-9" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-vault-green">Target post/link preview</p>
                  <h3 className="mt-1 text-lg font-black text-white">{raid.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{raid.collectionName} mission room led by {raid.boss}.</p>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-vault-line bg-black/30 p-2 text-xs">
                    <RaidPictogram name="target" className="size-4" />
                    {raid.targetLink ? (
                      <a href={raid.targetLink} target="_blank" rel="noreferrer" onClick={onOpenTarget} className="min-w-0 break-all font-semibold text-vault-cyan hover:text-white">
                        {raid.targetLink}
                      </a>
                    ) : (
                      <span className="text-slate-500">Target link N/A</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center text-center">
                <div>
                  <RaidPictogram name="room" className="mx-auto size-12 opacity-80" />
                  <p className="mt-3 font-black text-white">No raid selected</p>
                  <p className="mt-1 text-sm text-slate-500">Select a live room to inspect target, proof, XP, and rewards.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <RaidMissionChecklist missions={missions} progress={progress} targetAvailable={Boolean(raid?.targetLink)} onOpenTarget={onOpenTarget} />
        <RaidProofPanel raid={raid} currentState={proofState} apiVerificationAvailable={apiVerificationAvailable} />
      </div>

      <div className="space-y-4">
        <section className="phew-panel rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase text-white">Raid Info</h2>
            <RaidPictogram name="flag" className="size-6" />
          </div>
          <InfoRow label="Host" value={raid?.collectionName ?? "N/A"} />
          <InfoRow label="Platform" value={raid?.platform ?? "N/A"} />
          <InfoRow label="Type" value={raid ? "Community mission" : "N/A"} />
          <InfoRow label="Participants" value={raid?.participants !== null && raid?.participants !== undefined ? raid.participants.toLocaleString() : "N/A"} />
          <InfoRow label="Reward pool" value={raid?.rewardPool ?? "N/A"} />
          <InfoRow label={raid?.status === "Scheduled" ? "Starts" : "Ends"} value={raid?.timeLabel ?? "N/A"} />
        </section>

        <section className="phew-panel rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase text-white">Your Status</h2>
            <RaidPictogram name="xp" className="size-6" />
          </div>
          <InfoRow label="Join status" value={joinState.status === "idle" ? "Not joined" : joinState.status} />
          <InfoRow label="Proof status" value={proofState.replace(/-/g, " ")} />
          <InfoRow label="XP earned" value={proofState === "approved" ? "Backend approved" : "N/A"} />
          <InfoRow label="Reward eligibility" value={proofState === "approved" ? "Eligible" : "Pending proof review"} />
          {joinState.detail ? <p className="mt-3 rounded-md border border-vault-line bg-black/25 p-3 text-xs leading-5 text-slate-400">{joinState.detail}</p> : null}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-vault-line py-2.5 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-black text-white">{value}</span>
    </div>
  );
}

function progressFromMissions(missions: RaidMissionView[]) {
  if (!missions.length) return 0;
  const complete = missions.filter((mission) => mission.status === "approved" || mission.status === "submitted" || mission.status === "opened-target").length;
  return Math.round((complete / missions.length) * 100);
}
