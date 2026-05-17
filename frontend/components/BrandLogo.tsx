import Image from "next/image";
import { brandAssets } from "@/lib/brand-assets";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center overflow-visible rounded-md border border-vault-green/20 bg-black/35 shadow-[0_0_22px_rgba(186,255,0,0.12)]">
        <Image
          src={brandAssets.mascot}
          alt=""
          width={compact ? 38 : 52}
          height={compact ? 37 : 50}
          className="h-auto w-auto scale-125 object-contain drop-shadow-[0_0_16px_rgba(186,255,0,0.35)]"
          priority
        />
      </span>
      {!compact ? (
        <div className="min-w-0 leading-none">
          <p className="truncate text-[17px] font-black lowercase text-white">phew run</p>
          <p className="mt-1 truncate text-[10px] font-black uppercase text-vault-green">Token-backed NFT protocol</p>
        </div>
      ) : null}
    </div>
  );
}
