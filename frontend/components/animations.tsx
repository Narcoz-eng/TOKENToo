"use client";

import { brandAssets } from "@/lib/brand-assets";

type AnimationProps = {
  active?: boolean;
  rarity?: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";
  label?: string;
};

export function ParticleBurst({ active = true, rarity = "Rare" }: AnimationProps) {
  const count = rarity === "Legendary" || rarity === "Mythic" ? 22 : rarity === "Epic" ? 16 : 10;
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-inherit">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="phew-particle" style={{ "--i": index, "--count": count } as React.CSSProperties} />
      ))}
    </div>
  );
}

export function AuraPulseOverlay({ active = true }: AnimationProps) {
  return active ? <div className="pointer-events-none absolute inset-0 rounded-inherit phew-aura-pulse" /> : null;
}

export function GlowTrail({ active = true }: AnimationProps) {
  return active ? <div className="pointer-events-none absolute inset-0 rounded-inherit phew-glow-trail" /> : null;
}

export function VaultLockAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="lock" label={props.label ?? "Stake"} />;
}

export function StakeAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="stake" label={props.label ?? "Stake"} />;
}

export function VaultUnlockAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="unlock" label={props.label ?? "Unstake"} />;
}

export function UnstakeAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="unlock" label={props.label ?? "Unstake"} />;
}

export function RewardBurstAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="reward" label={props.label ?? "Claim"} />;
}

export function ChestOpenAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="chest" label={props.label ?? "Chest"} />;
}

export function MintRevealAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="mint" label={props.label ?? "Mint"} />;
}

export function RedeemBurnAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="redeem" label={props.label ?? "Redeem"} />;
}

export function LegendaryRevealAnimation(props: AnimationProps) {
  return <MomentFrame {...props} mode="legendary" label={props.label ?? "Legendary"} />;
}

function MomentFrame({ active = true, rarity = "Rare", label, mode }: AnimationProps & { mode: string }) {
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-lg border border-vault-line bg-black/30 phew-moment phew-${mode}`} data-active={active}>
      <img src={brandAssets.motionCore} alt="" className="phew-motion-image absolute inset-0 h-full w-full object-cover opacity-28 mix-blend-screen" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-vault-panel/45 to-black/80" />
      <div className="absolute inset-6 rounded-lg border border-vault-cyan/35 bg-vault-panel/60 shadow-glow" />
      <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-vault-green/60 bg-vault-green/10 phew-card-core" />
      <AuraPulseOverlay active={active} />
      <GlowTrail active={active} />
      <ParticleBurst active={active} rarity={rarity} />
      <div className="absolute bottom-4 left-4 rounded-md border border-vault-line bg-black/45 px-3 py-1 text-xs font-bold uppercase text-vault-green">{label}</div>
    </div>
  );
}
