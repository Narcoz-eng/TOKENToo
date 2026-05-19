"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { RaidPictogram } from "./RaidPictogram";

const missionTypes = [
  { id: "like", label: "Like" },
  { id: "repost", label: "Repost" },
  { id: "quote", label: "Quote" },
  { id: "comment", label: "Comment" },
  { id: "follow", label: "Follow" },
  { id: "bookmark", label: "Bookmark" },
  { id: "submit-proof", label: "Submit proof" }
] as const;

const proofModes = ["manual proof", "screenshot proof", "wallet/social linked proof", "API verification if configured"];

export function CreateRaidPanel({ endpointAvailable = false }: { endpointAvailable?: boolean }) {
  const [community, setCommunity] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedMissions, setSelectedMissions] = useState<string[]>(["like", "repost", "comment", "submit-proof"]);
  const [xpReward, setXpReward] = useState(120);
  const [rewardPool, setRewardPool] = useState("0");
  const [duration, setDuration] = useState(24);
  const [proofMode, setProofMode] = useState(proofModes[0]);
  const ready = useMemo(() => community.trim() && targetUrl.trim() && selectedMissions.length > 0 && endpointAvailable, [community, targetUrl, selectedMissions, endpointAvailable]);

  function toggleMission(id: string) {
    setSelectedMissions((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  return (
    <section id="create-raid" className="phew-panel rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Create Raid Room</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Creator/admin setup for clean mission coordination. Publish stays disabled until the backend create endpoint exists.</p>
        </div>
        <RaidPictogram name="room" className="size-8" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Community" value={community} onChange={setCommunity} placeholder="Choose community" />
        <Field label="X post URL" value={targetUrl} onChange={setTargetUrl} placeholder="https://x.com/..." />
        <Field label="XP budget" value={String(xpReward)} onChange={(value) => setXpReward(Number(value) || 0)} type="number" />
        <Field label="Reward pool" value={rewardPool} onChange={setRewardPool} placeholder="PHEW / SOL / NFT" />
        <Field label="Duration hours" value={String(duration)} onChange={(value) => setDuration(Number(value) || 0)} type="number" />
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-500">Proof mode</span>
          <select value={proofMode} onChange={(event) => setProofMode(event.target.value)} className="phew-input mt-2 h-10 w-full rounded-md px-3 text-sm">
            {proofModes.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-black uppercase text-slate-500">Mission types</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {missionTypes.map((mission) => {
            const selected = selectedMissions.includes(mission.id);
            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => toggleMission(mission.id)}
                className={cn("flex min-h-11 items-center gap-2 rounded-md border px-3 text-left text-xs font-black uppercase transition", selected ? "border-vault-green/60 bg-vault-green/12 text-vault-green shadow-green" : "border-vault-line bg-black/25 text-slate-400 hover:border-vault-cyan/40 hover:text-slate-200")}
              >
                <RaidPictogram name={mission.id} className="size-5" />
                {mission.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-vault-gold/35 bg-vault-gold/10 p-3 text-xs leading-5 text-vault-gold">
        Backend TODO: add `POST /raids` for raid creation, target URL persistence, mission proof mode, reward budget, and publish authorization.
      </div>

      <button
        type="button"
        disabled={!ready}
        className="phew-button phew-button-primary mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-black text-black disabled:opacity-45"
      >
        <RaidPictogram name="flag" className="size-5" />
        Publish Raid
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="phew-input mt-2 h-10 w-full rounded-md px-3 text-sm" />
    </label>
  );
}
