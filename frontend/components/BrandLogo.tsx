import Image from "next/image";
import { brandAssets } from "@/lib/brand-assets";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src={brandAssets.logo} alt="Phew.run" width={compact ? 34 : 46} height={compact ? 34 : 46} className="h-auto w-auto drop-shadow-[0_0_16px_rgba(186,255,0,0.35)]" priority />
      {!compact ? (
        <div className="leading-none">
          <p className="text-sm font-black tracking-[0.18em] text-white">PHEW</p>
          <p className="mt-1 text-[11px] font-bold text-vault-green">phew.run</p>
        </div>
      ) : null}
    </div>
  );
}
