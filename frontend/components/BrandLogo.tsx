import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function PhewLogoMark({ className, boxed = false }: { className?: string; boxed?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden",
        boxed && "size-11 rounded-md border border-vault-green/25 bg-black/40 shadow-[0_0_22px_rgba(186,255,0,0.14)]",
        className
      )}
    >
      <img
        src={brandAssets.logoMark}
        alt=""
        className="h-full max-h-10 w-auto object-contain drop-shadow-[0_0_16px_rgba(186,255,0,0.35)]"
      />
    </span>
  );
}

export function PhewWordmark({ className }: { className?: string }) {
  return <img src={brandAssets.wordmark} alt="Phew.run" className={cn("block h-auto max-h-9 w-auto object-contain", className)} />;
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PhewLogoMark boxed />
      {!compact ? (
        <div className="min-w-0 leading-none">
          <p className="truncate text-[17px] font-black text-white">Phew.run</p>
          <p className="mt-1 truncate text-[10px] font-black uppercase text-vault-green">Token-backed NFT protocol</p>
        </div>
      ) : null}
    </div>
  );
}
