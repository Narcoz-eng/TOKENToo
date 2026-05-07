import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export function AssetImage({
  src,
  alt,
  className,
  fallback = brandAssets.emptyVault
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  return <img src={src || fallback} alt={alt} className={cn("object-cover", className)} />;
}
